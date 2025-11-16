import type { ToolConfig } from './src/config/types'

/**
 * Example configuration file for vue-translations-cleanup
 *
 * Copy this file to your project root as:
 * - vue-translations-cleanup.config.ts (TypeScript)
 * - vue-translations-cleanup.config.mjs (ES Module)
 * - .vue-translations-cleanup.config.json (JSON)
 */
const config: ToolConfig = {
  // Optional: Paths (will auto-detect if not specified)
  // translationFile: './locales/en.json',
  // srcPath: './src',

  // Extraction configuration (for --extract mode)
  extract: {
    // Target language for extracted strings
    targetLanguage: 'en',

    // Minimum confidence level for detecting translatable strings
    // 'high' = strict (fewer false positives)
    // 'medium' = balanced
    // 'low' = permissive (more detections, more false positives)
    confidence: 'high',

    // Key naming format
    keyFormat: 'snake_case', // or 'camelCase', 'kebab-case', 'dot.case'

    // Maximum key length
    maxKeyLength: 50,

    // HTML/Vue attributes to scan for translatable text
    includeAttributes: [
      'placeholder',
      'title',
      'alt',
      'label',
      'aria-label',
      'aria-placeholder',
    ],

    // Patterns to exclude from scanning
    excludePatterns: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/*.spec.js',
      '**/*.test.js',
      '**/test/**',
      '**/__tests__/**',
      '**/node_modules/**',
    ],

    // Custom i18n patterns for your project
    // Useful for project-specific i18n setups
    i18nPatterns: [
      // Standard vue-i18n
      {
        pattern: /const\s*{\s*t\s*}\s*=\s*useI18n\(\)/,
        functionName: 't',
        importTemplate: 'const { t } = useI18n()',
        injectLocation: 'script-setup',
      },
      // Custom example: injectContext pattern
      // {
      //   pattern: /const\s*{\s*i18n:\s*{\s*t\s*}\s*}\s*=\s*injectContext\(\)/,
      //   functionName: 't',
      //   importTemplate: 'const { i18n: { t } } = injectContext()',
      //   injectLocation: 'script-setup',
      // },
    ],

    // Interactive mode - review each replacement
    interactive: false,
  },

  // AI configuration (optional, for better key generation and auto-translation)
  ai: {
    // Enable AI-powered features
    enabled: false,

    // AI provider
    // Local: 'ollama', 'lmstudio', 'localai'
    // Cloud: 'anthropic', 'openai'
    provider: 'ollama',

    // Base URL for AI API
    baseUrl: 'http://localhost:11434',

    // Model to use
    // Ollama: 'codellama', 'deepseek-coder', 'llama3'
    // Anthropic: 'claude-3-5-sonnet-20241022'
    // OpenAI: 'gpt-4'
    model: 'codellama',

    // API key (required for cloud providers)
    // apiKey: process.env.ANTHROPIC_API_KEY,

    // Request timeout (ms)
    timeout: 30000,

    // Custom headers (optional)
    // headers: {
    //   'X-Custom-Header': 'value',
    // },

    // Auto-translate extracted strings to multiple languages (e.g., ['de', 'fr', 'nl'])
    // Requires AI to be enabled (enabled: true)
    // The source language is determined by extract.targetLanguage (default: 'en')
    // Leave empty to skip auto-translation
    languages: [],
  },

  // Cleanup configuration (applies to both cleanup and extract modes)
  cleanup: {
    // Create backup files before modifying
    backup: true,

    // Show detailed output
    verbose: false,

    // Preview changes without writing
    dryRun: false,

    // File pattern to scan
    pattern: '**/*.{vue,js,ts,tsx,jsx,mjs,cjs}',
  },
}

export default config
