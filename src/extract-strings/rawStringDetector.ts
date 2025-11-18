import fs from 'node:fs'
import { parse as parseVueSFC } from '@vue/compiler-sfc'
import type { ExtractConfig } from '../config/types'
import type { RawStringLocation } from './types'

/**
 * Heuristics to determine if a string is likely translatable
 */
function isLikelyTranslatable(text: string, confidence: ExtractConfig['confidence'] = 'high'): {
  translatable: boolean
  confidence: 'high' | 'medium' | 'low'
  reason?: string
} {
  const trimmed = text.trim()

  // Empty or whitespace-only
  if (!trimmed) {
    return { translatable: false, confidence: 'high', reason: 'empty or whitespace' }
  }

  // Very short strings (single characters, etc.)
  if (trimmed.length < 2) {
    return { translatable: false, confidence: 'high', reason: 'too short' }
  }

  // Numbers only
  if (/^\d+$/.test(trimmed)) {
    return { translatable: false, confidence: 'high', reason: 'number only' }
  }

  // URLs
  if (/^https?:\/\//.test(trimmed) || /^www\./.test(trimmed)) {
    return { translatable: false, confidence: 'high', reason: 'URL' }
  }

  // File paths
  if (/^[./\\]/.test(trimmed) && /[./\\]/.test(trimmed)) {
    return { translatable: false, confidence: 'high', reason: 'file path' }
  }

  // Hex colors
  if (/^#[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    return { translatable: false, confidence: 'high', reason: 'hex color' }
  }

  // Object/array destructuring syntax in templates: { foo }, [ bar ]
  if (/^[{[].*[}\]]$/.test(trimmed)) {
    return { translatable: false, confidence: 'high', reason: 'destructuring syntax' }
  }

  // CSS properties and values
  if (/[:;]/.test(trimmed) || /^[a-z-]+:\s*[^;]+;?$/i.test(trimmed)) {
    return { translatable: false, confidence: 'high', reason: 'CSS code' }
  }

  // CSS classes or IDs (single words with hyphens/underscores)
  if (/^[a-z][a-z0-9_-]*$/i.test(trimmed) && trimmed.includes('-')) {
    return { translatable: false, confidence: 'medium', reason: 'likely CSS class' }
  }

  // camelCase or PascalCase (likely variable/function names)
  if (/^[a-z]+[A-Z]/.test(trimmed) || /^[A-Z][a-z]+[A-Z]/.test(trimmed)) {
    return { translatable: false, confidence: 'high', reason: 'camelCase/PascalCase identifier' }
  }

  // Single words without spaces
  if (!/\s/.test(trimmed) && trimmed.length < 15) {
    // Allow normal capitalized words (UI labels like "Save", "Cancel", "Edit")
    if (/^[A-Z][a-z]+$/.test(trimmed) && trimmed.length >= 3) {
      return { translatable: true, confidence: 'high' }  // UI labels are clearly translatable
    }
    // Filter out lowercase-only single words (variable names, CSS classes)
    if (trimmed === trimmed.toLowerCase()) {
      return { translatable: false, confidence: 'medium', reason: 'lowercase single word' }
    }
    // Other short single words - probably not translatable
    return { translatable: false, confidence: 'low', reason: 'single short word' }
  }

  // Email addresses
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return { translatable: false, confidence: 'high', reason: 'email address' }
  }

  // All caps (might be constants)
  if (trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed) && trimmed.length < 10) {
    return { translatable: false, confidence: 'medium', reason: 'all caps (constant?)' }
  }

  // Contains natural language indicators (spaces, punctuation, multiple words)
  const hasSpaces = /\s/.test(trimmed)
  const hasLetters = /[a-zA-Z]/.test(trimmed)
  const wordCount = trimmed.split(/\s+/).length

  if (hasLetters && hasSpaces && wordCount >= 2) {
    return { translatable: true, confidence: 'high' }
  }

  if (hasLetters && trimmed.length >= 15) {
    return { translatable: true, confidence: 'medium' }
  }

  if (hasLetters && hasSpaces) {
    return { translatable: true, confidence: 'medium' }
  }

  if (hasLetters && trimmed.length >= 10) {
    return { translatable: true, confidence: 'low' }
  }

  // Default: probably not translatable
  return { translatable: false, confidence: 'low', reason: 'default heuristic' }
}

/**
 * Check if text contains Vue interpolation or i18n calls
 */
function containsVueInterpolationOrI18n(text: string): boolean {
  // Contains Vue interpolation {{ }}
  if (/\{\{.*\}\}/.test(text)) {
    return true
  }

  // Contains i18n function calls (very common patterns)
  if (/\b\$?t\s*\(/.test(text)) {
    return true
  }

  return false
}

/**
 * Extract raw strings from Vue template
 */
function extractFromTemplate(
  templateContent: string,
  filePath: string,
  config: ExtractConfig,
): RawStringLocation[] {
  const results: RawStringLocation[] = []
  const minConfidence = config.confidence || 'high'
  const confidenceLevels = { high: 3, medium: 2, low: 1 }

  // Text between tags: >text<
  // But exclude anything with Vue interpolations {{ }}
  const textNodeRegex = />([^<]+)</g
  let match: RegExpExecArray | null

  while ((match = textNodeRegex.exec(templateContent)) !== null) {
    const text = match[1]

    // Skip if it contains Vue interpolation or i18n calls
    if (containsVueInterpolationOrI18n(text)) {
      continue
    }

    const analysis = isLikelyTranslatable(text, minConfidence)

    if (analysis.translatable && confidenceLevels[analysis.confidence] >= confidenceLevels[minConfidence]) {
      // Calculate approximate line/column (simplified)
      const beforeMatch = templateContent.substring(0, match.index)
      const lines = beforeMatch.split('\n')
      const line = lines.length
      const column = lines[lines.length - 1].length

      results.push({
        text: text.trim(),
        file: filePath,
        line,
        column,
        context: 'template',
        confidence: analysis.confidence,
      })
    }
  }

  // Attribute values for specific attributes
  const includeAttributes = config.includeAttributes || ['placeholder', 'title', 'alt', 'label', 'aria-label']

  for (const attr of includeAttributes) {
    // Match attribute="value" or attribute='value'
    const attrRegex = new RegExp(`\\b${attr}=["']([^"']+)["']`, 'gi')

    while ((match = attrRegex.exec(templateContent)) !== null) {
      const text = match[1]

      // Skip dynamic bindings (:attr or v-bind:attr)
      const beforeMatch = templateContent.substring(Math.max(0, match.index - 10), match.index)
      if (/:$/.test(beforeMatch.trim()) || /v-bind:$/.test(beforeMatch.trim())) {
        continue
      }

      // Skip if contains interpolation or i18n calls
      if (containsVueInterpolationOrI18n(text)) {
        continue
      }

      const analysis = isLikelyTranslatable(text, minConfidence)

      if (analysis.translatable && confidenceLevels[analysis.confidence] >= confidenceLevels[minConfidence]) {
        const beforeMatch = templateContent.substring(0, match.index)
        const lines = beforeMatch.split('\n')
        const line = lines.length
        const column = lines[lines.length - 1].length

        results.push({
          text: text.trim(),
          file: filePath,
          line,
          column,
          context: 'attribute',
          attributeName: attr,
          confidence: analysis.confidence,
        })
      }
    }
  }

  return results
}

/**
 * Extract raw strings from script section
 */
function extractFromScript(
  scriptContent: string,
  filePath: string,
  config: ExtractConfig,
): RawStringLocation[] {
  const results: RawStringLocation[] = []
  const minConfidence = config.confidence || 'high'
  const confidenceLevels = { high: 3, medium: 2, low: 1 }

  // Extract string literals (simple approach)
  // Match strings that are not in i18n function calls
  // This is a simplified regex - for production, use proper AST parsing

  const stringRegex = /(['"`])(?:(?=(\\?))\2.)*?\1/g
  let match: RegExpExecArray | null

  while ((match = stringRegex.exec(scriptContent)) !== null) {
    const fullMatch = match[0]
    const quote = match[1]
    const text = fullMatch.slice(1, -1) // Remove quotes

    // Skip if it's already in an i18n call
    const beforeMatch = scriptContent.substring(Math.max(0, match.index - 50), match.index)
    if (/\bt\s*\(\s*$/.test(beforeMatch) || /\$t\s*\(\s*$/.test(beforeMatch)) {
      continue
    }

    const analysis = isLikelyTranslatable(text, minConfidence)

    if (analysis.translatable && confidenceLevels[analysis.confidence] >= confidenceLevels[minConfidence]) {
      const beforeMatchFull = scriptContent.substring(0, match.index)
      const lines = beforeMatchFull.split('\n')
      const line = lines.length
      const column = lines[lines.length - 1].length

      results.push({
        text: text.trim(),
        file: filePath,
        line,
        column,
        context: 'script',
        confidence: analysis.confidence,
      })
    }
  }

  return results
}

/**
 * Detect raw strings in a Vue file
 */
export function detectRawStringsInFile(
  filePath: string,
  config: ExtractConfig,
): RawStringLocation[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const results: RawStringLocation[] = []

  // Check if it's a Vue file
  if (filePath.endsWith('.vue')) {
    try {
      const { descriptor } = parseVueSFC(content, { filename: filePath })

      // Extract from template
      if (descriptor.template) {
        const templateResults = extractFromTemplate(
          descriptor.template.content,
          filePath,
          config,
        )
        results.push(...templateResults)
      }

      // Extract from script
      if (descriptor.script || descriptor.scriptSetup) {
        const scriptContent = descriptor.script?.content || descriptor.scriptSetup?.content || ''
        const scriptResults = extractFromScript(scriptContent, filePath, config)
        results.push(...scriptResults)
      }
    }
    catch (error) {
      console.warn(`Warning: Failed to parse Vue file ${filePath}:`, error)
    }
  }
  else if (filePath.match(/\.(ts|js|tsx|jsx)$/)) {
    // Handle plain JS/TS files
    const scriptResults = extractFromScript(content, filePath, config)
    results.push(...scriptResults)
  }

  return results
}

/**
 * Detect raw strings in multiple files
 */
export async function detectRawStrings(
  files: string[],
  config: ExtractConfig,
): Promise<RawStringLocation[]> {
  const allResults: RawStringLocation[] = []

  for (const file of files) {
    try {
      const results = detectRawStringsInFile(file, config)
      allResults.push(...results)
    }
    catch (error) {
      console.warn(`Warning: Failed to process file ${file}:`, error)
    }
  }

  // Remove duplicates (same text)
  const seen = new Map<string, RawStringLocation>()
  const unique: RawStringLocation[] = []

  for (const result of allResults) {
    const key = result.text
    if (!seen.has(key)) {
      seen.set(key, result)
      unique.push(result)
    }
  }

  return unique
}
