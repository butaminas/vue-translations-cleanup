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

  // Compute effective used leaves: a leaf is considered used if the exact leaf key is used or any of its parent prefixes is used
  const effectiveUsedLeaves = new Set<string>()
  for (const leaf of allTranslationKeys) {
    let cursor = leaf
    let matched = false
    while (true) {
      if (usedKeys.has(cursor)) {
        matched = true
        break
      }
      const idx = cursor.lastIndexOf('.')
      if (idx === -1)
        break
      cursor = cursor.substring(0, idx)
    }
    if (matched)
      effectiveUsedLeaves.add(leaf)
  }

  // Find unused translations based on effective used leaves
  const unusedTranslations = allTranslationKeys.filter(
    key => !effectiveUsedLeaves.has(key),
  )

  // Create result object
  const result = {
    totalKeys: allTranslationKeys.length,
    usedKeys: usedKeys.size,
    usedKeysSet: usedKeys,
    unusedKeys: unusedTranslations.length,
    unusedTranslations,
    cleaned: false,
  }

  // Helper to prune empty objects anywhere in the tree
  const pruneEmptyObjects = (obj: any): void => {
    if (!obj || typeof obj !== 'object')
      return
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key]
      if (val && typeof val === 'object') {
        pruneEmptyObjects(val)
        if (val && typeof val === 'object' && Object.keys(val).length === 0)
          delete (obj as any)[key]
      }
    }
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
        const stack: Array<{ parent: any, key: string }> = []

        // Traverse to the parent of the leaf to delete, keeping a stack
        for (let i = 0; i < parts.length - 1; i++) {
          const key = parts[i]
          if (current == null || typeof current !== 'object' || current[key] === undefined) {
            current = undefined
            break
          }
          stack.push({ parent: current, key })
          current = current[key]
        }

        const lastPart = parts[parts.length - 1]
        if (current && typeof current === 'object' && Object.prototype.hasOwnProperty.call(current, lastPart)) {
          delete current[lastPart]

          // Prune empty parent objects recursively up to the root
          while (stack.length > 0 && current && typeof current === 'object' && Object.keys(current).length === 0) {
            const { parent, key } = stack.pop()!
            delete parent[key]
            current = parent
          }
        }
      }

      return result
    }

    const cleanedTranslations = removeUnusedKeys(
      translations,
      unusedTranslations,
    )

    // Final global pruning pass to drop any empty objects (including root-level empties)
    pruneEmptyObjects(cleanedTranslations)

    if (backup) {
      const backupPath = `${translationFile}.backup`
      fs.copyFileSync(translationFile, backupPath)
      if (verbose)
        console.warn(`Backup created at: ${backupPath}`)
    }

    fs.writeFileSync(
      translationFile,
      JSON.stringify(cleanedTranslations, null, 2),
    )
    result.cleaned = true
  }
  else if (!dryRun) {
    // Prune-only run: remove empty objects even when there are no unused leaf keys
    const pruned = JSON.parse(JSON.stringify(translations)) as TranslationObject
    pruneEmptyObjects(pruned)
    if (JSON.stringify(pruned) !== JSON.stringify(translations)) {
      if (backup) {
        const backupPath = `${translationFile}.backup`
        fs.copyFileSync(translationFile, backupPath)
        if (verbose)
          console.warn(`Backup created at: ${backupPath}`)
      }
      fs.writeFileSync(
        translationFile,
        JSON.stringify(pruned, null, 2),
      )
      result.cleaned = true
    }
  }

  return result
}
