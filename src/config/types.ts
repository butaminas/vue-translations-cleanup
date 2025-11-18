export interface I18nCustomPattern {
  /**
   * Regex pattern to match the i18n import/usage
   * e.g., /const\s*{\s*t\s*}\s*=\s*useI18n\(\)/
   */
  pattern: RegExp | string
  /**
   * The function name used for translation
   * e.g., 't', 'translate', '$t'
   */
  functionName: string
  /**
   * Template for importing/injecting i18n in new files
   * e.g., "const { t } = useI18n()"
   */
  importTemplate: string
  /**
   * Optional: Where to inject the import (top of script, inside setup, etc.)
   */
  injectLocation?: 'script-setup' | 'script-top' | 'composable'
}

export interface ExtractConfig {
  /**
   * Target language for extracted strings
   * @default 'en'
   */
  targetLanguage?: string

  /**
   * Minimum confidence level for string detection
   * @default 'high'
   */
  confidence?: 'high' | 'medium' | 'low'

  /**
   * Custom i18n patterns to detect
   * Useful for project-specific i18n setups
   */
  i18nPatterns?: I18nCustomPattern[]

  /**
   * Additional HTML/Vue attributes to scan for translatable strings
   * @default ['placeholder', 'title', 'alt', 'label', 'aria-label']
   */
  includeAttributes?: string[]

  /**
   * Glob patterns to exclude from scanning
   * @default ['**\/*.spec.ts', '**\/*.test.ts', '**\/test\/**', '**\/__tests__\/**']
   */
  excludePatterns?: string[]

  /**
   * Key naming format
   * @default 'snake_case'
   */
  keyFormat?: 'snake_case' | 'camelCase' | 'kebab-case' | 'dot.case'

  /**
   * Maximum length for generated keys
   * @default 50
   */
  maxKeyLength?: number

  /**
   * Enable interactive mode for reviewing each replacement
   * @default false
   */
  interactive?: boolean

  /**
   * Regex pattern to ignore matching strings (e.g., icon names, symbols)
   * Example: '^(mdi-.*|[-#:()&]+)$' to ignore Material Design Icons and symbol-only strings
   */
  ignorePattern?: string

  /**
   * Specific strings to ignore (e.g., currency codes, keyboard keys, punctuation)
   * Example: ['EUR', 'USD', 'Shift', 'Esc', '(', ')', '.', ',']
   */
  ignoreText?: string[]
}

export interface AIConfig {
  /**
   * Enable AI-powered features
   * @default false
   */
  enabled?: boolean

  /**
   * AI provider
   * @default 'ollama'
   */
  provider?: 'ollama' | 'lmstudio' | 'localai' | 'anthropic' | 'openai' | 'custom'

  /**
   * Base URL for AI API
   * @default 'http://localhost:11434' for ollama
   */
  baseUrl?: string

  /**
   * AI model to use
   * @default 'codellama' for ollama
   */
  model?: string

  /**
   * API key (for cloud providers)
   */
  apiKey?: string

  /**
   * Custom headers for API requests
   */
  headers?: Record<string, string>

  /**
   * Request timeout in milliseconds
   * @default 30000
   */
  timeout?: number

  /**
   * Auto-translate extracted keys to multiple languages (e.g., ['de', 'fr', 'nl'])
   * Requires AI to be enabled (enabled: true)
   * The source language is determined by extract.targetLanguage
   * Leave empty or undefined to skip auto-translation
   * @default []
   */
  languages?: string[]
}

export interface CleanupConfig {
  /**
   * Create backup files before modifying
   * @default true
   */
  backup?: boolean

  /**
   * Show detailed output
   * @default false
   */
  verbose?: boolean

  /**
   * Preview changes without writing
   * @default false
   */
  dryRun?: boolean

  /**
   * File pattern to scan
   * @default '**\/*.{vue,js,ts,tsx,jsx}'
   */
  pattern?: string
}

export interface ToolConfig {
  /**
   * Path to translation file or directory
   * Optional - will auto-detect if not provided
   */
  translationFile?: string

  /**
   * Path to source files
   * Optional - will auto-detect if not provided
   */
  srcPath?: string

  /**
   * Extraction configuration
   */
  extract?: ExtractConfig

  /**
   * AI configuration
   */
  ai?: AIConfig

  /**
   * Cleanup configuration
   */
  cleanup?: CleanupConfig
}

/**
 * Type for config file exports
 * Supports both default export and named export
 */
export type ConfigFileExport = ToolConfig | { default: ToolConfig }
