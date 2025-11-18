import type { AIConfig, CleanupConfig, ExtractConfig, I18nCustomPattern, ToolConfig } from './types'

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<ToolConfig> = {
  translationFile: '',
  srcPath: '',
  extract: {
    targetLanguage: 'en',
    confidence: 'high',
    i18nPatterns: [],
    includeAttributes: ['text', 'placeholder', 'title', 'alt', 'label', 'aria-label', 'aria-placeholder', 'aria-roledescription', 'aria-valuetext', 'confirm-text'],
    excludePatterns: ['**/*.spec.ts', '**/*.test.ts', '**/*.spec.js', '**/*.test.js', '**/test/**', '**/__tests__/**'],
    keyFormat: 'snake_case',
    maxKeyLength: 50,
    interactive: false,
    // Based on vue-i18n ESLint plugin best practices
    ignorePattern: '^(mdi-.*|fa-.*|icon-.*|[-#:()&]+)$',
    ignoreText: ['EUR', 'USD', 'GBP', 'HKD', 'Shift', 'Esc', 'esc', 'Enter', 'Tab', 'Space', '404', '(', ')', ',', '.', '&', '+', '-', '=', '*', '/', '#', '%', '!', '?', ':', '[', ']', '{', '}', '<', '>', '|'],
  },
  ai: {
    enabled: false,
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'codellama',
    timeout: 30000,
  },
  cleanup: {
    backup: true,
    verbose: false,
    dryRun: false,
    pattern: '**/*.{vue,js,ts,tsx,jsx,mjs,cjs}',
  },
}

/**
 * Validate i18n custom pattern
 */
function validateI18nPattern(pattern: I18nCustomPattern, index: number): void {
  if (!pattern.pattern) {
    throw new Error(`extract.i18nPatterns[${index}].pattern is required`)
  }

  if (!pattern.functionName || typeof pattern.functionName !== 'string') {
    throw new Error(`extract.i18nPatterns[${index}].functionName must be a non-empty string`)
  }

  if (!pattern.importTemplate || typeof pattern.importTemplate !== 'string') {
    throw new Error(`extract.i18nPatterns[${index}].importTemplate must be a non-empty string`)
  }

  // Convert string patterns to RegExp
  if (typeof pattern.pattern === 'string') {
    try {
      pattern.pattern = new RegExp(pattern.pattern)
    }
    catch (error) {
      throw new Error(
        `extract.i18nPatterns[${index}].pattern is not a valid regex: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }
}

/**
 * Validate extract configuration
 */
function validateExtractConfig(config: ExtractConfig): void {
  if (config.confidence && !['high', 'medium', 'low'].includes(config.confidence)) {
    throw new Error('extract.confidence must be one of: high, medium, low')
  }

  if (config.keyFormat && !['snake_case', 'camelCase', 'kebab-case', 'dot.case'].includes(config.keyFormat)) {
    throw new Error('extract.keyFormat must be one of: snake_case, camelCase, kebab-case, dot.case')
  }

  if (config.maxKeyLength !== undefined && (typeof config.maxKeyLength !== 'number' || config.maxKeyLength <= 0)) {
    throw new Error('extract.maxKeyLength must be a positive number')
  }

  if (config.i18nPatterns) {
    if (!Array.isArray(config.i18nPatterns)) {
      throw new Error('extract.i18nPatterns must be an array')
    }
    config.i18nPatterns.forEach((pattern, index) => validateI18nPattern(pattern, index))
  }

  if (config.includeAttributes && !Array.isArray(config.includeAttributes)) {
    throw new Error('extract.includeAttributes must be an array of strings')
  }

  if (config.excludePatterns && !Array.isArray(config.excludePatterns)) {
    throw new Error('extract.excludePatterns must be an array of strings')
  }

  if (config.ignorePattern && typeof config.ignorePattern !== 'string') {
    throw new Error('extract.ignorePattern must be a string (regex pattern)')
  }

  if (config.ignoreText) {
    if (!Array.isArray(config.ignoreText)) {
      throw new Error('extract.ignoreText must be an array of strings')
    }
    if (!config.ignoreText.every(item => typeof item === 'string')) {
      throw new Error('extract.ignoreText must contain only strings')
    }
  }
}

/**
 * Validate AI configuration
 */
function validateAIConfig(config: AIConfig): void {
  const validProviders = ['ollama', 'lmstudio', 'localai', 'anthropic', 'openai', 'custom']
  if (config.provider && !validProviders.includes(config.provider)) {
    throw new Error(`ai.provider must be one of: ${validProviders.join(', ')}`)
  }

  if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
    throw new Error('ai.timeout must be a positive number')
  }

  // Warn about missing API key for cloud providers
  if (config.enabled && ['anthropic', 'openai'].includes(config.provider || '')) {
    if (!config.apiKey) {
      console.warn(`Warning: ai.apiKey is required for provider "${config.provider}"`)
    }
  }
}

/**
 * Validate cleanup configuration
 */
function validateCleanupConfig(config: CleanupConfig): void {
  if (config.backup !== undefined && typeof config.backup !== 'boolean') {
    throw new Error('cleanup.backup must be a boolean')
  }

  if (config.verbose !== undefined && typeof config.verbose !== 'boolean') {
    throw new Error('cleanup.verbose must be a boolean')
  }

  if (config.dryRun !== undefined && typeof config.dryRun !== 'boolean') {
    throw new Error('cleanup.dryRun must be a boolean')
  }

  if (config.pattern && typeof config.pattern !== 'string') {
    throw new Error('cleanup.pattern must be a string')
  }
}

/**
 * Validate and normalize configuration
 */
export function validateConfig(config: ToolConfig): void {
  if (config.extract) {
    validateExtractConfig(config.extract)
  }

  if (config.ai) {
    validateAIConfig(config.ai)
  }

  if (config.cleanup) {
    validateCleanupConfig(config.cleanup)
  }
}

/**
 * Merge configuration with defaults
 * Deep merge that preserves user values
 */
export function mergeWithDefaults(config: ToolConfig): Required<ToolConfig> {
  return {
    translationFile: config.translationFile || DEFAULT_CONFIG.translationFile,
    srcPath: config.srcPath || DEFAULT_CONFIG.srcPath,
    extract: {
      ...DEFAULT_CONFIG.extract,
      ...config.extract,
      // Ensure arrays are properly merged (user values override defaults)
      i18nPatterns: config.extract?.i18nPatterns || DEFAULT_CONFIG.extract.i18nPatterns,
      includeAttributes: config.extract?.includeAttributes || DEFAULT_CONFIG.extract.includeAttributes,
      excludePatterns: config.extract?.excludePatterns || DEFAULT_CONFIG.extract.excludePatterns,
      ignoreText: config.extract?.ignoreText || DEFAULT_CONFIG.extract.ignoreText,
      ignorePattern: config.extract?.ignorePattern || DEFAULT_CONFIG.extract.ignorePattern,
    },
    ai: {
      ...DEFAULT_CONFIG.ai,
      ...config.ai,
      headers: config.ai?.headers,
    },
    cleanup: {
      ...DEFAULT_CONFIG.cleanup,
      ...config.cleanup,
    },
  }
}
