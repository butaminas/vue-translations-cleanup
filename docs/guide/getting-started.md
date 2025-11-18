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

### Cleanup Mode (Default)

Remove unused translation keys:

```bash
# Auto-detect paths
npx vue-translations-cleanup

# Specify paths manually
npx vue-translations-cleanup -t ./locales/en.json -s ./src

# Preview changes (dry-run)
npx vue-translations-cleanup --dry-run

# Show detailed output
npx vue-translations-cleanup --verbose
```

**Output:**
```
✓ Found translation file: /project/locales/en.json
✓ Scanning source files in: /project/src

Translation Summary:
  Total keys: 45
  Used keys: 38
  Unused keys: 7

Unused translations:
  - old.feature.title
  - deprecated.button
  - test.debug.log

✓ Cleaned translations saved to: /project/locales/en.json
✓ Backup created: /project/locales/en.json.backup
```

### Extract Mode

Convert raw strings to i18n:

```bash
# Specify translation file (required for extract mode)
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src

# With config file (can auto-detect paths)
npx vue-translations-cleanup --extract --config ./my-config.ts

# Preview changes
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src --dry-run --verbose
```

::: warning Extract Mode Requirement
Extract mode requires a **single translation file**, not a directory.
Either specify `-t ./locales/en.json` or use a config file.
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
