import fs from 'node:fs'
import { parse as parseVueSFC } from '@vue/compiler-sfc'
import type { AttributeNode, ElementNode, InterpolationNode, SimpleExpressionNode, TemplateChildNode, TextNode } from '@vue/compiler-core'
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
  if (!trimmed || /^[\r\n\s\t\f\v]+$/.test(text)) {
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
      return { translatable: true, confidence: 'high' } // UI labels are clearly translatable
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
 * Check if an expression is an i18n function call
 */
function isI18nCall(expr: SimpleExpressionNode | InterpolationNode): boolean {
  if (!expr || typeof expr === 'string')
    return false

  // For interpolations, check the content
  if (expr.type === 5) { // InterpolationNode
    const content = expr.content
    if (content.type === 4) { // SimpleExpressionNode
      const code = content.content
      // Check if it's an i18n call: t(...), $t(...), etc.
      return /^\s*\$?t\s*\(/.test(code)
    }
  }

  // For simple expressions, check the content directly
  if (expr.type === 4) { // SimpleExpressionNode
    const code = expr.content
    return /^\s*\$?t\s*\(/.test(code)
  }

  return false
}

/**
 * Walk the template AST and extract raw text nodes
 */
function walkTemplateAST(
  node: TemplateChildNode | ElementNode,
  filePath: string,
  config: ExtractConfig,
  results: RawStringLocation[],
): void {
  const minConfidence = config.confidence || 'high'
  const confidenceLevels = { high: 3, medium: 2, low: 1 }

  // Handle text nodes
  if (node.type === 2) { // TextNode
    const textNode = node as TextNode
    const text = textNode.content
    const analysis = isLikelyTranslatable(text, minConfidence)

    if (analysis.translatable && confidenceLevels[analysis.confidence] >= confidenceLevels[minConfidence]) {
      results.push({
        text: text.trim(),
        file: filePath,
        line: textNode.loc.start.line,
        column: textNode.loc.start.column,
        context: 'template',
        confidence: analysis.confidence,
      })
    }
  }

  // Handle interpolations - check if they're NOT i18n calls
  if (node.type === 5) { // InterpolationNode
    const interpNode = node as InterpolationNode
    // Skip if it's an i18n call
    if (!isI18nCall(interpNode)) {
      // This is a variable reference like {{ someVar }}
      // We don't extract these
    }
  }

  // Handle element nodes
  if (node.type === 1) { // ElementNode
    const element = node as ElementNode

    // Check attributes for translatable text
    const includeAttributes = config.includeAttributes || ['text', 'placeholder', 'title', 'alt', 'label', 'aria-label']

    for (const attr of element.props) {
      if (attr.type === 6) { // AttributeNode (static attribute)
        const attrNode = attr as AttributeNode

        // Only check configured attributes
        if (includeAttributes.includes(attrNode.name)) {
          const value = attrNode.value?.content
          if (value) {
            const analysis = isLikelyTranslatable(value, minConfidence)

            if (analysis.translatable && confidenceLevels[analysis.confidence] >= confidenceLevels[minConfidence]) {
              results.push({
                text: value.trim(),
                file: filePath,
                line: attrNode.loc.start.line,
                column: attrNode.loc.start.column,
                context: 'attribute',
                attributeName: attrNode.name,
                confidence: analysis.confidence,
              })
            }
          }
        }
      }
      // Skip directives (type 7) - those are dynamic bindings like :title or v-bind:title
    }

    // Recursively walk child nodes
    if (element.children) {
      for (const child of element.children) {
        walkTemplateAST(child, filePath, config, results)
      }
    }
  }
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
  const stringRegex = /(['"`])(?:(?=(\\?))\2.)*?\1/g
  let match: RegExpExecArray | null

  while ((match = stringRegex.exec(scriptContent)) !== null) {
    const fullMatch = match[0]
    const text = fullMatch.slice(1, -1) // Remove quotes

    // Skip if it's already in an i18n call
    // Look back up to 50 chars to check for t( or $t(
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
 * Detect raw strings in a Vue file using proper AST parsing
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

      // Extract from template using AST walking
      if (descriptor.template) {
        const templateAST = descriptor.template.ast
        if (templateAST && templateAST.children) {
          for (const child of templateAST.children) {
            walkTemplateAST(child, filePath, config, results)
          }
        }
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
