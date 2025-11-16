---
layout: home

hero:
  name: vue-translations-cleanup
  text: Clean & Extract i18n
  tagline: Find unused translation keys and extract raw strings automatically for Vue.js and Nuxt projects
  image:
    src: /logo.svg
    alt: vue-translations-cleanup
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: View on GitHub
      link: https://github.com/yourusername/vue-translations-cleanup

features:
  - icon: 🧹
    title: Cleanup Unused Translations
    details: Automatically detect and remove unused translation keys from your JSON files. Supports nested keys and automatic backup.

  - icon: 🔍
    title: Extract Raw Strings
    details: Find hardcoded strings in your Vue templates and scripts, then convert them to i18n function calls automatically.

  - icon: 🤖
    title: AI-Powered Features
    details: Generate semantic translation keys and auto-translate to multiple languages using local or cloud AI providers.

  - icon: ⚡
    title: Framework Support
    details: Works with Vue 3, Nuxt 3, and Nuxt 4. Auto-detects your project structure and i18n configuration.

  - icon: 🎯
    title: Smart Detection
    details: Detects all i18n usage patterns - t(), $t(), useI18n(), v-t directive, and <i18n-t> component.

  - icon: 🛡️
    title: Safe & Reliable
    details: Dry-run mode, automatic backups, and comprehensive test coverage ensure your translations are safe.
---

## Quick Start

::: code-group

```bash [npm]
npx vue-translations-cleanup
```

```bash [yarn]
yarn dlx vue-translations-cleanup
```

```bash [pnpm]
pnpm dlx vue-translations-cleanup
```

:::

## Cleanup Example

Remove unused translation keys from your JSON files:

```bash
npx vue-translations-cleanup -t ./locales/en.json -s ./src
```

**Before:**
```json
{
  "greeting": "Hello",
  "unused_key": "This is never used",
  "common": {
    "submit": "Submit",
    "old_button": "Click"
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

## Extract Example

Convert raw strings to i18n automatically:

```bash
npx vue-translations-cleanup --extract
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

## AI-Powered Auto-Translation (Optional)

Extract strings and automatically translate to multiple languages using **local AI** (free & private):

**Setup** (one-time):
```bash
# Install Ollama (local AI)
curl https://ollama.ai/install.sh | sh

# Pull a model
ollama pull codellama
```

**Config** (`vue-translations-cleanup.config.ts`):
```typescript
export default {
  ai: {
    enabled: true,
    provider: 'ollama',  // Runs locally, 100% private
    model: 'codellama',
    languages: ['de', 'fr', 'es', 'nl']  // Auto-translate to these
  }
}
```

**Run extraction**:
```bash
npx vue-translations-cleanup --extract
```

**Result** - Automatically creates translated files:
```
✓ locales/en.json: { "greeting": "Hello {name}" }
✓ locales/de.json: { "greeting": "Hallo {name}" }     ← AI translated
✓ locales/fr.json: { "greeting": "Bonjour {name}" }   ← AI translated
✓ locales/es.json: { "greeting": "Hola {name}" }      ← AI translated
✓ locales/nl.json: { "greeting": "Hallo {name}" }     ← AI translated
```

::: tip Privacy-Focused
Ollama runs 100% locally on your machine. Your code and translations never leave your computer.
Cloud options (Anthropic Claude, OpenAI GPT) also available for better translation quality.
:::

## Why vue-translations-cleanup?

- **Zero Configuration**: Auto-detects Nuxt and Vue projects
- **Time Saver**: Automate tedious i18n cleanup and migration tasks
- **Privacy-Focused AI**: Free local LLMs (Ollama) or cloud options
- **Production Ready**: Used in production by multiple teams
- **Well Tested**: 176 passing tests with comprehensive coverage
- **TypeScript First**: Full type safety and IntelliSense support

## What's New in v2.0

- ✨ Extract Mode - Convert raw strings to i18n
- 🤖 AI-powered key generation and translation
- 🌍 Auto-translate to multiple languages
- 🎯 Nuxt 3 & Nuxt 4 support
- 📦 Config file support (.ts, .mjs, .json)
- 🔍 Advanced heuristics for string detection

[Get Started](/guide/getting-started){.vp-button}
