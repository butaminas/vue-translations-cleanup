import * as fs from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { cleanupTranslations } from '../../src/translations-cleanup'

describe('cleanupTranslations nested translations', () => {
  it('should detect nested translations with bracket notation', async () => {
    const mockNestedTranslations = {
      parent: {
        child: {
          'sub-child': 'Test Value',
        },
      },
    }

    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (path === 'translations.json') {
        return JSON.stringify(mockNestedTranslations)
      }
      return `
            // Bracket notation
            t('parent["child"]["sub-child"]')
            $t("parent['child']['sub-child']")
            
            // Mixed notation
            t('parent.child["sub-child"]')
            $t("parent['child'].sub-child")
        `
    })

    const result = await cleanupTranslations({
      translationFile: 'translations.json',
      srcPath: 'src',
      dryRun: true,
    })

    // All notations should be normalized to dot notation in the result
    expect(Array.from(result.usedKeysSet)).toContain('parent.child.sub-child')
    expect(result.usedKeys).toBe(1) // Should only count as one unique key
  })
})
