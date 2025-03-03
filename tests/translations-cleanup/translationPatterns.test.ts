import * as fs from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { cleanupTranslations } from '../../src/translations-cleanup'
import { mockTranslations } from '../setup'

describe('cleanupTranslations patterns', () => {
  it('should identify unused translations', async () => {
    const result = await cleanupTranslations({
      translationFile: 'translations.json',
      srcPath: 'src',
      dryRun: true,
    })

    expect(result.totalKeys).toBe(3)
    expect(result.usedKeys).toBe(2)
    expect(result.unusedKeys).toBe(1)
    expect(result.unusedTranslations).toContain('common.unused')
  })

  it('should detect all translation patterns without additional parameters', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (path === 'translations.json') {
        return JSON.stringify(mockTranslations)
      }
      return `
            // Basic syntax with different quotes
            t('common.hello')
            $t("buttons.submit")
            t(\`common.hello\`)
            
            // Count functions
            $tc('common.hello', 0)
            tc("buttons.submit", 1)
            $tc(\`common.hello\`, 2)
            
            // Composition API usage
            const { t } = useI18n()
            t('common.hello')
            useI18n().t('buttons.submit')
            
            // Object syntax in template
            { $t: 'common.hello' }
            :label="{ $t: 'buttons.submit' }"
        `
    })

    const result = await cleanupTranslations({
      translationFile: 'translations.json',
      srcPath: 'src',
      dryRun: true,
    })

    expect(result.usedKeys).toBe(2) // Only unique keys should be counted
    expect(Array.from(result.usedKeysSet)).toContain('common.hello')
    expect(Array.from(result.usedKeysSet)).toContain('buttons.submit')
    expect(result.unusedTranslations).toContain('common.unused')
  })

  it('should handle edge cases in translation patterns', async () => {
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (path === 'translations.json') {
        return JSON.stringify(mockTranslations)
      }
      return `
            // Mixed quotes
            t("common.hello")
            $t(\`buttons.submit\`)
            
            // Composition API with whitespace
            const  {   t   }  =  useI18n()
            t('common.hello')
        `
    })

    const result = await cleanupTranslations({
      translationFile: 'translations.json',
      srcPath: 'src',
      dryRun: true,
    })

    expect(result.usedKeys).toBe(2)
    expect(result.unusedKeys).toBe(1)
  })
})
