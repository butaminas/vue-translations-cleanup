import { glob } from 'glob'
import type { ToolConfig } from '../config/types'
import { createAIClient } from '../ai/client'
import { detectI18nPatterns } from './i18nPatternDetector'
import { detectRawStrings } from './rawStringDetector'
import { generateKeys } from './keyGenerator'
import { replaceStringsInJsFile, replaceStringsInVueFile, updateTranslationFile } from './codeReplacer'
import { autoTranslate } from './autoTranslate'
import type { ExtractResult, RawStringLocation, I18nDetectionResult } from './types'

export interface ExtractOptions {
  translationFile: string
  srcPath: string
  config: ToolConfig
  dryRun?: boolean
  interactive?: boolean
  verbose?: boolean
}

export interface ExtractStats {
  filesScanned: number
  filesModified: number
  stringsExtracted: number
  keysGenerated: number
  importsAdded: number
  aiUsed: boolean
  duration: number
}

/**
 * Run the complete extraction pipeline
 */
export async function runExtraction(options: ExtractOptions): Promise<ExtractResult> {
  const startTime = Date.now()
  const {
    translationFile,
    srcPath,
    config,
    dryRun = false,
    verbose = false,
  } = options

  const extractConfig = config.extract || {}
  const filePattern = config.cleanup?.pattern || '**/*.{vue,js,ts,tsx,jsx}'

  if (verbose) {
    console.log('Starting extraction process...')
    console.log(`Source path: ${srcPath}`)
    console.log(`Translation file: ${translationFile}`)
    console.log(`File pattern: ${filePattern}`)
  }

  // Step 1: Determine i18n patterns
  console.log('\n[1/5] Detecting i18n usage patterns...')

  let i18nResult: I18nDetectionResult

  // Priority 1: Use custom patterns from config if provided
  if (extractConfig.i18nPatterns && extractConfig.i18nPatterns.length > 0) {
    i18nResult = {
      patterns: extractConfig.i18nPatterns.map(p => ({
        pattern: p.importTemplate,
        functionName: p.functionName,
        example: p.importTemplate,
        file: 'from config',
        count: 1,
        type: 'custom' as const,
        importStatement: p.importStatement,
      })),
      recommendedPattern: {
        pattern: extractConfig.i18nPatterns[0].importTemplate,
        functionName: extractConfig.i18nPatterns[0].functionName,
        example: extractConfig.i18nPatterns[0].importTemplate,
        file: 'from config',
        count: 1,
        type: 'custom' as const,
        importStatement: extractConfig.i18nPatterns[0].importStatement,
      },
      functionNames: new Set(extractConfig.i18nPatterns.map(p => p.functionName)),
      filesScanned: 0,
      filesWithI18n: 0,
    }
    if (verbose) {
      console.log(`  Using custom patterns from config`)
    }
  }
  else {
    // Priority 2: Auto-detect patterns (for when running without config)
    // First try to detect from project config (nuxt/vite)
    const { detectConfig } = await import('../cli-detection')
    const detectedConfig = await detectConfig(process.cwd())

    i18nResult = await detectI18nPatterns(
      srcPath,
      filePattern,
      extractConfig.i18nPatterns || [],
      detectedConfig,
    )

    // If no patterns detected, use default $t (standard for @nuxtjs/i18n and vue-i18n)
    if (i18nResult.patterns.length === 0) {
      if (verbose) {
        console.log(`  No patterns detected, using default global $t`)
      }
      i18nResult = {
        patterns: [{
          pattern: '$t(...)',
          functionName: '$t',
          example: '$t(\'key\')',
          file: 'default (global $t)',
          count: 1,
          type: 'global' as const,
          importStatement: undefined,
        }],
        recommendedPattern: {
          pattern: '$t(...)',
          functionName: '$t',
          example: '$t(\'key\')',
          file: 'default (global $t)',
          count: 1,
          type: 'global' as const,
          importStatement: undefined,
        },
        functionNames: new Set(['$t']),
        filesScanned: 0,
        filesWithI18n: 0,
      }
    }
  }

  if (!verbose && i18nResult.recommendedPattern) {
    console.log(`  ✓ Found i18n pattern: ${i18nResult.recommendedPattern.functionName}`)
  }

  // Step 2: Find source files
  const totalSteps = (config.ai?.languages?.length) ? 6 : 5
  console.log(`\n[2/${totalSteps}] Scanning for source files...`)

  const files = await glob(filePattern, {
    cwd: srcPath,
    absolute: true,
    nodir: true,
    ignore: extractConfig.excludePatterns,
  })

  if (verbose) {
    console.log(`  Found ${files.length} files to scan`)
  }
  else {
    console.log(`  ✓ Found ${files.length} files`)
  }

  // Step 3: Detect raw strings
  console.log(`\n[3/${totalSteps}] Detecting raw translatable strings...`)

  const rawStrings = await detectRawStrings(files, extractConfig)

  if (verbose) {
    console.log(`  Detected ${rawStrings.length} translatable strings`)
  }
  else {
    console.log(`  ✓ Detected ${rawStrings.length} strings`)
  }

  if (rawStrings.length === 0) {
    console.log('\nNo translatable strings found!')
    return {
      rawStrings: [],
      generatedKeys: new Map(),
      filesModified: [],
      totalExtracted: 0,
      duplicates: [],
    }
  }

  // Step 4: Generate translation keys
  console.log(`\n[4/${totalSteps}] Generating translation keys...`)

  let keyMap: Map<string, string>

  // Check if AI is enabled
  const aiClient = config.ai?.enabled ? createAIClient(config.ai) : null

  if (aiClient) {
    if (verbose) {
      console.log('  AI-powered key generation enabled')
    }
    else {
      console.log('  Using AI-powered key generation')
    }
  }

  // For now, use heuristic generation (AI integration would go here)
  keyMap = generateKeys(rawStrings, extractConfig)

  if (verbose) {
    console.log(`  Generated ${keyMap.size} unique keys`)
  }
  else {
    console.log(`  ✓ Generated ${keyMap.size} unique keys`)
  }

  // Step 5: Replace strings and update translations
  console.log(`\n[5/${totalSteps}] Replacing strings in files...`)

  const filesModified: string[] = []
  let importsAdded = 0

  if (!dryRun) {
    // Group locations by file
    const locationsByFile = new Map<string, RawStringLocation[]>()

    for (const location of rawStrings) {
      if (!locationsByFile.has(location.file)) {
        locationsByFile.set(location.file, [])
      }
      locationsByFile.get(location.file)!.push(location)
    }

    // Replace strings in each file
    for (const [file, locations] of locationsByFile) {
      const createBackup = config.backup !== false

      try {
        const result = file.endsWith('.vue')
          ? replaceStringsInVueFile(file, locations, keyMap, i18nResult, createBackup)
          : replaceStringsInJsFile(file, locations, keyMap, i18nResult, createBackup)

        if (result.replacements > 0) {
          filesModified.push(file)

          if (result.importAdded) {
            importsAdded++
          }

          if (verbose) {
            console.log(`  ${file}: ${result.replacements} replacements${result.importAdded ? ' (import added)' : ''}`)
          }
        }
      }
      catch (error) {
        console.error(`  Error processing ${file}:`, error)
      }
    }

    // Update translation file
    updateTranslationFile(
      translationFile,
      keyMap,
      extractConfig.targetLanguage || 'en',
      config.backup !== false,
    )

    if (verbose) {
      console.log(`\nUpdated translation file: ${translationFile}`)
    }
    else {
      console.log(`  ✓ Modified ${filesModified.length} files, ${importsAdded} imports added`)
    }

    // Step 6: Auto-translate to other languages (if languages configured)
    if (config.ai?.languages && config.ai.languages.length > 0) {
      const aiClientForTranslation = aiClient || createAIClient(config.ai || {})

      if (aiClientForTranslation) {
        if (verbose) {
          console.log(`\n[6/6] Auto-translating to ${config.ai.languages.length} languages...`)
        }

        try {
          const autoTranslateResult = await autoTranslate({
            sourceFile: translationFile,
            targetLanguages: config.ai.languages,
            aiClient: aiClientForTranslation,
            sourceLanguage: extractConfig.targetLanguage || 'en',
            newKeys: keyMap,
            excludePatterns: config.ai.excludeFromTranslation,
            backup: config.backup !== false,
            verbose,
          })

          if (verbose) {
            console.log(`\nAuto-translation summary:`)
            console.log(`  Languages processed: ${autoTranslateResult.translatedLanguages.join(', ')}`)
            for (const [lang, count] of Object.entries(autoTranslateResult.translationsPerLanguage)) {
              console.log(`    ${lang}: ${count} keys translated`)
            }
            if (autoTranslateResult.errors.length > 0) {
              console.log(`  Errors: ${autoTranslateResult.errors.length}`)
              for (const { language, error } of autoTranslateResult.errors) {
                console.error(`    ${language}: ${error}`)
              }
            }
          }
        }
        catch (error) {
          console.error(`Auto-translation failed: ${(error as Error).message}`)
        }
      }
      else {
        console.warn('Languages configured but AI is not enabled')
      }
    }
  }
  else {
    if (verbose) {
      console.log('  Dry run mode - no files modified')
    }
  }

  // Calculate statistics
  const duration = Date.now() - startTime

  console.log(`\n=== Extraction Complete ===`)
  console.log(`Files scanned: ${files.length}`)
  console.log(`Strings extracted: ${rawStrings.length}`)
  console.log(`Unique keys: ${keyMap.size}`)
  console.log(`Files modified: ${filesModified.length}`)
  console.log(`Imports added: ${importsAdded}`)
  console.log(`Duration: ${(duration / 1000).toFixed(2)}s`)

  if (dryRun) {
    console.log('\n(Dry run - no actual changes made)')
  }

  // Find duplicates (same text appears multiple times)
  const duplicateMap = new Map<string, RawStringLocation[]>()

  for (const location of rawStrings) {
    if (!duplicateMap.has(location.text)) {
      duplicateMap.set(location.text, [])
    }
    duplicateMap.get(location.text)!.push(location)
  }

  const duplicates = Array.from(duplicateMap.entries())
    .filter(([_, locations]) => locations.length > 1)
    .map(([text, locations]) => ({
      text,
      key: keyMap.get(text) || '',
      locations,
    }))

  return {
    rawStrings,
    generatedKeys: keyMap,
    filesModified,
    totalExtracted: rawStrings.length,
    duplicates,
  }
}
