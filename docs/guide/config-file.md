# Configuration File

Create a config file for advanced customization and project-specific settings.

## Supported Formats

Create a config file in your project root:

- **TypeScript**: `vue-translations-cleanup.config.ts`
- **ES Module**: `vue-translations-cleanup.config.mjs`
- **JSON**: `vue-translations-cleanup.config.json`

## Basic Example

```typescript
// vue-translations-cleanup.config.ts
import type { ToolConfig } from 'vue-translations-cleanup'

export default {
  // Optional: specify paths (auto-detected by default)
  // Use directory for translations - file determined by targetLanguage
  translationFile: './locales',
  srcPath: './src',

  // Extraction settings
  extract: {
    targetLanguage: 'en',
    keyFormat: 'snake_case',
    maxKeyLength: 50,
  },

  // AI configuration (optional)
  ai: {
    enabled: false,
  },

  // Global options
  backup: true,
  verbose: false,
  dryRun: false,
} satisfies ToolConfig
```

## Full Configuration Reference

See [vue-translations-cleanup.config.example.ts](https://github.com/butaminas/vue-translations-cleanup/blob/main/vue-translations-cleanup.config.example.ts) for a complete example with all available options and detailed comments.

## Extract Configuration

```typescript
extract: {
  // Target language for extracted strings (determines which file to update)
  targetLanguage: 'en',

  // Key naming format
  keyFormat: 'snake_case', // 'snake_case' | 'camelCase' | 'kebab-case' | 'dot.case'

  // Maximum key length
  maxKeyLength: 50,

  // Attributes to scan for translatable text
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
    '**/test/**',
    '**/__tests__/**',
  ],

  // Regex pattern to ignore matching strings
  ignorePattern: '^(mdi-.*|fa-.*)$',

  // Specific strings to ignore
  ignoreText: ['EUR', 'USD', '.', ','],

  // Custom i18n patterns (only needed for non-standard setups)
  i18nPatterns: [
    {
      pattern: /const\s*{\s*t\s*}\s*=\s*useI18n\(\)/,
      functionName: 't',
      importTemplate: 'const { t } = useI18n()',
      importStatement: "import { useI18n } from 'vue-i18n'",
      injectLocation: 'script-setup',
    },
  ],
}
```

## AI Configuration

```typescript
ai: {
  // Enable AI features
  enabled: true,

  // Provider
  provider: 'ollama', // 'ollama' | 'anthropic' | 'openai' | 'lmstudio' | 'localai' | 'custom'

  // Base URL
  baseUrl: 'http://localhost:11434',

  // Model name
  model: 'codellama',

  // API key (for cloud providers)
  apiKey: process.env.ANTHROPIC_API_KEY,

  // Timeout in milliseconds
  timeout: 30000,

  // Custom headers
  headers: {
    'X-Custom-Header': 'value',
  },

  // Auto-translate to multiple languages (leave empty to skip)
  languages: ['de', 'fr', 'es'],
}
```

## Global Options

These options apply to both cleanup and extract modes:

```typescript
{
  // Create backup files before modifying
  backup: true,

  // Show detailed output
  verbose: false,

  // Preview without writing
  dryRun: false,
}
```

## Cleanup Configuration

```typescript
cleanup: {
  // File pattern to scan (cleanup mode only)
  pattern: '**/*.{vue,js,ts,tsx,jsx,mjs,cjs}',
}
```

## Usage

```bash
# Auto-detect config file
npx vue-translations-cleanup --extract

# Specify config file
npx vue-translations-cleanup --config ./my-config.ts
```

## Environment Variables

Use environment variables for sensitive data:

```typescript
export default {
  ai: {
    enabled: true,
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
}
```

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npx vue-translations-cleanup --extract
```

## TypeScript Support

Import types for full IntelliSense:

```typescript
import type { ToolConfig } from 'vue-translations-cleanup'

const config: ToolConfig = {
  // Full type safety and autocomplete
}

export default config
```

## Next Steps

- [CLI Options](/guide/cli-options) - Command-line flags
- [Examples](/examples/nuxt-3) - Real-world configurations
