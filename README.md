# vue-translations-cleanup

[![npm version](https://img.shields.io/npm/v/vue-translations-cleanup.svg)](https://www.npmjs.com/package/vue-translations-cleanup)
[![License](https://img.shields.io/npm/l/vue-translations-cleanup.svg)](https://github.com/yourusername/vue-translations-cleanup/blob/main/LICENSE)
[![vue-i18n supported](https://img.shields.io/badge/vue--i18n-supported-brightgreen?logo=vue.js)](https://vue-i18n.intlify.dev/)

A tool designed to help you clean up unused translation keys in your Vue.js i18n projects (and similar setups). With enhanced detection and safe, stable updates, managing your translation files has never been easier.


## Features

- **Advanced Translation Detection:**
  - Detects `t()`, `$t()`, `rt()`, `$rt()`, `tc()`, `$tc()` including Composition API (e.g. `useI18n().t()`), multi-line strings, and different quotes (single, double, template literals).
  - Supports bracket notation and normalizes it to dot notation.
  - Detects Vue template usages: `v-t` directive (string and object forms) and `<i18n-t>` component `keypath`/`path` (static and bound forms).

- **Safe & Reliable Updates:**
  - Automatically creates backup files before making changes (disable with `--no-backup`).
  - Dry-run mode to preview changes without writing.
  - Automatically prunes empty objects after deletions, including root-level empties. If a previous run left empty groups, a subsequent run will prune them even when no unused keys are detected ("prune-only" run).

- **Broad file coverage:**
  - Scans `*.{vue,ts,tsx,js,jsx,mjs,cjs}` by default.

- **Fully Tested for Stability:**
  - Comprehensive tests cover nested keys, pruning, template directives/components, and more.

## Compatibility

- Primary support: This tool targets the official vue-i18n (Intlify) library: https://vue-i18n.intlify.dev/
- It may also work with other i18n libraries that expose compatible APIs (e.g., `t`, `$t`, `rt`, `tc`) and similar usage patterns (including Composition API). However, only vue-i18n is explicitly supported and covered by our tests.

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

Run from the command line:

```bash
# Basic run (writes changes and creates a backup by default)
npx vue-translations-cleanup --translation-file ./src/translations/en.json --src-path ./src

# Preview only (no writes)
npx vue-translations-cleanup -t ./src/translations/en.json -s ./src --dry-run --verbose

# Skip backup creation
npx vue-translations-cleanup -t ./src/translations/en.json -s ./src --no-backup
```

Programmatic usage:

```typescript
import { cleanupTranslations } from 'vue-translations-cleanup'

(async () => {
  const result = await cleanupTranslations({
    translationFile: './src/translations/en.json',
    srcPath: './src',
    backup: true,    // default: true
    dryRun: false,   // default: false
    verbose: true,   // default: false
  })

  console.log('Unused translations:', result.unusedTranslations)
  // result includes: totalKeys, usedKeys, unusedKeys, unusedTranslations, usedKeysSet, cleaned
})()
```

### Notes & limitations
- Dynamic/computed keys (e.g., `t(variable)` or `:keypath="`labels.${type}.name`"`) are not considered "used" to avoid false positives.
- If you see empty groups left from older runs, just run the tool again without `--dry-run`; prune-only mode will remove them.

## Contributing

Contributions are welcome! If you have improvements or find issues, feel free to submit a Pull Request.

---

Happy translating!
