import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanupTranslations } from '../src'
import * as fs from 'node:fs'
import { glob } from 'glob'

// Mock fs and glob
vi.mock('node:fs')
vi.mock('glob')

describe('cleanupTranslations', () => {
    const mockTranslations = {
        common: {
            hello: 'Hello',
            unused: 'Unused Key'
        },
        buttons: {
            submit: 'Submit'
        }
    }

    const mockFiles = [
        'src/components/Test.vue',
        'src/utils/helper.ts'
    ]

    beforeEach(() => {
        // Setup fs mock
        vi.mocked(fs.existsSync).mockImplementation(() => true)
        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path === 'translations.json') {
                return JSON.stringify(mockTranslations)
            }
            // Mock file content that uses some translations
            return `
                const t = (key) => key;
                t('common.hello')
                t('buttons.submit')
            `
        })

        // Setup glob mock
        vi.mocked(glob).mockResolvedValue(mockFiles)
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    it('should validate input paths', async () => {
        vi.mocked(fs.existsSync).mockImplementation(() => false)

        await expect(cleanupTranslations({
            translationFile: 'nonexistent.json',
            srcPath: 'src'
        })).rejects.toThrow('Translation file not found')
    })

    it('should identify unused translations', async () => {
        const result = await cleanupTranslations({
            translationFile: 'translations.json',
            srcPath: 'src',
            dryRun: true
        })

        expect(result.totalKeys).toBe(3)
        expect(result.usedKeys).toBe(2)
        expect(result.unusedKeys).toBe(1)
        expect(result.unusedTranslations).toContain('common.unused')
    })

    it('should handle dry run mode', async () => {
        const result = await cleanupTranslations({
            translationFile: 'translations.json',
            srcPath: 'src',
            dryRun: true
        })

        expect(result.cleaned).toBe(false)
    })

    it('should detect translations in different syntax patterns', async () => {
        // Mock file content with various translation patterns
        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path === 'translations.json') {
                return JSON.stringify(mockTranslations)
            }
            // Mock file content with different translation patterns
            return `
            // Regular syntax
            t('common.hello')
            $t('buttons.submit')
            
            // Template literals
            t(\`common.hello\`)
            $t(\`buttons.submit\`)
            
            // Composition API
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
            dryRun: true
        })

        // All occurrences of 'common.hello' and 'buttons.submit' should be detected
        expect(result.usedKeys).toBe(2)
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
            dryRun: true
        })

        console.log('Actual used keys:', Array.from(result.usedKeysSet))

        expect(result.usedKeys).toBe(2)
        expect(result.unusedKeys).toBe(1)
    })
})
