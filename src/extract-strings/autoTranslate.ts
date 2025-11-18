import fs from 'node:fs'
import path from 'node:path'
import type { AIClient } from '../ai/client'

export interface AutoTranslateOptions {
  /**
   * Source translation file path (e.g., /path/to/en.json)
   */
  sourceFile: string

  /**
   * Target languages to translate to (e.g., ['de', 'fr', 'nl'])
   */
  targetLanguages: string[]

  /**
   * AI client for translations
   */
  aiClient: AIClient

  /**
   * Source language code (e.g., 'en')
   */
  sourceLanguage: string

  /**
   * New keys that were just extracted (only translate these)
   * Map structure: sourceText -> translationKey (e.g., "Save" -> "common.save")
   */
  newKeys: Map<string, string>

  /**
   * Create backups before modifying files
   */
  backup?: boolean

  /**
   * Verbose logging
   */
  verbose?: boolean
}

export interface AutoTranslateResult {
  /**
   * Languages that were successfully translated
   */
  translatedLanguages: string[]

  /**
   * Total number of keys translated per language
   */
  translationsPerLanguage: Record<string, number>

  /**
   * Errors encountered during translation
   */
  errors: Array<{ language: string, error: string }>

  /**
   * Total time taken in milliseconds
   */
  duration: number
}

/**
 * Get the translation file path for a target language
 */
function getTranslationFilePath(sourceFile: string, targetLanguage: string, sourceLanguage: string): string {
  const dir = path.dirname(sourceFile)
  const ext = path.extname(sourceFile)
  const baseName = path.basename(sourceFile, ext)

  // Replace source language with target language in filename
  // e.g., en.json -> de.json or locales/en.json -> locales/de.json
  if (baseName === sourceLanguage) {
    return path.join(dir, `${targetLanguage}${ext}`)
  }

  // Handle cases like en-US.json -> de-DE.json
  const withoutLang = baseName.replace(sourceLanguage, targetLanguage)
  return path.join(dir, `${withoutLang}${ext}`)
}

/**
 * Set a nested value in an object using dot notation
 */
function setNestedValue(obj: any, key: string, value: string): void {
  const parts = key.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    if (!current[part] || typeof current[part] !== 'object') {
      current[part] = {}
    }
    current = current[part]
  }

  current[parts[parts.length - 1]] = value
}

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: any, key: string): string | undefined {
  const parts = key.split('.')
  let current = obj

  for (const part of parts) {
    if (!current || typeof current !== 'object') {
      return undefined
    }
    current = current[part]
  }

  return typeof current === 'string' ? current : undefined
}

/**
 * Flatten a nested object into dot notation key-value pairs
 */
function flattenTranslations(obj: any, prefix = ''): Map<string, string> {
  const result = new Map<string, string>()

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (typeof value === 'string') {
      result.set(fullKey, value)
    }
    else if (value && typeof value === 'object') {
      const nested = flattenTranslations(value, fullKey)
      for (const [nestedKey, nestedValue] of nested) {
        result.set(nestedKey, nestedValue)
      }
    }
  }

  return result
}

/**
 * Determine category from key for better translation context
 */
function getCategoryFromKey(key: string): string {
  const parts = key.split('.')
  if (parts.length > 1) {
    // Use the first part as category (e.g., "common", "errors", "buttons")
    return parts[0]
  }
  return ''
}

/**
 * Translate all missing keys from source language to target languages
 */
export async function translateMissingKeys(options: Omit<AutoTranslateOptions, 'newKeys'>): Promise<AutoTranslateResult> {
  const startTime = Date.now()
  const {
    sourceFile,
    targetLanguages,
    aiClient,
    sourceLanguage,
    backup = true,
    verbose = false,
  } = options

  const result: AutoTranslateResult = {
    translatedLanguages: [],
    translationsPerLanguage: {},
    errors: [],
    duration: 0,
  }

  // Load source translations
  let sourceTranslations: Record<string, any> = {}
  try {
    const sourceContent = fs.readFileSync(sourceFile, 'utf-8')
    sourceTranslations = JSON.parse(sourceContent)
  }
  catch (error) {
    result.errors.push({
      language: sourceLanguage,
      error: `Failed to load source file: ${(error as Error).message}`,
    })
    result.duration = Date.now() - startTime
    return result
  }

  // Flatten source translations to get all keys
  const sourceKeys = flattenTranslations(sourceTranslations)

  if (sourceKeys.size === 0) {
    if (verbose) {
      console.log('No keys found in source language file')
    }
    result.duration = Date.now() - startTime
    return result
  }

  if (verbose) {
    console.log(`\n=== Checking for missing translations in ${targetLanguages.length} languages ===`)
    console.log(`  Source language (${sourceLanguage}): ${sourceKeys.size} keys`)
  }

  // Process each target language
  for (const targetLang of targetLanguages) {
    const targetFile = getTranslationFilePath(sourceFile, targetLang, sourceLanguage)
    let targetTranslations: Record<string, any> = {}

    // Load existing translations if file exists
    if (fs.existsSync(targetFile)) {
      try {
        const content = fs.readFileSync(targetFile, 'utf-8')
        targetTranslations = JSON.parse(content)

        // Create backup if requested
        if (backup) {
          fs.writeFileSync(`${targetFile}.backup`, content, 'utf-8')
        }
      }
      catch (error) {
        if (verbose) {
          console.warn(`    Warning: Could not parse existing ${targetLang} file, creating new one`)
        }
      }
    }

    // Find missing keys
    const targetKeys = flattenTranslations(targetTranslations)
    const missingKeys = new Map<string, string>()

    for (const [key, sourceValue] of sourceKeys) {
      const targetValue = targetKeys.get(key)
      // Add to missing if: doesn't exist OR is same as source (untranslated)
      if (!targetValue || targetValue === sourceValue) {
        missingKeys.set(key, sourceValue)
      }
    }

    if (missingKeys.size === 0) {
      if (verbose) {
        console.log(`  ${targetLang}: All keys translated ✓`)
      }
      continue
    }

    if (verbose) {
      console.log(`\n  ${targetLang}: Found ${missingKeys.size} missing/untranslated keys`)
    }

    // Translate missing keys using the existing autoTranslate logic
    try {
      let translatedCount = 0

      for (const [key, sourceText] of missingKeys) {
        try {
          const category = getCategoryFromKey(key)
          const { translation, confidence } = await aiClient.translateText(sourceText, targetLang, {
            key,
            sourceLanguage,
            category,
          })

          setNestedValue(targetTranslations, key, translation)
          translatedCount++

          if (verbose) {
            console.log(`    ${key}: "${translation}" (confidence: ${confidence.toFixed(2)})`)
          }
        }
        catch (error) {
          if (verbose) {
            console.error(`    ${key}: failed - ${(error as Error).message}`)
          }
          // Continue with next key even if one fails
        }
      }

      // Write updated translations
      const targetDir = path.dirname(targetFile)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      fs.writeFileSync(targetFile, JSON.stringify(targetTranslations, null, 2) + '\n', 'utf-8')

      result.translatedLanguages.push(targetLang)
      result.translationsPerLanguage[targetLang] = translatedCount

      if (verbose) {
        console.log(`    ✓ Translated ${translatedCount} keys to ${targetFile}`)
      }
    }
    catch (error) {
      result.errors.push({
        language: targetLang,
        error: (error as Error).message,
      })

      if (verbose) {
        console.error(`    ✗ Error translating to ${targetLang}: ${(error as Error).message}`)
      }
    }
  }

  result.duration = Date.now() - startTime

  if (verbose && result.translatedLanguages.length > 0) {
    console.log(`\n  Missing key translation completed in ${result.duration}ms`)
    console.log(`  Languages updated: ${result.translatedLanguages.join(', ')}`)
  }

  return result
}

/**
 * Auto-translate new keys to target languages using AI
 */
export async function autoTranslate(options: AutoTranslateOptions): Promise<AutoTranslateResult> {
  const startTime = Date.now()
  const {
    sourceFile,
    targetLanguages,
    aiClient,
    sourceLanguage,
    newKeys,
    backup = true,
    verbose = false,
  } = options

  const result: AutoTranslateResult = {
    translatedLanguages: [],
    translationsPerLanguage: {},
    errors: [],
    duration: 0,
  }

  if (newKeys.size === 0) {
    if (verbose) {
      console.log('\nNo new keys extracted. Checking for missing translations in existing keys...')
    }

    // If no new keys but AI is enabled, translate any missing keys in target languages
    return translateMissingKeys({
      sourceFile,
      targetLanguages,
      aiClient,
      sourceLanguage,
      backup,
      verbose,
    })
  }

  if (verbose) {
    console.log(`\n=== Auto-translating ${newKeys.size} keys to ${targetLanguages.length} languages ===`)
  }

  // Load source translations
  let sourceTranslations: Record<string, any> = {}
  try {
    const sourceContent = fs.readFileSync(sourceFile, 'utf-8')
    sourceTranslations = JSON.parse(sourceContent)
  }
  catch (error) {
    result.errors.push({
      language: sourceLanguage,
      error: `Failed to load source file: ${(error as Error).message}`,
    })
    result.duration = Date.now() - startTime
    return result
  }

  // Process each target language
  for (const targetLang of targetLanguages) {
    if (verbose) {
      console.log(`\n  Translating to ${targetLang}...`)
    }

    try {
      const targetFile = getTranslationFilePath(sourceFile, targetLang, sourceLanguage)
      let targetTranslations: Record<string, any> = {}

      // Load existing translations if file exists
      if (fs.existsSync(targetFile)) {
        try {
          const content = fs.readFileSync(targetFile, 'utf-8')
          targetTranslations = JSON.parse(content)

          // Create backup if requested
          if (backup) {
            fs.writeFileSync(`${targetFile}.backup`, content, 'utf-8')
          }
        }
        catch (error) {
          if (verbose) {
            console.warn(`    Warning: Could not parse existing ${targetLang} file, creating new one`)
          }
        }
      }

      let translatedCount = 0

      // Translate each new key
      // Note: newKeys Map is text -> key (e.g., "save" -> "testComp.save")
      for (const [sourceText, key] of newKeys.entries()) {
        // Skip if translation already exists
        const existing = getNestedValue(targetTranslations, key)
        if (existing) {
          if (verbose) {
            console.log(`    ${key}: skipped (already exists)`)
          }
          continue
        }

        try {
          const category = getCategoryFromKey(key)
          const { translation, confidence } = await aiClient.translateText(sourceText, targetLang, {
            key,
            sourceLanguage,
            category,
          })

          setNestedValue(targetTranslations, key, translation)
          translatedCount++

          if (verbose) {
            console.log(`    ${key}: "${translation}" (confidence: ${confidence.toFixed(2)})`)
          }
        }
        catch (error) {
          if (verbose) {
            console.error(`    ${key}: failed - ${(error as Error).message}`)
          }
          // Continue with next key even if one fails
        }
      }

      // Write updated translations
      const targetDir = path.dirname(targetFile)
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      fs.writeFileSync(targetFile, JSON.stringify(targetTranslations, null, 2) + '\n', 'utf-8')

      result.translatedLanguages.push(targetLang)
      result.translationsPerLanguage[targetLang] = translatedCount

      if (verbose) {
        console.log(`    ✓ Translated ${translatedCount} keys to ${targetFile}`)
      }
    }
    catch (error) {
      result.errors.push({
        language: targetLang,
        error: (error as Error).message,
      })

      if (verbose) {
        console.error(`    ✗ Error translating to ${targetLang}: ${(error as Error).message}`)
      }
    }
  }

  result.duration = Date.now() - startTime

  if (verbose) {
    console.log(`\n  Auto-translation completed in ${result.duration}ms`)
    console.log(`  Languages: ${result.translatedLanguages.join(', ')}`)
  }

  return result
}
