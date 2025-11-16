# vue-translations-cleanup

[![npm version](https://img.shields.io/npm/v/vue-translations-cleanup.svg)](https://www.npmjs.com/package/vue-translations-cleanup)
[![License](https://img.shields.io/npm/l/vue-translations-cleanup.svg)](https://github.com/yourusername/vue-translations-cleanup/blob/main/LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3.x-brightgreen?logo=vue.js)](https://vuejs.org/)
[![Nuxt 3/4](https://img.shields.io/badge/Nuxt-3%20%7C%204-00DC82?logo=nuxt.js)](https://nuxt.com/)
[![vue-i18n](https://img.shields.io/badge/vue--i18n-supported-brightgreen)](https://vue-i18n.intlify.dev/)
[![@nuxtjs/i18n](https://img.shields.io/badge/@nuxtjs/i18n-supported-00DC82)](https://i18n.nuxtjs.org/)

A powerful CLI tool for Vue.js and Nuxt i18n projects:
1. **Clean up** unused translation keys
2. **Extract** raw strings and convert them to i18n automatically
3. **Auto-translate** to multiple languages with AI

## Quick Start

```bash
npm install --save-dev vue-translations-cleanup

# Remove unused translations
npx vue-translations-cleanup

# Extract raw strings to i18n
npx vue-translations-cleanup --extract
```

## Features

### Cleanup Mode (Default)
- Auto-detects source and translation paths (Nuxt 3/4, Vite, common conventions)
- Finds and removes unused translation keys
- Safe updates with automatic backups
- Supports both single files and entire directories

### Extract Mode
- Detects raw translatable strings in Vue templates and scripts
- Auto-generates semantic translation keys
- Replaces strings with i18n function calls
- Auto-injects imports when needed
- **AI-powered key naming** (optional)
- **Auto-translate to multiple languages** (optional, AI required)

## Basic Usage

### Cleanup unused translations
```bash
# Auto-detect everything
npx vue-translations-cleanup

# Manual paths
npx vue-translations-cleanup -t ./locales/en.json -s ./src

# Preview changes first
npx vue-translations-cleanup --dry-run --verbose
```

### Extract raw strings to i18n
```bash
# Auto-detect everything
npx vue-translations-cleanup --extract

# With config file for advanced features
npx vue-translations-cleanup --extract --config ./vue-translations-cleanup.config.ts
```

## Configuration

Create `vue-translations-cleanup.config.ts`:

```typescript
import type { ToolConfig } from 'vue-translations-cleanup'

export default {
  extract: {
    targetLanguage: 'en',
    keyFormat: 'snake_case',
    confidence: 'high',

    // Auto-translate to other languages (requires AI)
    autoTranslate: true,
    languages: ['de', 'fr', 'nl'],
  },

  // AI for key generation + auto-translation
  ai: {
    enabled: true,
    provider: 'ollama',  // or 'anthropic' | 'openai'
    model: 'codellama',
  },
} satisfies ToolConfig
```

## AI Setup (Optional)

### Local (Free)
```bash
# Install Ollama
# https://ollama.ai

# Pull a model
ollama pull codellama

# Enable in config
ai: {
  enabled: true,
  provider: 'ollama',
  model: 'codellama',
}
```

### Cloud (Paid)
```typescript
// Anthropic Claude
ai: {
  enabled: true,
  provider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY,
}

// OpenAI GPT
ai: {
  enabled: true,
  provider: 'openai',
  model: 'gpt-4',
  apiKey: process.env.OPENAI_API_KEY,
}
```

## Documentation

- **[Full Documentation](./docs)** - Comprehensive guides and examples
- **[Configuration Reference](./docs/configuration.md)** - All config options
- **[AI Setup Guide](./docs/ai-setup.md)** - Detailed AI provider setup
- **[Migration Guide](./docs/migration.md)** - Migrating legacy projects

## Requirements

- **Extract mode**: At least one existing i18n reference in your code
- **Auto-translation**: AI must be enabled
- **Frameworks**: Vue 3, Nuxt 3/4
- **i18n**: vue-i18n (Intlify), @nuxtjs/i18n

## Examples

### Before Extraction
```vue
<template>
  <button>Submit Form</button>
  <input placeholder="Enter your name">
</template>
```

### After Extraction
```vue
<template>
  <button>{{ $t('common.buttons.submit_form') }}</button>
  <input :placeholder="$t('common.inputs.enter_name')">
</template>
```

**With auto-translation enabled:**
- `en.json`: `{ "common": { "buttons": { "submit_form": "Submit Form" } } }`
- `de.json`: `{ "common": { "buttons": { "submit_form": "Formular absenden" } } }` ← AI translated
- `fr.json`: `{ "common": { "buttons": { "submit_form": "Soumettre le formulaire" } } }` ← AI translated

## CLI Options

```
Options:
  -t, --translation-file <path>  Translation file or directory (auto-detected)
  -s, --src-path <path>          Source files path (auto-detected)
  -c, --config <path>            Config file path
  --extract                      Enable extraction mode
  -n, --dry-run                  Preview changes without writing
  --no-backup                    Skip backup creation
  -v, --verbose                  Show detailed output
  -p, --pattern <glob>           Custom file pattern (default: **/*.{vue,js,ts})
```

## Compatibility

- **Vue 3**: Fully supported with [vue-i18n](https://vue-i18n.intlify.dev/)
- **Nuxt 3/4**: Fully supported with [@nuxtjs/i18n](https://i18n.nuxtjs.org/)
- May work with other i18n libraries using compatible APIs

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT

---

Made with ❤️ for the Vue.js community
