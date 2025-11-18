export default {
  translationFile: './src/lang/translations/en.json',
  srcPath: './src',

  extract: {
    targetLanguage: 'en',
    confidence: 'high',
    keyFormat: 'snake_case',

    // Custom i18n pattern for your injectContext() usage
    i18nPatterns: [
      {
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
  },
}
