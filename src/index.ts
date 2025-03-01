import * as fs from 'node:fs'
import { glob } from 'glob'

interface TranslationObject {
    [key: string]: string | TranslationObject
}

interface CleanupOptions {
    translationFile: string
    srcPath: string
    backup?: boolean
    dryRun?: boolean
    verbose?: boolean
}

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

    // Get all .vue, .ts, and .tsx files in src directory
    const files = await glob(`${srcPath}/**/*.{vue,ts,tsx}`)

    // Store all used translation keys
    const usedKeys: Set<string> = new Set()

    // Function to flatten nested translation objects
    const flattenTranslations = (
        obj: TranslationObject,
        prefix = '',
    ): Map<string, string> => {
        const flattened = new Map<string, string>()

        for (const [key, value] of Object.entries(obj)) {
            const newKey = prefix ? `${prefix}.${key}` : key
            if (typeof value === 'string') {
                flattened.set(newKey, value)
            }
            else {
                const nested = flattenTranslations(value, newKey)
                nested.forEach((val, nestedKey) => {
                    flattened.set(nestedKey, val)
                })
            }
        }

        return flattened
    }

    // Get all translation keys as flat structure
    const flatTranslations = flattenTranslations(translations)
    const allTranslationKeys = Array.from(flatTranslations.keys())

    // Find all used translation keys in files
    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8')

        const patterns = [
            // Basic t() function call (already fixed)
            /(?:^|\W)(?:\$)?t\(['"]([^'"]+)['"]\)/g,

            // $t() with quotes and multi-line support
            /(?:^|\W)(?:\$)?t\(\s*['"]([^'"]+)['"]\s*(?:,[\s\S]*?)?\)/g,

            // Template literals with multi-line support
            /(?:^|\W)(?:\$)?t\(\s*`([^`]+)`\s*(?:,[\s\S]*?)?\)/g,

            // rt() and $rt support with multi-line
            /(?:^|\W)(?:\$)?rt\(\s*['"]([^'"]+)['"]\s*(?:,[\s\S]*?)?\)/g,
            /(?:^|\W)(?:\$)?rt\(\s*`([^`]+)`\s*(?:,[\s\S]*?)?\)/g,

            // tc() and $tc() with multi-line support
            /(?:^|\W)(?:\$)?tc\(\s*['"]([^'"]+)['"]\s*(?:,[\s\S]*?)?\)/g,
            /(?:^|\W)(?:\$)?tc\(\s*`([^`]+)`\s*(?:,[\s\S]*?)?\)/g,

            // Composition API usage with multi-line support
            /(?:^|\W)useI18n\(\)\.[tr]t\(\s*['"`]([^'"`]+)['"`]\s*(?:,[\s\S]*?)?\)/g,

            // Object-style template usage - this one is fine as is because it specifically looks for $t:
            /\$t\s*:\s*['"`]([^'"`]+)['"`]/g,

            // Handle bracket notation
            /(?:^|\W)(?:\$)?t\(['"]([^'"]+(?:\[['"][^'"]+['"]\])*)['"]\)/g,
    ]

        function normalizeTranslationKey(key: string): string {
            // Convert bracket notation to dot notation
            return key.replace(/\[['"]([^'"]+)['"]\]/g, '.$1');
        }

        patterns.forEach((pattern) => {
            const matches = content.matchAll(pattern)
            for (const match of matches) {
                if (match[1]) {
                    usedKeys.add(normalizeTranslationKey(match[1]))
                }
            }
        })

        // Check for const arrays
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

    // Find unused translations
    const unusedTranslations = allTranslationKeys.filter(
        key => !usedKeys.has(key),
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
