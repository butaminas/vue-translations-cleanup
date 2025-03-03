import type { CleanupOptions, TranslationObject } from './types'
import * as fs from 'node:fs'
import { scanFiles } from './fileScanner'
import { flattenTranslations } from './translationUtils'

export async function cleanupTranslations(options: CleanupOptions) {
  const {
    translationFile,
    srcPath,
    backup = true,
    dryRun = false,
    verbose = false,
  } = options

  // Validate inputs
  if (!fs.existsSync(translationFile)) {
    throw new Error(`Translation file not found: ${translationFile}`)
  }

  if (!fs.existsSync(srcPath)) {
    throw new Error(`Source path not found: ${srcPath}`)
  }

  // Read the translation file
  const translations: TranslationObject = JSON.parse(
    fs.readFileSync(translationFile, 'utf-8'),
  )

  // Get all translation keys as flat structure
  const flatTranslations = flattenTranslations(translations)
  const allTranslationKeys = Array.from(flatTranslations.keys())

  // Find all used translation keys in files
  const usedKeys = await scanFiles(srcPath)

  // Find unused translations
  const unusedTranslations = allTranslationKeys.filter(
    key => !usedKeys.has(key),
  )

  // Create result object
  const result = {
    totalKeys: allTranslationKeys.length,
    usedKeys: usedKeys.size,
    unusedKeys: unusedTranslations.length,
    unusedTranslations,
    cleaned: false,
  }

  if (unusedTranslations.length > 0 && !dryRun) {
    // Remove unused translations from the original object
    const removeUnusedKeys = (
      obj: TranslationObject,
      unusedPaths: string[],
    ): TranslationObject => {
      const result: TranslationObject = { ...obj }

      for (const unusedPath of unusedPaths) {
        const parts = unusedPath.split('.')
        let current: any = result

        for (let i = 0; i < parts.length - 1; i++) {
          if (current[parts[i]] === undefined)
            break
          current = current[parts[i]]
        }

        const lastPart = parts[parts.length - 1]
        if (current && typeof current === 'object')
          delete current[lastPart]
      }

      return result
    }

    const cleanedTranslations = removeUnusedKeys(
      translations,
      unusedTranslations,
    )

    if (backup) {
      const backupPath = `${translationFile}.backup`
      fs.copyFileSync(translationFile, backupPath)
      if (verbose)
        console.log(`Backup created at: ${backupPath}`)
    }

    fs.writeFileSync(
      translationFile,
      JSON.stringify(cleanedTranslations, null, 2),
    )
    result.cleaned = true
  }

  return result
}
