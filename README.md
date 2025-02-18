# vue-translations-cleanup

[![npm version](https://img.shields.io/npm/v/vue-translations-cleanup.svg)](https://www.npmjs.com/package/vue-translations-cleanup)
[![License](https://img.shields.io/npm/l/vue-translations-cleanup.svg)](https://github.com/yourusername/vue-translations-cleanup/blob/main/LICENSE)

A tool to find and remove unused translation keys in Vue.js i18n projects. While primarily designed for Vue.js, it can also work with other frameworks that use similar i18n patterns.

## Features

- Finds unused translation keys in Vue projects
- Supports nested translation objects
- Creates backup files by default
- Handles various translation key usage patterns:
  - Direct `t('key')` or `$t('key')` calls
  - Array constant definitions
  - Dynamic translation names
  - String literals in arrays

## Installation

```bash
# Using pnpm (recommended)
pnpm add -D vue-translations-cleanup

# Using npm
npm install --save-dev vue-translations-cleanup

# Using yarn
yarn add -D vue-translations-cleanup
```

## Usage

### As a package.json script (Recommended)

Add it to your project's package.json:
```json
{
  "scripts": {
    "clean-translations": "vue-translations-cleanup --translation-file ./src/lang/translations/en.json --src-path ./src"
  }
}
```

Then run it using:
```bash
pnpm clean-translations
```

### Command Line

```bash
npx vue-translations-cleanup --translation-file ./src/translations/en.json --src-path ./src
```

### Programmatic Usage

```typescript
import { cleanupTranslations } from 'vue-translations-cleanup'

const result = await cleanupTranslations({
  translationFile: './src/translations/en.json',
  srcPath: './src',
  backup: true,
  dryRun: false,
  verbose: true,
})

console.log('Unused translations:', result.unusedTranslations)
```

### Options

- `-t, --translation-file <path>` - Path to translation file (required)
- `-s, --src-path <path>` - Path to source files (required)
- `-n, --dry-run` - Show what would be removed without making changes
- `--no-backup` - Skip creating backup file
- `-v, --verbose` - Show detailed output

## Example Output

```bash
Results:
Total translation keys: 150
Used keys: 130
Unused keys: 20

Unused translations:
[
  "common.deprecated.key",
  "menu.unused.item",
  ...
]

Translations file has been updated
```

## Safety Features

- Creates backup files by default before making changes
- Dry run mode available to preview changes
- Preserves JSON formatting and structure

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
