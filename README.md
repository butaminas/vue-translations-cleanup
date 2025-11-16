# vue-translations-cleanup

[![npm version](https://img.shields.io/npm/v/vue-translations-cleanup.svg)](https://www.npmjs.com/package/vue-translations-cleanup)
[![License](https://img.shields.io/npm/l/vue-translations-cleanup.svg)](https://github.com/yourusername/vue-translations-cleanup/blob/main/LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen?logo=vue.js)](https://vuejs.org/)
[![Nuxt 3/4](https://img.shields.io/badge/Nuxt-3%20%7C%204-00DC82?logo=nuxt.js)](https://nuxt.com/)
[![vue-i18n](https://img.shields.io/badge/vue--i18n-supported-brightgreen)](https://vue-i18n.intlify.dev/)
[![@nuxtjs/i18n](https://img.shields.io/badge/@nuxtjs/i18n-supported-00DC82)](https://i18n.nuxtjs.org/)

A powerful dual-purpose tool for Vue.js and Nuxt i18n projects that helps you:
1. **Clean up** unused translation keys (remove what's unused)
2. **Extract** raw strings and convert them to i18n automatically

Whether you're maintaining a mature i18n setup or migrating a legacy codebase, this tool has you covered.

## Features

### Cleanup Mode (Default)

- **Auto-detection and flexible targets:**
  - Runs with no flags and attempts to auto-detect your source and translations paths (supports Nuxt 3/4 with @nuxtjs/i18n, Vite + @intlify/unplugin-vue-i18n, and common folder conventions).
  - Accepts either a single JSON file or an entire directory of JSON files for bulk cleanup.

- **Advanced Translation Detection:**
  - Detects `t()`, `$t()`, `rt()`, `$rt()`, `tc()`, `$tc()` including Composition API (e.g. `useI18n().t()`), multi-line strings, and different quotes (single, double, template literals).
  - Supports bracket notation and normalizes it to dot notation.
  - Detects Vue template usages: `v-t` directive (string and object forms) and `<i18n-t>` component `keypath`/`path` (static and bound forms).

- **Safe & Reliable Updates:**
  - Automatically creates backup files before making changes (disable with `--no-backup`).
  - Dry-run mode to preview changes without writing.
  - Automatically prunes empty objects after deletions, including root-level empties.

### Extract Mode (NEW!)

- **Smart String Detection:**
  - Finds raw translatable strings in Vue templates and script sections
  - Uses heuristics to filter out URLs, hex colors, CSS classes, emails, etc.
  - Confidence levels (high/medium/low) to avoid false positives

- **AI-Powered Features (Optional):**
  - **Semantic key generation**: Context-aware translation key naming
  - **Auto-translation**: Automatically translate extracted keys to multiple languages
  - Local LLM support: Ollama, LM Studio, LocalAI
  - Cloud LLM support: Anthropic Claude, OpenAI GPT
  - Falls back to smart heuristic-based key generation when AI unavailable
  - Preserves placeholders and formatting in translations

- **Automatic Code Updates:**
  - Replaces raw strings with i18n function calls
  - Auto-injects imports (`const { t } = useI18n()`) when needed
  - Respects your existing i18n patterns (auto-detected)
  - Updates translation JSON files with new keys

- **Config File Support:**
  - TypeScript, ES Module, or JSON config files
  - Customize key format (snake_case, camelCase, kebab-case, dot.case)
  - Define custom i18n patterns for non-standard setups
  - Control which HTML attributes to extract

## Compatibility

- **Vue 3**: Fully supported with [vue-i18n](https://vue-i18n.intlify.dev/) (Intlify)
- **Nuxt 3/4**: Fully supported with [@nuxtjs/i18n](https://i18n.nuxtjs.org/)
- May also work with other i18n libraries that expose compatible APIs (e.g., `t`, `$t`, `rt`, `tc`) and similar usage patterns (including Composition API). However, only vue-i18n and @nuxtjs/i18n are explicitly supported and tested.

## Installation

```bash
# Using pnpm
pnpm add -D vue-translations-cleanup

# Using npm
npm install --save-dev vue-translations-cleanup

# Using yarn
yarn add -D vue-translations-cleanup
```

## Usage

### Cleanup Mode (Remove Unused Keys)

Run from the command line:

```bash
# Easiest: let the tool auto-detect paths
npx vue-translations-cleanup

# See what was detected (verbose)
npx vue-translations-cleanup --verbose

# Manual single-file mode
npx vue-translations-cleanup -t ./src/translations/en.json -s ./src

# Directory-wide cleanup
npx vue-translations-cleanup -t ./src/locales -s ./src

# Preview only (no writes)
npx vue-translations-cleanup --dry-run --verbose

# Skip backup creation
npx vue-translations-cleanup --no-backup
```

### Extract Mode (Convert Raw Strings to i18n)

```bash
# Extract with auto-detection
npx vue-translations-cleanup --extract

# Extract with config file
npx vue-translations-cleanup --extract --config ./vue-translations-cleanup.config.ts

# Preview extraction changes
npx vue-translations-cleanup --extract --dry-run --verbose

# Extract with manual paths
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src
```

**Important:** The extraction tool requires at least one existing i18n reference in your codebase to detect how your project uses i18n. If you're starting from scratch with i18n, add at least one reference first:

- **Vue 3 Composition API**: Add `const { t } = useI18n()` and use `t('key')` somewhere
- **Vue 3 Options API / Nuxt**: Use `{{ $t('key') }}` in a template
- **Custom setup**: Define your pattern in the config file (see below)

The tool scans your codebase to detect the i18n pattern you're using, then applies that same pattern when converting raw strings.

### Config File (Optional)

Create a config file for advanced customization:

**TypeScript** (`vue-translations-cleanup.config.ts`):
```typescript
import type { ToolConfig } from 'vue-translations-cleanup'

const config: ToolConfig = {
  // Paths (optional - will auto-detect if omitted)
  translationFile: './locales/en.json',
  srcPath: './src',

  // Extraction settings
  extract: {
    targetLanguage: 'en',
    confidence: 'high',           // 'high' | 'medium' | 'low'
    keyFormat: 'snake_case',      // 'snake_case' | 'camelCase' | 'kebab-case' | 'dot.case'
    maxKeyLength: 50,
    includeAttributes: ['placeholder', 'title', 'alt', 'label', 'aria-label'],
    excludePatterns: ['**/node_modules/**', '**/*.spec.ts'],

    // Auto-translate to other languages (requires AI enabled)
    autoTranslate: true,
    languages: ['de', 'fr', 'nl'], // Automatically translate extracted keys to these languages

    // Custom i18n patterns (for non-standard setups)
    i18nPatterns: [
      {
        pattern: /const\s*{\s*i18n:\s*{\s*t\s*}\s*}\s*=\s*injectContext\(\)/,
        functionName: 't',
        importTemplate: 'const { i18n: { t } } = injectContext()',
      },
    ],
  },

  // AI settings (optional)
  ai: {
    enabled: true,
    provider: 'ollama',           // 'ollama' | 'anthropic' | 'openai' | 'lmstudio' | 'localai'
    model: 'codellama',
    baseUrl: 'http://localhost:11434',
    timeout: 30000,
  },

  // Cleanup settings
  cleanup: {
    backup: true,
    pattern: '**/*.{vue,js,ts}',
  },
}

export default config
```

**JSON** (`vue-translations-cleanup.config.json`):
```json
{
  "extract": {
    "targetLanguage": "en",
    "confidence": "high",
    "keyFormat": "snake_case",
    "maxKeyLength": 50
  },
  "ai": {
    "enabled": true,
    "provider": "ollama",
    "model": "codellama"
  }
}
```

See [vue-translations-cleanup.config.example.ts](./vue-translations-cleanup.config.example.ts) for a complete example with all options.

### CLI Options

```
Options:
  -t, --translation-file <path>  Translation file or directory
  -s, --src-path <path>          Source files path
  -c, --config <path>            Config file path
  --extract                      Extract raw strings (instead of cleanup)
  -n, --dry-run                  Preview changes without writing
  --no-backup                    Skip backup creation
  -v, --verbose                  Show detailed output
  -p, --pattern <glob>           Custom file pattern
```

### Programmatic Usage

**Cleanup:**
```typescript
import { cleanupTranslations } from 'vue-translations-cleanup'

const result = await cleanupTranslations({
  translationFile: './src/translations/en.json',
  srcPath: './src',
  backup: true,    // default: true
  dryRun: false,   // default: false
  verbose: true,   // default: false
})

console.log('Unused translations:', result.unusedTranslations)
// result includes: totalKeys, usedKeys, unusedKeys, unusedTranslations, usedKeysSet, cleaned
```

**Extraction:**
```typescript
import { runExtraction } from 'vue-translations-cleanup/extract-strings'
import { validateConfig } from 'vue-translations-cleanup/config'

const config = validateConfig({
  extract: {
    targetLanguage: 'en',
    confidence: 'high',
    keyFormat: 'snake_case',
  },
})

const result = await runExtraction({
  translationFile: './locales/en.json',
  srcPath: './src',
  config,
  dryRun: false,
  verbose: true,
})

console.log(`Extracted ${result.totalExtracted} strings from ${result.filesModified.length} files`)
```

## How Extraction Works

When you run `--extract`, the tool follows this pipeline:

1. **Detect i18n patterns** - Scans your codebase to find existing i18n usage (e.g., `const { t } = useI18n()`)
2. **Find raw strings** - Uses AST parsing to find translatable strings in templates and scripts
3. **Generate keys** - Creates semantic translation keys based on context and file paths
4. **Replace code** - Updates your source files with i18n function calls
5. **Update translations** - Adds new keys to your translation JSON file

### Example Transformation

**Before:**
```vue
<template>
  <div>
    <h1>Welcome to our app</h1>
    <button>Click here to continue</button>
    <input placeholder="Enter your email" />
  </div>
</template>
```

**After:**
```vue
<template>
  <div>
    <h1>{{ t('welcome_component.welcome_to_our_app') }}</h1>
    <button>{{ t('welcome_component.click_here_to_continue') }}</button>
    <input :placeholder="t('welcome_component.placeholder')" />
  </div>
</template>

<script setup>
const { t } = useI18n()
</script>
```

**Translation file:**
```json
{
  "welcome_component": {
    "welcome_to_our_app": "Welcome to our app",
    "click_here_to_continue": "Click here to continue",
    "placeholder": "Enter your email"
  }
}
```

## AI-Powered Key Generation

For even better translation key naming, enable AI support:

### Using Ollama (Local, Free)

1. Install Ollama: https://ollama.ai
2. Pull a model: `ollama pull codellama`
3. Enable in config:

```typescript
{
  ai: {
    enabled: true,
    provider: 'ollama',
    model: 'codellama',
  }
}
```

### Using Cloud Providers

**Anthropic Claude:**
```typescript
{
  ai: {
    enabled: true,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
  }
}
```

**OpenAI GPT:**
```typescript
{
  ai: {
    enabled: true,
    provider: 'openai',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
  }
}
```

The AI analyzes the context (file path, component name, nearby code) to suggest better key names. If AI fails, it gracefully falls back to heuristic-based generation.

### Auto-Translation to Multiple Languages

When AI is enabled, you can automatically translate extracted keys to other languages:

```typescript
{
  extract: {
    targetLanguage: 'en',       // Source language
    autoTranslate: true,        // Enable auto-translation
    languages: ['de', 'fr', 'nl'], // Target languages
  },
  ai: {
    enabled: true,
    // ... AI configuration
  }
}
```

**How it works:**
1. Extracts raw strings from your code
2. Creates translation keys in the source language (e.g., `en.json`)
3. Automatically translates new keys to target languages (e.g., `de.json`, `fr.json`, `nl.json`)
4. Preserves existing translations (only translates new keys)
5. Maintains placeholders, HTML tags, and formatting

**Example workflow:**
```bash
# With auto-translation enabled, run extraction:
npx vue-translations-cleanup --extract

# Result:
# - locales/en.json: { "greeting": "Hello {name}" }
# - locales/de.json: { "greeting": "Hallo {name}" }  (auto-translated)
# - locales/fr.json: { "greeting": "Bonjour {name}" } (auto-translated)
```

**Benefits:**
- Saves time on initial translation setup
- Ensures consistent translation structure across languages
- Ideal for prototyping multilingual apps quickly
- Professional translators can review/refine AI translations later

**Note:** Without AI, auto-translation requires external services like Google Translate or DeepL APIs. Currently, only AI-based translation is supported out of the box.

## Notes & Limitations

### Cleanup Mode
- **JSON-only scope:** This tool currently edits JSON translation files only. You can pass a single JSON file or a directory containing multiple JSON files. It does not modify:
  - Vue SFC `<i18n>` blocks
  - TS/JS translation modules
  - Inline configuration (e.g., messages inside `createI18n`)
- **Dynamic/computed keys** (e.g., `t(variable)` or `:keypath="\`labels.\${type}.name\`"`) are not considered "used" to avoid false positives.

### Extract Mode
- **Requires i18n pattern detection:** The tool must detect at least one existing i18n reference in your code to understand how your project uses i18n (e.g., `const { t } = useI18n()` or `{{ $t('key') }}`). If starting fresh, add one reference first.
- **Requires single file:** Extract mode requires a specific translation file (not a directory)
- **Smart heuristics:** The tool uses heuristics to avoid extracting non-translatable strings, but review the changes in dry-run mode first
- **Backup recommended:** Always creates backups (unless `--no-backup` is used) - keep them until you verify the changes

## Behavior & Defaults

- `-t/--translation-file` and `-s/--src-path` are optional. If omitted, the tool attempts to auto-detect both paths.
- `-t` may be a single JSON file or a directory (cleanup mode only; extract mode requires a single file).
- Backups are created by default before writing changes; disable with `--no-backup`.
- Use `--dry-run` to preview changes without writing.
- Use `--verbose` for detailed logs.
- Source scanning covers `.{vue,ts,tsx,js,jsx,mjs,cjs}` files by default.

## Contributing

Contributions are welcome! If you have improvements or find issues, feel free to submit a Pull Request.

## License

MIT

---

Happy translating! 🌍
