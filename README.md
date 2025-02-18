# vue-translations-cleanup

A tool to find and remove unused translation keys in Vue i18n projects.

## Installation

```bash
npm install -g vue-translations-cleanup
# or
pnpm add -g vue-translations-cleanup
```

## Usage

### Command Line

```bash
vue-translations-cleanup --translation-file ./src/translations/en.json --src-path ./src
```

Options:
- `-t, --translation-file <path>` - Path to translation file (required)
- `-s, --src-path <path>` - Path to source files (required)
- `-n, --dry-run` - Show what would be removed without making changes
- `--no-backup` - Skip creating backup file
- `-v, --verbose` - Show detailed output

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

## Features

- Finds unused translation keys in Vue/React projects
- Supports nested translation objects
- Creates backup files by default
- Handles various translation key usage patterns:
    - Direct `t('key')` or `$t('key')` calls
    - Array constant definitions
    - Object value/label pairs
    - String literals in arrays

## License

MIT
