import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanupTranslations } from '../src/translation-cleanup'
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

        console.log(result)

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
            dryRun: true
        })

        // All notations should be normalized to dot notation in the result
        expect(Array.from(result.usedKeysSet)).toContain('parent.child.sub-child')
        expect(result.usedKeys).toBe(1) // Should only count as one unique key
    })

    it('should detect translation keys with various parameter types', async () => {
        const mockNestedTranslations = {
            messages: {
                hello: 'Hello',
                welcome: 'Welcome',
                goodbye: 'Goodbye',
                items: 'Items'
            }
        }

        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path === 'translations.json') {
                return JSON.stringify(mockNestedTranslations)
            }
            return `
            // With locale parameter
            $t('messages.hello', 'en-US')
            
            // With array parameter
            $t('messages.welcome', ['John', 'Jane'])
            
            // With named parameters object
            $t('messages.hello', { name: 'John' })
            
            // With plural number
            $t('messages.items', 2)
            
            // With options object
            $t('messages.welcome', { pluralization: true })
            
            // With default message
            $t('messages.goodbye', 'See you later')
            
            // Mixed parameters
            $t('messages.hello', ['param'], 2)
            $t('messages.welcome', { name: 'John' }, 'Default welcome')
            
            // Template literals with parameters
            t(\`messages.hello\`, { name: 'John' })
            
            // Composition API with parameters
            const { t } = useI18n()
            t('messages.welcome', { name: 'John' })
            useI18n().t('messages.goodbye', 'See you')
            
            // With multiple spaces and line breaks
            $t(
                'messages.hello',
                { 
                    name: 'John'
                }
            )
        `
        })

        const result = await cleanupTranslations({
            translationFile: 'translations.json',
            srcPath: 'src',
            dryRun: true
        })

        // All keys should be detected regardless of the parameter variations
        expect(Array.from(result.usedKeysSet)).toContain('messages.hello')
        expect(Array.from(result.usedKeysSet)).toContain('messages.welcome')
        expect(Array.from(result.usedKeysSet)).toContain('messages.goodbye')
        expect(Array.from(result.usedKeysSet)).toContain('messages.items')
        expect(result.usedKeys).toBe(4) // Should find all unique keys
    })

    it('should detect all $rt translation patterns', async () => {
        const mockTranslations = {
            messages: {
                basic: 'Basic message',
                plural: 'Plural message',
                list: 'List message',
                named: 'Named message',
                complex: 'Complex message'
            }
        }

        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path === 'translations.json') {
                return JSON.stringify(mockTranslations)
            }
            return `
            // Basic message function
            $rt('messages.basic')
            $rt(message)
            
            // With plural and options
            $rt('messages.plural', 2, { preserveState: true })
            
            // With list and options
            $rt('messages.list', ['item1', 'item2'], { linked: false })
            
            // With named values and options
            $rt('messages.named', {
                bold: (text) => h('b', text),
                link: (text) => h('a', { href: '#' }, text)
            }, { mode: 'html' })
            
            // Complex cases
            const msg = 'messages.complex'
            $rt(msg)
            
            // Template literals
            $rt(\`messages.basic\`, {
                msg: (text) => h('span', text)
            })
            
            // Composition API
            const { rt } = useI18n()
            rt('messages.basic')
            useI18n().rt('messages.named', { span: (text) => h('span', text) })
            
            // Multi-line format
            $rt(
                'messages.complex',
                { 
                    bold: (text) => h('b', text)
                },
                { preserveState: true }
            )
        `
        })

        const result = await cleanupTranslations({
            translationFile: 'translations.json',
            srcPath: 'src',
            dryRun: true
        })

        // Verify all keys are detected regardless of how $rt is used
        expect(Array.from(result.usedKeysSet)).toContain('messages.basic')
        expect(Array.from(result.usedKeysSet)).toContain('messages.plural')
        expect(Array.from(result.usedKeysSet)).toContain('messages.list')
        expect(Array.from(result.usedKeysSet)).toContain('messages.named')
        expect(Array.from(result.usedKeysSet)).toContain('messages.complex')
    })

    it('should not match function names that happen to end with translation function names', async () => {
        const mockComplexTranslations = {
            parent: {
                child: {
                    'sub-child': 'Test Value'
                }
            }
        }

        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path === 'translations.json') {
                return JSON.stringify(mockComplexTranslations)
            }
            return `
            // These should NOT be matched
            getParent('test')
            init('something')
            makeConstruct('value')
            getSomethingRt('key')
            doSomethingTc('test')
            
            // These should be matched
            t('parent.child.sub-child')
            $t('parent.child.sub-child')
            rt('parent.child.sub-child')
            $rt('parent.child.sub-child')
            tc('parent.child.sub-child')
            $tc('parent.child.sub-child')
            useI18n().t('parent.child.sub-child')
        `
        })

        const result = await cleanupTranslations({
            translationFile: 'translations.json',
            srcPath: 'src',
            dryRun: true
        })

        // Should only find the legitimate translation keys
        expect(result.usedKeys).toBe(1) // Only one unique key used
        expect(Array.from(result.usedKeysSet)).toContain('parent.child.sub-child')

        // The key should be found exactly once in the set (no duplicates)
        expect(Array.from(result.usedKeysSet).filter(key => key === 'parent.child.sub-child')).toHaveLength(1)

        // Make sure we don't have any false positives
        expect(Array.from(result.usedKeysSet)).not.toContain('test')
        expect(Array.from(result.usedKeysSet)).not.toContain('something')
        expect(Array.from(result.usedKeysSet)).not.toContain('value')
        expect(Array.from(result.usedKeysSet)).not.toContain('key')
    })
})
