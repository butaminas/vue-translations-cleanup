import fs from 'node:fs'
import { parse as parseVueSFC } from '@vue/compiler-sfc'
import type { AttributeNode, ElementNode, InterpolationNode, SimpleExpressionNode, TemplateChildNode, TextNode } from '@vue/compiler-core'
import type { ExtractConfig } from '../config/types'
import type { RawStringLocation } from './types'

/**
 * Common UI words that should always be considered translatable
 * These are words commonly used in buttons, labels, and UI elements
 */
const COMMON_UI_WORDS = new Set([
  // Actions
  'save', 'cancel', 'submit', 'delete', 'remove', 'edit', 'update', 'create', 'add',
  'close', 'open', 'back', 'next', 'previous', 'finish', 'done', 'apply', 'reset',
  'search', 'filter', 'sort', 'clear', 'refresh', 'reload', 'export', 'import',
  'upload', 'download', 'print', 'share', 'copy', 'paste', 'cut', 'undo', 'redo',
  'yes', 'no', 'ok', 'okay', 'confirm', 'continue', 'skip', 'retry', 'help',
  // Form labels
  'name', 'email', 'password', 'username', 'phone', 'address', 'city', 'country',
  'description', 'title', 'message', 'comment', 'notes', 'subject', 'category',
  'status', 'type', 'date', 'time', 'price', 'amount', 'quantity', 'total',
  // UI elements
  'label', 'placeholder', 'loading', 'error', 'warning', 'success', 'info',
  'required', 'optional', 'disabled', 'enabled', 'active', 'inactive',
  'welcome', 'hello', 'goodbye', 'thanks', 'please', 'sorry',
])

/**
 * Heuristics to determine if a string is likely translatable
 */
function isLikelyTranslatable(text: string, config?: ExtractConfig): {
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

  // Check user-provided ignore list (exact matches)
  if (config?.ignoreText && config.ignoreText.includes(trimmed)) {
    return { translatable: false, confidence: 'high', reason: 'in ignoreText list' }
  }

  // Check user-provided ignore pattern (regex)
  if (config?.ignorePattern) {
    try {
      const ignoreRegex = new RegExp(config.ignorePattern)
      if (ignoreRegex.test(trimmed)) {
        return { translatable: false, confidence: 'high', reason: 'matches ignorePattern' }
      }
    }
    catch (error) {
      console.warn(`Warning: Invalid ignorePattern regex: ${config.ignorePattern}`)
    }
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

  // CSS properties and values - be more specific to avoid false positives
  // Only filter if it looks like actual CSS: "property: value" or "property: value;"
  // But NOT user-facing text like "Name: John" or "Price: $99"
  if (/^[a-z-]+:\s*[a-z0-9#%().,\s-]+;?$/i.test(trimmed) && !trimmed.includes(' ')) {
    return { translatable: false, confidence: 'high', reason: 'CSS code' }
  }

  // CSS class lists (multiple space-separated CSS classes like Tailwind)
  // e.g., "container mx-auto px-4" or "text-red-500 font-bold"
  if (/\s/.test(trimmed) && trimmed.split(/\s+/).every(word => /^[a-z][a-z0-9_-]*$/i.test(word))) {
    const words = trimmed.split(/\s+/)
    const cssLikeWords = words.filter(w => w.includes('-') || /^[a-z]+\d+$/.test(w))
    // If most words look like CSS classes, filter it out
    if (cssLikeWords.length >= words.length / 2) {
      return { translatable: false, confidence: 'high', reason: 'CSS class list' }
    }
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
    // Strip trailing punctuation for checking
    const wordOnly = trimmed.replace(/[.!?:,;]+$/, '').toLowerCase()
    const lowerTrimmed = trimmed.toLowerCase()

    // Check if it's a common UI word (case-insensitive, with or without punctuation)
    if (COMMON_UI_WORDS.has(wordOnly)) {
      return { translatable: true, confidence: 'high', reason: 'common UI word' }
    }

    // Words ending with ellipsis are likely loading/action states (e.g., "Processing...")
    if (/^[A-Z][a-z]+\.{3}$/.test(trimmed) || /^[A-Z][a-z]+…$/.test(trimmed)) {
      return { translatable: true, confidence: 'high', reason: 'loading/action state' }
    }

    // Allow normal capitalized words (UI labels like "Save", "Cancel", "Edit")
    // Also allow words ending with common punctuation
    if (/^[A-Z][a-z]+[.!?:,;]*$/.test(trimmed) && wordOnly.length >= 3) {
      return { translatable: true, confidence: 'high', reason: 'capitalized UI label' }
    }

    // Filter out lowercase-only single words (variable names, CSS classes)
    if (trimmed === lowerTrimmed && !trimmed.includes('.')) {
      return { translatable: false, confidence: 'medium', reason: 'lowercase single word (not in UI word list)' }
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
  // Handle text nodes
  if (node.type === 2) { // TextNode
    const textNode = node as TextNode
    const text = textNode.content
    const analysis = isLikelyTranslatable(text, config)

    if (analysis.translatable) {
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
            const analysis = isLikelyTranslatable(value, config)

            if (analysis.translatable) {
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

      // Extract from template using AST walking (ONLY templates, not scripts!)
      if (descriptor.template) {
        const templateAST = descriptor.template.ast
        if (templateAST && templateAST.children) {
          for (const child of templateAST.children) {
            walkTemplateAST(child, filePath, config, results)
          }
        }
      }

      // NOTE: We intentionally do NOT extract from script sections!
      // Script strings are usually NOT user-facing text (imports, API endpoints, etc.)
      // This matches the behavior of eslint-plugin-vue-i18n/no-raw-text
    }
    catch (error) {
      console.warn(`Warning: Failed to parse Vue file ${filePath}:`, error)
    }
  }
  // For non-Vue files (TS/JS), we don't extract strings at all
  // These are code files, not templates, so strings are rarely user-facing text

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
