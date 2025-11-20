# Getting Started

Get up and running with vue-translations-cleanup in minutes.

## Installation

No installation required! Use `npx`, `yarn dlx`, or `pnpm dlx`:

::: code-group

```bash [npx]
npx vue-translations-cleanup
```

```bash [yarn]
yarn dlx vue-translations-cleanup
```

```bash [pnpm]
pnpm dlx vue-translations-cleanup
```

:::

Or install globally:

::: code-group

```bash [npm]
npm install -g vue-translations-cleanup
```

```bash [yarn]
yarn global add vue-translations-cleanup
```

```bash [pnpm]
pnpm add -g vue-translations-cleanup
```

:::

## Quick Start

### Step 1: Generate Config (Optional but Recommended)

Run `--init` to auto-detect your project setup and generate a config file:

```bash
npx vue-translations-cleanup --init
```

**What happens:**
- Detects your i18n framework (@nuxtjs/i18n or vue-i18n)
- Finds your translation files and source directories
- Detects your default locale (e.g., 'en')
- Creates `vue-translations-cleanup.config.ts` with recommended settings

**Output:**
```
=== Config Generator ===

ℹ Detecting project configuration...
  Translation directory: ./locales
  Source path: ./app
  Default locale: en
  i18n config: nuxt (using $t)

✓ Config file created: vue-translations-cleanup.config.ts

You can now run:
  npx vue-translations-cleanup            # cleanup mode
  npx vue-translations-cleanup --extract  # extract mode
  npx vue-translations-cleanup --translate # translate mode (requires AI)
```

::: tip When to skip --init
You can skip `--init` if you just want to run cleanup mode with auto-detection.
The tool will auto-detect your paths without needing a config file.
:::

### Step 2: Cleanup Mode (Default)

Remove unused translation keys from your JSON files:

```bash
# Auto-detect paths (works without config file)
npx vue-translations-cleanup

# Or specify paths manually
npx vue-translations-cleanup -t ./locales/en.json -s ./src

# Preview changes first (recommended)
npx vue-translations-cleanup --dry-run --verbose
```

**What happens:**
- Scans all your Vue/JS/TS files for translation function calls ($t, t, etc.)
- Compares against keys in your translation JSON file
- Removes keys that are never used
- Creates a backup file (.backup) before making changes

**Output:**
```
ℹ Found 7 unused translation keys out of 45 total keys

Unused translations:
  - old.feature.title
  - deprecated.button
  - test.debug.log
  ...

✓ Cleaned translations saved to: /project/locales/en.json
✓ Backup created: /project/locales/en.json.backup
```

### Step 3: Extract Mode (Optional)

Convert hardcoded strings to i18n function calls:

```bash
# With config file (recommended - uses targetLanguage setting)
npx vue-translations-cleanup --extract

# Or specify translation file directly
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src

# Preview changes first
npx vue-translations-cleanup --extract --dry-run --verbose
```

**What happens:**
- Scans your Vue templates and scripts for hardcoded strings
- Generates semantic translation keys (e.g., "Submit" → "common.submit")
- Replaces strings with i18n calls (e.g., `$t('common.submit')`)
- Auto-injects imports when needed
- Updates your translation JSON file with new keys

::: tip Translation Directory Support
When using a config file, you can specify a directory (e.g., `./locales`) instead of a specific file.
The tool uses `extract.targetLanguage` from your config to determine which file to update (e.g., `en` → `locales/en.json`).

Without a config file, you must specify a specific translation file (e.g., `-t ./locales/en.json`).
:::

**Output:**
```
=== String Extraction Mode ===

[1/5] Detecting i18n usage patterns...
  Found 3 i18n patterns
  Recommended pattern: useI18n

[2/5] Scanning for source files...
  Found 42 files to scan

[3/5] Detecting raw translatable strings...
  Detected 18 translatable strings

[4/5] Generating translation keys...
  Generated 18 unique keys

[5/5] Replacing strings in files...
  LoginForm.vue: 3 replacements (import added)
  UserProfile.vue: 5 replacements
  Header.vue: 2 replacements

✓ Files scanned: 42
✓ Strings extracted: 18
✓ Files modified: 8
```

### Step 4: Translate Mode (Optional)

Automatically translate missing or untranslated keys to multiple languages using AI:

```bash
# Requires config file with AI enabled
npx vue-translations-cleanup --translate

# Preview changes first
npx vue-translations-cleanup --translate --dry-run --verbose
```

**What happens:**
- Compares source language translations with target languages
- Identifies missing keys or keys with identical values (untranslated copies)
- Uses AI to translate them to all configured target languages
- Preserves existing translations
- Creates backups before modifying files

**Prerequisites:**
- AI must be enabled in config file
- Target languages must be configured
- Source translation file must exist

**Config Example:**
```typescript
{
  ai: {
    enabled: true,
    provider: 'ollama', // or 'anthropic', 'openai', etc.
    languages: ['de', 'fr', 'es'], // target languages
    excludeFromTranslation: ['app.name', 'company.*'], // optional exclusions
  },
  extract: {
    targetLanguage: 'en', // source language
  },
}
```

**Output:**
```
=== Translation Sync Mode ===

Source file: /project/locales/en.json
Target languages: de, fr, es

  de: Found 5 missing/untranslated keys (2 excluded)
    common.submit: "Absenden" (confidence: 0.95)
    user.profile: "Profil" (confidence: 0.92)
    ...

  fr: Found 3 missing/untranslated keys
    common.submit: "Soumettre" (confidence: 0.94)
    ...

✓ Translation completed in 2500ms

Summary:
  de: 5 keys translated
  fr: 3 keys translated
  es: 4 keys translated
```

::: tip Exclude Keys
Use `excludeFromTranslation` to prevent translation of brand names, company names, legal terms, etc.
Supports glob patterns like `company.*` or `legal.terms.*`.
:::

## Auto-Detection

The tool automatically detects your project structure:

### Nuxt 3 Projects

Looks for `nuxt.config.{ts,js,mjs}` with `@nuxtjs/i18n`:
- **Source**: `./src` or `./app`
- **Translations**: `./locales` or `./i18n/locales`

### Nuxt 4 Projects

Same as Nuxt 3, with preference for:
- **Source**: `./app`
- **Translations**: `./i18n/locales`

### Vue 3 + Vite Projects

Looks for `vite.config.{ts,js}` with `@intlify/unplugin-vue-i18n`:
- Parses `include` option for translation path
- Defaults to `./src` for source files

### Fallback

If auto-detection fails, checks common paths:
- **Source**: `./src`, `./app`, `./client`
- **Translations**: `./src/locales`, `./locales`, `./i18n`

## Project Structure Examples

### Nuxt 3

```
my-nuxt3-app/
├── src/
│   ├── components/
│   ├── pages/
│   └── layouts/
├── locales/
│   ├── en.json
│   ├── de.json
│   └── fr.json
└── nuxt.config.ts
```

```bash
npx vue-translations-cleanup
# Auto-detects: src/ and locales/
```

### Nuxt 4

```
my-nuxt4-app/
├── app/
│   ├── components/
│   └── pages/
├── i18n/
│   └── locales/
│       ├── en.json
│       ├── de.json
│       └── fr.json
└── nuxt.config.ts
```

```bash
npx vue-translations-cleanup
# Auto-detects: app/ and i18n/locales/
```

### Vue 3 + Vite

```
my-vue-app/
├── src/
│   ├── components/
│   ├── views/
│   └── locales/
│       ├── en.json
│       └── de.json
└── vite.config.ts
```

```bash
npx vue-translations-cleanup
# Auto-detects: src/ and src/locales/
```

## Common Options

### All Modes

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --translation-file <path>` | Translation file or directory | Auto-detected |
| `-s, --src-path <path>` | Source files path | Auto-detected |
| `-n, --dry-run` | Preview without writing | `false` |
| `--no-backup` | Skip backup creation | Backup enabled |
| `-v, --verbose` | Detailed output | `false` |
| `-c, --config <path>` | Config file path | Auto-detected |

### Cleanup Mode

| Option | Description | Default |
|--------|-------------|---------|
| `-p, --pattern <glob>` | File pattern to scan | `**/*.{vue,js,ts}` |

### Extract Mode

| Option | Description | Default |
|--------|-------------|---------|
| `--extract` | Enable extraction mode | Cleanup mode |

### Translate Mode

| Option | Description | Default |
|--------|-------------|---------|
| `--translate` | Enable translation sync mode | Cleanup mode |

## Next Steps

- [Cleanup Mode Guide](/guide/cleanup-mode) - Learn about removing unused keys
- [Extract Mode Guide](/guide/extract-mode) - Learn about extracting raw strings
- [Configuration](/guide/config-file) - Advanced configuration options
- [Examples](/examples/nuxt-3) - See real-world examples

## Troubleshooting

### Auto-detection not working?

Specify paths manually:
```bash
npx vue-translations-cleanup -t ./path/to/locales/en.json -s ./path/to/src
```

### Need more control?

Create a [config file](/guide/config-file):
```bash
# Create config
touch vue-translations-cleanup.config.ts

# Use it
npx vue-translations-cleanup --config ./vue-translations-cleanup.config.ts
```

### Getting errors?

Run with `--verbose` for detailed output:
```bash
npx vue-translations-cleanup --verbose
```

## Getting Help

- 📖 [Full Documentation](/)
- 🐛 [Report Issues](https://github.com/butaminas/vue-translations-cleanup/issues)
- 💬 [Discussions](https://github.com/butaminas/vue-translations-cleanup/discussions)
