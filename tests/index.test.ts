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

    it('should detect all translation patterns', async () => {
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
            dryRun: true
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
            dryRun: true
        })

        console.log('Actual used keys:', Array.from(result.usedKeysSet))

        expect(result.usedKeys).toBe(2)
        expect(result.unusedKeys).toBe(1)
    })

    it('should detect nested translations with bracket notation', async () => {
        const mockNestedTranslations = {
            parent: {
                child: {
                    'sub-child': 'Test Value'
                }
            }
        }

        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path === 'translations.json') {
                return JSON.stringify(mockNestedTranslations)
            }
            return `
            // Bracket notation
            t('parent.child["sub-child"]')
            $t('parent.child[\'sub-child\']')
            tc('parent.child["sub-child"]', 1)
            
            // Mixed dot and bracket notation
            t('parent["child"].sub-child')
            $t('parent["child"]["sub-child"]')
        `
        })

        const result = await cleanupTranslations({
            translationFile: 'translations.json',
            srcPath: 'src',
            dryRun: true
        })

        expect(Array.from(result.usedKeysSet)).toContain('parent.child.sub-child')
    })
})
