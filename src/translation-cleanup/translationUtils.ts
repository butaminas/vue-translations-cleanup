import { TranslationObject } from './types'

// Function to flatten nested translation objects
export function flattenTranslations(
    obj: TranslationObject,
    prefix = '',
): Map<string, string> {
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

export function normalizeTranslationKey(key: string): string {
    return key.replace(/\[['"]([^'"]+)['"]\]/g, '.$1')
}
