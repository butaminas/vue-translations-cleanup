import { glob } from 'glob'
import type { ToolConfig } from '../config/types'
import { createAIClient } from '../ai/client'
import { detectI18nPatterns } from './i18nPatternDetector'
import { detectRawStrings } from './rawStringDetector'
import { generateKeys } from './keyGenerator'
import { replaceStringsInJsFile, replaceStringsInVueFile, updateTranslationFile } from './codeReplacer'
import { autoTranslate } from './autoTranslate'
import type { ExtractResult, RawStringLocation } from './types'

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

  // Step 1: Detect existing i18n patterns
  if (verbose) {
    console.log('\n[1/5] Detecting i18n usage patterns...')
  }

  const i18nResult = await detectI18nPatterns(
    srcPath,
    filePattern,
    extractConfig.i18nPatterns,
  )

  if (verbose) {
    console.log(`  Found ${i18nResult.patterns.length} i18n patterns`)
    if (i18nResult.recommendedPattern) {
      console.log(`  Recommended pattern: ${i18nResult.recommendedPattern.pattern}`)
      console.log(`  Function name: ${i18nResult.recommendedPattern.functionName}`)
    }
  }

  // Validate that we found at least one i18n pattern
  if (i18nResult.patterns.length === 0) {
    console.error('\n❌ Error: No i18n usage patterns found in your codebase.')
    console.error('\nThe extraction tool needs to detect at least one existing i18n reference')
    console.error('to understand how your project uses i18n.')
    console.error('\nPlease add at least one i18n reference to your code:')
    console.error('\nFor Vue 3 with Composition API:')
    console.error('  <script setup>')
    console.error('  const { t } = useI18n()')
    console.error('  const greeting = t(\'hello\')')
    console.error('  </script>')
    console.error('\nFor Vue 3 Options API / Nuxt:')
    console.error('  <template>')
    console.error('    <div>{{ $t(\'hello\') }}</div>')
    console.error('  </template>')
    console.error('\nFor custom patterns, you can define them in your config file:')
    console.error('  extract: {')
    console.error('    i18nPatterns: [')
    console.error('      {')
    console.error('        functionName: \'t\',')
    console.error('        importStatement: \'const { t } = useCustomI18n()\',')
    console.error('      }')
    console.error('    ]')
    console.error('  }')
    console.error('\nAfter adding a reference, run the extraction tool again.')

    return {
      rawStrings: [],
      generatedKeys: new Map(),
      filesModified: [],
      totalExtracted: 0,
      duplicates: [],
    }
  }

  // Step 2: Find source files
  if (verbose) {
    const totalSteps = (config.ai?.languages?.length) ? 6 : 5
    console.log(`\n[2/${totalSteps}] Scanning for source files...`)
  }

  const files = await glob(filePattern, {
    cwd: srcPath,
    absolute: true,
    nodir: true,
    ignore: extractConfig.excludePatterns,
  })

  if (verbose) {
    console.log(`  Found ${files.length} files to scan`)
  }

  // Step 3: Detect raw strings
  if (verbose) {
    const totalSteps = (config.ai?.languages?.length) ? 6 : 5
    console.log(`\n[3/${totalSteps}] Detecting raw translatable strings...`)
  }

  const rawStrings = await detectRawStrings(files, extractConfig)

  if (verbose) {
    console.log(`  Detected ${rawStrings.length} translatable strings`)
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
  if (verbose) {
    const totalSteps = (config.ai?.languages?.length) ? 6 : 5
    console.log(`\n[4/${totalSteps}] Generating translation keys...`)
  }

  let keyMap: Map<string, string>

  // Check if AI is enabled
  const aiClient = config.ai?.enabled ? createAIClient(config.ai) : null

  if (aiClient && verbose) {
    console.log('  AI-powered key generation enabled')
  }

  // For now, use heuristic generation (AI integration would go here)
  keyMap = generateKeys(rawStrings, extractConfig)

  if (verbose) {
    console.log(`  Generated ${keyMap.size} unique keys`)
  }

  // Step 5: Replace strings and update translations
  if (verbose) {
    const totalSteps = (config.ai?.languages?.length) ? 6 : 5
    console.log(`\n[5/${totalSteps}] Replacing strings in files...`)
  }

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
      const createBackup = config.cleanup?.backup !== false

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
      config.cleanup?.backup !== false,
    )

    if (verbose) {
      console.log(`\nUpdated translation file: ${translationFile}`)
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
            backup: config.cleanup?.backup !== false,
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

  if (verbose) {
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
