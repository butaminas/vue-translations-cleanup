# Nuxt 3 Example

Complete example for Nuxt 3 projects with @nuxtjs/i18n.

## Project Structure

```
my-nuxt3-app/
├── src/                    # or app/
│   ├── components/
│   ├── pages/
│   └── layouts/
├── locales/               # or i18n/locales/
│   ├── en.json
│   ├── de.json
│   └── fr.json
├── nuxt.config.ts
└── package.json
```

## Setup

### Install @nuxtjs/i18n

```bash
npm install @nuxtjs/i18n
```

### Configure Nuxt

```typescript
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],

  i18n: {
    locales: [
      { code: 'en', file: 'en.json' },
      { code: 'de', file: 'de.json' },
      { code: 'fr', file: 'fr.json' },
    ],
    defaultLocale: 'en',
    langDir: 'locales/',
  },
})
```

## Usage

### Step 1: Initialize Config

```bash
npx vue-translations-cleanup --init
```

Auto-detection finds:
- Source path: `./src` or `./app`
- Translations: `./locales` or `./i18n/locales`
- i18n pattern: Detects `$t()` from Nuxt config

### Step 2: Cleanup Mode

```bash
npx vue-translations-cleanup
```

### Step 3: Extract Mode

```bash
npx vue-translations-cleanup --extract
```

::: tip Manual Paths
If auto-detection doesn't work, see [CLI Options](/guide/cli-options) for manual path specification.
:::

## Example Workflow

### 1. Create Translation Files

```json
// locales/en.json
{
  "home": {
    "title": "Welcome"
  }
}
```

### 2. Use in Components

```vue
<!-- components/Header.vue -->
<template>
  <header>
    <h1>{{ $t('home.title') }}</h1>
    <nav>
      <NuxtLink to="/">{{ $t('nav.home') }}</NuxtLink>
      <NuxtLink to="/about">{{ $t('nav.about') }}</NuxtLink>
    </nav>
  </header>
</template>
```

### 3. Clean Up Unused Keys

```bash
npx vue-translations-cleanup --dry-run --verbose
```

### 4. Extract Raw Strings

Add hardcoded strings:

```vue
<!-- pages/contact.vue -->
<template>
  <div>
    <h1>Contact Us</h1>
    <button>Send Message</button>
  </div>
</template>
```

Extract them:

```bash
npx vue-translations-cleanup --extract
```

Result:

```vue
<template>
  <div>
    <h1>{{ $t('contact.title') }}</h1>
    <button>{{ $t('common.send_message') }}</button>
  </div>
</template>
```

## With AI Translation

### Config File

```typescript
// vue-translations-cleanup.config.ts
export default {
  translationFile: './locales/en.json',
  srcPath: './src',

  extract: {
    targetLanguage: 'en',
  },

  ai: {
    enabled: true,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
    languages: ['de', 'fr'],
  },
}
```

### Run Extraction

```bash
export ANTHROPIC_API_KEY=sk-ant-...
npx vue-translations-cleanup --extract --config ./vue-translations-cleanup.config.ts
```

Creates:
- `locales/en.json` - English (extracted)
- `locales/de.json` - German (auto-translated)
- `locales/fr.json` - French (auto-translated)

## CI/CD Integration

```yaml
# .github/workflows/i18n-check.yml
name: Check i18n

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Check for unused translations
        run: |
          npx vue-translations-cleanup --dry-run
          if [ $? -ne 0 ]; then
            echo "Found unused translations!"
            exit 1
          fi
```

## Next Steps

- [Nuxt 4 Example](/examples/nuxt-4)
- [AI Features](/guide/ai-features)
- [Config Reference](/guide/config-file)
