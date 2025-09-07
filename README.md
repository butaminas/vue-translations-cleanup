# vue-translations-cleanup

[![npm version](https://img.shields.io/npm/v/vue-translations-cleanup.svg)](https://www.npmjs.com/package/vue-translations-cleanup)
[![License](https://img.shields.io/npm/l/vue-translations-cleanup.svg)](https://github.com/yourusername/vue-translations-cleanup/blob/main/LICENSE)
[![vue-i18n supported](https://img.shields.io/badge/vue--i18n-supported-brightgreen?logo=vue.js)](https://vue-i18n.intlify.dev/)

A tool designed to help you clean up unused translation keys in your Vue.js i18n projects (and similar setups). With enhanced detection and safe, stable updates, managing your translation files has never been easier.


## Features

- **Auto-detection and flexible targets:**
  - Runs with no flags and attempts to auto-detect your source and translations paths (Vite + @intlify/unplugin-vue-i18n and common folders supported).
  - Accepts either a single JSON file or an entire directory of JSON files for bulk cleanup.

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
# Using pnpm
pnpm add -D vue-translations-cleanup

# Using npm
npm install --save-dev vue-translations-cleanup

# Using yarn
yarn add -D vue-translations-cleanup
```

## Usage

Run from the command line:

```bash
# Easiest: let the tool auto-detect paths (Vite + @intlify/unplugin-vue-i18n and common folders supported)
# Run this in the root of your project
npx vue-translations-cleanup

# See what was detected (verbose)
npx vue-translations-cleanup --verbose

# Manual single-file mode (same as before)
npx vue-translations-cleanup -t ./src/translations/en.json -s ./src

# Directory-wide cleanup: provide a folder containing multiple JSON translation files
npx vue-translations-cleanup -t ./src/locales -s ./src

# Preview only (no writes)
npx vue-translations-cleanup -t ./src/translations/en.json -s ./src --dry-run --verbose

# Skip backup creation
npx vue-translations-cleanup -t ./src/translations/en.json -s ./src --no-backup
```

#### Behavior & defaults
- -t/--translation-file and -s/--src-path are optional. If omitted, the tool attempts to auto-detect both paths (Vite projects using @intlify/unplugin-vue-i18n include + common folder conventions like src and src/locales).
- If auto-detection cannot determine the missing path(s), the process stops with a clear message asking you to provide them manually.
- -t may be a single JSON file or a directory. When a directory is provided, all .json files found recursively in that directory are processed.
- Backups are created by default before writing changes; disable with --no-backup. Use --dry-run to preview changes without writing. Use --verbose for detailed logs.
- Source scanning covers .{vue,ts,tsx,js,jsx,mjs,cjs} files by default.

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
- JSON-only scope: This tool currently edits JSON translation files only. You can pass a single JSON file or a directory containing multiple JSON files. It does not modify:
  - Vue SFC <i18n> blocks
  - TS/JS translation modules
  - Inline configuration (e.g., messages inside createI18n)
- Dynamic/computed keys (e.g., t(variable) or :keypath="`labels.${type}.name`") are not considered "used" to avoid false positives.

## Contributing

Contributions are welcome! If you have improvements or find issues, feel free to submit a Pull Request.

---

Happy translating!

