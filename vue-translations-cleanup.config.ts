export default {
  // Path to your source translation file (English in this case)
  translationFile: './src/lang/translations/en.json',

  // Path to scan for source files
  srcPath: './src',

  extract: {
    // Source language of your app
    targetLanguage: 'en',

    // Minimum confidence level for auto-detecting translatable strings
    // 'high' = only very likely translatable strings (safest)
    // 'medium' = includes somewhat likely strings
    // 'low' = includes borderline cases (may have false positives)
    confidence: 'high',

    // Format for generated translation keys
    keyFormat: 'snake_case', // Options: 'snake_case', 'camelCase', 'kebab-case', 'dot.case'

    // Maximum length for generated keys (truncates if longer)
    maxKeyLength: 50,

    // =====================================================================
    // CUSTOM i18n PATTERNS
    // =====================================================================
    // Built-in patterns are ALWAYS checked (no need to define them):
    //   - const { t } = useI18n()
    //   - this.$t(...)
    //   - $t(...) in templates
    //   - i18n.t(...)
    //
    // Only define custom patterns for project-specific i18n setups.
    // =====================================================================

    i18nPatterns: [
      {
        // Custom pattern for injectContext() usage in your project
        // Matches all these cases:
        // - const { i18n: { t } } = injectContext()
        // - const { comms: { context, toolbar }, i18n: { t } } = injectContext()
        // - const { i18n: { t }, colorMode } = injectContext()
        pattern: /const\s*\{(?:[^{}]*\{[^}]*\}[^,]*,\s*)*[^{}]*i18n\s*:\s*\{\s*t\s*\}[^}]*\}\s*=\s*injectContext\(\)/g,
        functionName: 't',
        importTemplate: 'const { i18n: { t } } = injectContext()',
        injectLocation: 'script-setup',
      },
    ],

    // Additional HTML attributes to scan for translatable strings
    includeAttributes: ['placeholder', 'title', 'alt', 'label', 'aria-label'],

    // Patterns to exclude from scanning (test files, etc.)
    excludePatterns: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/test/**',
      '**/__tests__/**',
    ],
  },

  // AI-powered features (optional)
  ai: {
    enabled: false, // Set to true to enable AI features

    // Uncomment and configure if using AI:
    // provider: 'ollama',        // Local AI (free, private)
    // model: 'codellama',
    // baseUrl: 'http://localhost:11434',

    // OR for cloud providers:
    // provider: 'anthropic',
    // model: 'claude-3-5-sonnet-20241022',
    // apiKey: process.env.ANTHROPIC_API_KEY,

    // Auto-translate to multiple languages (requires AI enabled):
    // languages: ['de', 'fr', 'es', 'nl'],
  },

  // Cleanup mode settings (when running without --extract)
  cleanup: {
    backup: true,  // Create .backup files before modifying
    pattern: '**/*.{vue,js,ts,tsx,jsx}',
  },
}
