# vue-translations-cleanup

[![npm version](https://img.shields.io/npm/v/vue-translations-cleanup.svg)](https://www.npmjs.com/package/vue-translations-cleanup)
[![License](https://img.shields.io/npm/l/vue-translations-cleanup.svg)](https://github.com/yourusername/vue-translations-cleanup/blob/main/LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen?logo=vue.js)](https://vuejs.org/)
[![Nuxt 3/4](https://img.shields.io/badge/Nuxt-3%20%7C%204-00DC82?logo=nuxt.js)](https://nuxt.com/)

A powerful CLI tool for Vue.js and Nuxt i18n projects:
- 🧹 **Cleanup Mode**: Remove unused translation keys
- 🔍 **Extract Mode**: Convert raw strings to i18n automatically
- 🤖 **AI-Powered**: Auto-translate to multiple languages (optional)

## Quick Start

```bash
# Install
npm install -D vue-translations-cleanup

# Remove unused translations
npx vue-translations-cleanup

# Extract raw strings to i18n (specify translation file)
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src
```

## Features

### Cleanup Mode
✅ Auto-detects Vue 3, Nuxt 3/4 projects
✅ Removes unused translation keys
✅ Supports nested keys and pruning
✅ Dry-run mode and automatic backups
✅ Directory mode for bulk cleanup

### Extract Mode (NEW in v2.0)
✅ Finds hardcoded translatable strings
✅ Generates semantic translation keys
✅ Replaces strings with i18n calls
✅ Auto-injects imports when needed
✅ AI-powered auto-translation (optional):
  - Translate extracted keys to multiple languages
  - Local (Ollama) or cloud (Claude, GPT) LLMs

## Examples

### Remove Unused Keys

```bash
# Auto-detect paths (Nuxt, Vue + Vite)
npx vue-translations-cleanup

# Specify paths manually
npx vue-translations-cleanup -t ./locales/en.json -s ./src

# Preview changes
npx vue-translations-cleanup --dry-run --verbose
```

**Before:**
```json
{
  "greeting": "Hello",
  "unused_key": "Never used",
  "common": {
    "submit": "Submit"
  }
}
```

**After:**
```json
{
  "greeting": "Hello",
  "common": {
    "submit": "Submit"
  }
}
```

### Extract Raw Strings

```bash
# Extract with explicit paths (recommended)
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src

# With config file (enables auto-detection and advanced features)
npx vue-translations-cleanup --extract --config ./my-config.ts
```

**Before:**
```vue
<template>
  <button>Submit</button>
  <input placeholder="Enter your name" />
</template>
```

**After:**
```vue
<template>
  <button>{{ t('common.submit') }}</button>
  <input :placeholder="t('form.name_placeholder')" />
</template>

<script setup>
const { t } = useI18n()
</script>
```

Translation file updated:
```json
{
  "common": {
    "submit": "Submit"
  },
  "form": {
    "name_placeholder": "Enter your name"
  }
}
```

## AI-Powered Auto-Translation

Automatically translate extracted keys to multiple languages:

```typescript
// vue-translations-cleanup.config.ts
export default {
  ai: {
    enabled: true,
    provider: 'ollama',  // or 'anthropic', 'openai'
    model: 'codellama',
    languages: ['de', 'fr', 'es']  // Auto-translate to these
  }
}
```

```bash
npx vue-translations-cleanup --extract
```

**Result:**
```
locales/en.json: { "greeting": "Hello" }
locales/de.json: { "greeting": "Hallo" }      ← AI translated
locales/fr.json: { "greeting": "Bonjour" }    ← AI translated
locales/es.json: { "greeting": "Hola" }       ← AI translated
```

## Configuration

Create `vue-translations-cleanup.config.ts` for advanced features:

```typescript
export default {
  extract: {
    targetLanguage: 'en',
    confidence: 'high',
    keyFormat: 'snake_case',  // or 'camelCase', 'kebab-case', 'dot.case'
  },
  ai: {
    enabled: true,
    provider: 'ollama',
    model: 'codellama',
    languages: ['de', 'fr'],  // Auto-translate
  },
}
```

See [full configuration reference](https://butaminas.github.io/vue-translations-cleanup/guide/config-file) in the documentation.

### Custom i18n Patterns

If your project uses custom i18n patterns, you can configure them using the `i18nPatterns` option:

```typescript
// vue-translations-cleanup.config.ts
export default {
  extract: {
    i18nPatterns: [
      {
        // The pattern to detect in existing code
        pattern: /const\s*{\s*i18n:\s*{\s*t\s*}\s*}\s*=\s*injectContext\(\)/,

        // The function name used for translations
        functionName: 't',

        // The usage pattern to inject (how to destructure the function)
        importTemplate: 'const { i18n: { t } } = injectContext()',

        // The import statement to add at the top of the file
        importStatement: "import { injectContext } from '@/plugins/context'",

        // Where to inject the code
        injectLocation: 'script-setup',
      }
    ]
  }
}
```

**How it works:**
1. **Auto-detection**: The tool scans your codebase using the `pattern` to find existing i18n usage
2. **Config-first approach**: If you provide `importStatement`, it uses that value explicitly
3. **Fallback**: If no `importStatement` is provided, the tool tries to auto-detect the import from your code
4. **Injection**: When extracting strings, it adds both the import and usage pattern to files that need it

**Before extraction:**
```vue
<template>
  <div>Welcome</div>
</template>
```

**After extraction (with custom pattern):**
```vue
<template>
  <div>{{ t('welcome') }}</div>
</template>

<script setup>
import { injectContext } from '@/plugins/context'

const { i18n: { t } } = injectContext()
</script>
```

## CLI Options

```bash
Options:
  -t, --translation-file <path>  Translation file or directory
  -s, --src-path <path>          Source files path
  -c, --config <path>            Config file path
  --extract                      Extract raw strings (instead of cleanup)
  -n, --dry-run                  Preview changes without writing
  --no-backup                    Skip backup creation
  -v, --verbose                  Show detailed output
  -h, --help                     Display help
```

## Compatibility

| Framework | Support | Version |
|-----------|---------|---------|
| Vue 3 | ✅ Full | 3.x |
| Nuxt 3 | ✅ Full | 3.x |
| Nuxt 4 | ✅ Full | 4.x |
| vue-i18n | ✅ Full | Intlify |
| @nuxtjs/i18n | ✅ Full | Latest |

Auto-detects:
- Nuxt 3/4 with `@nuxtjs/i18n`
- Vue 3 + Vite with `@intlify/unplugin-vue-i18n`
- Common project structures

## Documentation

📖 **[Full Documentation](https://butaminas.github.io/vue-translations-cleanup/)**

- [Getting Started](https://butaminas.github.io/vue-translations-cleanup/guide/getting-started)
- [Cleanup Mode Guide](https://butaminas.github.io/vue-translations-cleanup/guide/cleanup-mode)
- [Extract Mode Guide](https://butaminas.github.io/vue-translations-cleanup/guide/extract-mode)
- [AI Features](https://butaminas.github.io/vue-translations-cleanup/guide/ai-features)
- [Configuration](https://butaminas.github.io/vue-translations-cleanup/guide/config-file)
- [API Reference](https://butaminas.github.io/vue-translations-cleanup/api/cleanup)
- [Examples](https://butaminas.github.io/vue-translations-cleanup/examples/nuxt-3)

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT © [Mindaugas Kristutis](https://github.com/yourusername)

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for version history.
