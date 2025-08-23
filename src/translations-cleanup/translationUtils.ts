import type { TranslationObject } from './types'

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
    else if (value && typeof value === 'object') {
      const nested = flattenTranslations(value as TranslationObject, newKey)
      nested.forEach((val, nestedKey) => {
        flattened.set(nestedKey, val)
      })
    }
    // Ignore other types (null, numbers, booleans, etc.)
  }

  return flattened
}

export function normalizeTranslationKey(key: string): string {
  return key.replace(/\[['"]([^'"]+)['"]\]/g, '.$1')
}
