import * as fs from 'node:fs'
import { glob } from 'glob'
import { translationPatterns } from './patterns'
import { normalizeTranslationKey } from './translationUtils'

export async function scanFiles(srcPath: string): Promise<Set<string>> {
  const files = await glob(`${srcPath}/**/*.{vue,ts,tsx}`)
  const usedKeys: Set<string> = new Set()

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf-8')

    // Existing pattern matching
    for (const pattern of translationPatterns) {
      const matches = content.matchAll(pattern)
      for (const match of matches) {
        if (match[1]) {
          usedKeys.add(normalizeTranslationKey(match[1]))
        }
      }
    }

    // Add back the const arrays check
    const constArrays = content.matchAll(/const\s+\w+\s*=\s*\[([\s\S]*?)]/g)
    for (const constMatch of constArrays) {
      if (constMatch[1]) {
        const stringMatches = constMatch[1].matchAll(/['"]([^'"]+)['"]/g)
        for (const match of stringMatches) {
          if (match[1]) {
            usedKeys.add(normalizeTranslationKey(match[1]))
          }
        }
      }
    }
  }

  return usedKeys
}
