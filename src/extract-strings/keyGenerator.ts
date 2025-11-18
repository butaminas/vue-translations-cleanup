import type { ExtractConfig } from '../config/types'
import type { RawStringLocation } from './types'

/**
 * Convert a string to the specified key format
 */
function formatKey(text: string, format: ExtractConfig['keyFormat'] = 'snake_case'): string {
  // Remove special characters and normalize
  let normalized = text
    .toLowerCase()
    .replace(/[^\w\s.-]/g, '')
    .trim()

  // Split into words
  const words = normalized.split(/[\s_.-]+/).filter(Boolean)

  switch (format) {
    case 'snake_case':
      return words.join('_')

    case 'camelCase':
      return words
        .map((word, index) => (index === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1)))
        .join('')

    case 'kebab-case':
      return words.join('-')

    case 'dot.case':
      return words.join('.')

    default:
      return words.join('_')
  }
}

/**
 * Truncate a key to max length while trying to keep it readable
 */
function truncateKey(key: string, maxLength: number, format: ExtractConfig['keyFormat'] = 'snake_case'): string {
  if (key.length <= maxLength) {
    return key
  }

  const separator = format === 'snake_case' ? '_' : format === 'kebab-case' ? '-' : format === 'dot.case' ? '.' : ''

  // Try to keep the beginning and end
  const parts = separator ? key.split(separator) : [key]

  if (parts.length <= 2) {
    // Just truncate
    return key.substring(0, maxLength)
  }

  // Keep first and last parts, shorten middle
  const first = parts[0]
  const last = parts[parts.length - 1]
  const remaining = maxLength - first.length - last.length - separator.length * 2

  if (remaining > 0) {
    const middle = parts.slice(1, -1).join(separator).substring(0, remaining)
    return [first, middle, last].filter(Boolean).join(separator)
  }

  return key.substring(0, maxLength)
}

/**
 * Infer a hierarchical prefix from file path and context
 */
function inferPrefix(location: RawStringLocation, format: ExtractConfig['keyFormat'] = 'snake_case'): string | null {
  const { file } = location

  // Extract component name from file path
  const fileName = file.split('/').pop()?.replace(/\.(vue|ts|js|tsx|jsx)$/, '')

  if (!fileName) {
    return null
  }

  // Convert component name to the configured key format
  const words = fileName
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .toLowerCase()
    .split(/[\s_-]+/)
    .filter(Boolean)

  // Format according to keyFormat
  const componentKey = formatKey(words.join(' '), format)

  return componentKey
}

/**
 * Generate a semantic key from a raw string
 */
export function generateKey(
  text: string,
  location: RawStringLocation,
  config: ExtractConfig,
  existingKeys: Set<string> = new Set(),
): string {
  const format = config.keyFormat || 'snake_case'
  const maxLength = config.maxKeyLength || 50

  // Start with basic key from text
  let key = formatKey(text, format)

  // Add hierarchical prefix if applicable
  const prefix = inferPrefix(location, format)
  if (prefix && !key.startsWith(prefix)) {
    // Always use dot notation for hierarchical structure
    // The individual parts (prefix and key) are already formatted according to keyFormat
    key = `${prefix}.${key}`
  }

  // Truncate if needed
  if (key.length > maxLength) {
    key = truncateKey(key, maxLength, format)
  }

  // Handle duplicates by adding suffix
  if (existingKeys.has(key)) {
    let counter = 2
    const separator = format === 'camelCase' ? '' : format === 'kebab-case' ? '-' : '_'
    let uniqueKey = format === 'camelCase' ? `${key}${counter}` : `${key}${separator}${counter}`

    while (existingKeys.has(uniqueKey)) {
      counter++
      uniqueKey = format === 'camelCase' ? `${key}${counter}` : `${key}${separator}${counter}`
    }

    key = uniqueKey
  }

  return key
}

/**
 * Generate keys for multiple raw strings
 */
export function generateKeys(
  rawStrings: RawStringLocation[],
  config: ExtractConfig,
): Map<string, string> {
  const keyMap = new Map<string, string>() // text -> key
  const usedKeys = new Set<string>()

  for (const location of rawStrings) {
    const key = generateKey(location.text, location, config, usedKeys)
    keyMap.set(location.text, key)
    usedKeys.add(key)
  }

  return keyMap
}

/**
 * Suggest a better key using context and heuristics
 */
export function suggestBetterKey(
  text: string,
  location: RawStringLocation,
  config: ExtractConfig,
): {
  key: string
  reason: string
} {
  const baseKey = generateKey(text, location, config)
  const format = config.keyFormat || 'snake_case'

  // Prioritize attribute context first
  if (location.context === 'attribute') {
    if (location.attributeName === 'placeholder') {
      const prefix = inferPrefix(location, format) || 'form'
      return {
        key: `${prefix}.placeholder`,
        reason: 'Form placeholder detected',
      }
    }

    if (location.attributeName === 'title') {
      const prefix = inferPrefix(location, format) || 'tooltip'
      return {
        key: `${prefix}.title`,
        reason: 'Tooltip title detected',
      }
    }
  }

  // Analyze the text for common patterns
  const lowerText = text.toLowerCase()

  // Error messages
  if (lowerText.includes('error') || lowerText.includes('failed') || lowerText.includes('invalid')) {
    const prefix = inferPrefix(location, format) || 'error'
    return {
      key: `${prefix}.${formatKey(text, config.keyFormat)}`,
      reason: 'Error message detected',
    }
  }

  // Success messages
  if (lowerText.includes('success') || lowerText.includes('completed') || lowerText.includes('saved')) {
    const prefix = inferPrefix(location, format) || 'success'
    return {
      key: `${prefix}.${formatKey(text, config.keyFormat)}`,
      reason: 'Success message detected',
    }
  }

  // Button text
  if (/^(click|submit|save|cancel|delete|edit|add|create|update)\b/i.test(text)) {
    const action = text.split(/\s+/)[0].toLowerCase()
    const prefix = inferPrefix(location, format) || 'button'
    return {
      key: `${prefix}.${action}`,
      reason: 'Action button detected',
    }
  }

  // Default: use the base key
  return {
    key: baseKey,
    reason: 'Default semantic key',
  }
}

/**
 * Group keys by prefix for better organization
 */
export function groupKeysByPrefix(keys: Map<string, string>): Map<string, string[]> {
  const groups = new Map<string, string[]>()

  for (const [text, key] of keys) {
    // Extract prefix (everything before the last separator)
    const separator = key.includes('.') ? '.' : key.includes('_') ? '_' : '-'
    const lastSeparatorIndex = key.lastIndexOf(separator)

    const prefix = lastSeparatorIndex > 0 ? key.substring(0, lastSeparatorIndex) : 'root'

    if (!groups.has(prefix)) {
      groups.set(prefix, [])
    }
    groups.get(prefix)!.push(key)
  }

  return groups
}
