# vue-translations-cleanup

[![npm version](https://img.shields.io/npm/v/vue-translations-cleanup.svg)](https://www.npmjs.com/package/vue-translations-cleanup)
[![License](https://img.shields.io/npm/l/vue-translations-cleanup.svg)](https://github.com/yourusername/vue-translations-cleanup/blob/main/LICENSE)

A tool designed to help you clean up unused translation keys in your Vue.js i18n projects (and similar setups). With enhanced detection and safe, stable updates, managing your translation files has never been easier.

## Features

- **Advanced Translation Detection:**  
  Supports various translation function calls including `t()`, `$t()`, `rt()`, `$rt()`, `tc()`, `$tc()`, as well as Composition API usage (e.g. `useI18n().t()`). Multi-line support and different quoting styles (single, double, template literals) are fully supported—even handling object-style templates and bracket notation.

- **Safe & Reliable Updates:**  
  Automatically creates backup files before making changes. A dry-run mode allows you to preview updates without modifying files, ensuring your translations remain secure.

- **Modular & Extensible Architecture:**  
  The tool is built with modular components for file scanning and translation extraction, making it easy to maintain and extend.

- **Fully Tested for Stability:**  
  Comprehensive tests ensure the tool's robustness in detecting and cleaning translation keys across your codebase.

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

You can run the tool either from the command line:

```bash
npx vue-translations-cleanup --translation-file ./src/translations/en.json --src-path ./src
```

Or programmatically:

```typescript
import { cleanupTranslations } from 'vue-translations-cleanup'

(async () => {
  const result = await cleanupTranslations({
    translationFile: './src/translations/en.json',
    srcPath: './src',
    backup: true,    // Backup is created by default
    dryRun: false,
    verbose: true,
  })

  console.log('Unused translations:', result.unusedTranslations)
})()
```

## Contributing

Contributions are welcome! If you have improvements or find issues, feel free to submit a Pull Request.

---

Happy translating!
