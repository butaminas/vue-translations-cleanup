# Cleanup Mode

Remove unused translation keys from your JSON files automatically.

## Overview

Cleanup mode scans your source code for i18n usage and removes translation keys that are never referenced. This helps:

- 📉 Reduce bundle size
- 🧹 Keep translations organized
- 🚀 Improve maintainability
- ⚡ Speed up translation loading

## Basic Usage

```bash
# Auto-detect project structure
npx vue-translations-cleanup

# Specify translation file and source path
npx vue-translations-cleanup -t ./locales/en.json -s ./src

# Process a directory of translation files
npx vue-translations-cleanup -t ./locales -s ./src
```

## How It Works

### 1. Parse Translations

Reads your JSON translation file and flattens nested keys:

```json
{
  "user": {
    "profile": {
      "title": "Profile"
    }
  }
}
```

Becomes: `user.profile.title`

### 2. Scan Source Files

Searches for i18n usage patterns in:
- `.vue` files
- `.ts` / `.tsx` files
- `.js` / `.jsx` files
- `.mjs` / `.cjs` files

### 3. Detect Usage

Finds all translation key references:

```javascript
// Function calls
t('user.profile.title')
$t('user.profile.title')

// Composition API
const { t } = useI18n()
t('user.profile.title')

// Templates
{{ $t('user.profile.title') }}
<div v-t="'user.profile.title'"></div>
<i18n-t keypath="user.profile.title" />
```

### 4. Match & Remove

Compares used keys with translation keys and removes unused ones.

### 5. Prune Empty Objects

After removing keys, empty parent objects are pruned:

**Before:**
```json
{
  "user": {
    "profile": {
      "unused": "Value"
    }
  }
}
```

**After:**
```json
{}
```

## Parent Prefix Matching

If a parent key is used, all child keys are preserved:

```javascript
// Code uses parent prefix
const prefix = 'user.profile'
t(`${prefix}.title`)
t(`${prefix}.description`)
```

```json
{
  "user": {
    "profile": {
      "title": "Profile",
      "description": "Your profile",
      "other_key": "Also preserved!"
    }
  }
}
```

All keys under `user.profile.*` are kept, even if not directly referenced.

## Directory Mode

Process multiple translation files at once:

```bash
npx vue-translations-cleanup -t ./locales -s ./src
```

**File structure:**
```
locales/
├── en.json
├── de.json
├── fr.json
└── es.json
```

Each file is processed independently, creating separate backups.

## Options

### Translation File (`-t`, `--translation-file`)

Path to JSON file or directory:

```bash
# Single file
npx vue-translations-cleanup -t ./locales/en.json

# Directory (processes all .json files)
npx vue-translations-cleanup -t ./locales
```

### Source Path (`-s`, `--src-path`)

Path to scan for i18n usage:

```bash
npx vue-translations-cleanup -s ./src
```

### Dry Run (`-n`, `--dry-run`)

Preview changes without modifying files:

```bash
npx vue-translations-cleanup --dry-run
```

**Output:**
```
[DRY RUN] Would remove 7 unused translations:
  - old.feature.title
  - deprecated.button.text
  ...

[DRY RUN] No changes were made
```

### Backup (`--no-backup`)

Skip automatic backup creation:

```bash
npx vue-translations-cleanup --no-backup
```

::: warning
Without backups, changes are permanent. Use with caution!
:::

### Verbose (`-v`, `--verbose`)

Show detailed output:

```bash
npx vue-translations-cleanup --verbose
```

### Pattern (`-p`, `--pattern`)

Custom file glob pattern:

```bash
# Default pattern
npx vue-translations-cleanup -p "**/*.{vue,js,ts,tsx,jsx}"

# Custom pattern (e.g., only Vue files)
npx vue-translations-cleanup -p "**/*.vue"
```

## Examples

### Basic Cleanup

```bash
npx vue-translations-cleanup
```

### Preview Before Cleaning

```bash
npx vue-translations-cleanup --dry-run --verbose
```

### Clean Multiple Languages

```bash
npx vue-translations-cleanup -t ./locales -s ./src
```

### Custom File Pattern

```bash
# Only scan TypeScript files
npx vue-translations-cleanup -p "**/*.{ts,tsx}"
```

## Understanding Output

### Standard Output

```
✓ Found translation file: /project/locales/en.json
✓ Scanning source files in: /project/src

Translation Summary:
  Total keys: 45
  Used keys: 38
  Unused keys: 7

Unused translations:
  - old.feature.title
  - deprecated.button.text
  - test.debug.message
  - admin.legacy.option
  - form.old_validation
  - ui.removed_component
  - settings.deleted_feature

✓ Cleaned translations saved
✓ Backup created: en.json.backup
```

### Verbose Output

```bash
npx vue-translations-cleanup --verbose
```

```
[DEBUG] Auto-detecting project paths...
[DEBUG] Found nuxt.config.ts
[DEBUG] Detected Nuxt 3 project
[DEBUG] Source path: /project/src
[DEBUG] Translations path: /project/locales

[DEBUG] Scanning files with pattern: **/*.{vue,js,ts}
[DEBUG] Found 87 files

[DEBUG] Scanning: /project/src/components/Header.vue
[DEBUG] Found usage: t('header.title')
[DEBUG] Found usage: t('header.nav.home')

... (detailed file-by-file scan)

[DEBUG] Total translations: 45
[DEBUG] Used translations: 38
[DEBUG] Parent prefixes detected: user, admin

Translation Summary:
  Total keys: 45
  Used keys: 38
  Unused keys: 7

... (rest of output)
```

## Programmatic Usage

Use cleanup mode in Node.js scripts:

```typescript
import { cleanupTranslations } from 'vue-translations-cleanup'

const result = await cleanupTranslations({
  translationFile: './locales/en.json',
  srcPath: './src',
  backup: true,
  dryRun: false,
  verbose: false,
})

console.log(`Removed ${result.unusedKeys} unused keys`)
console.log('Unused:', result.unusedTranslations)
```

**Result type:**
```typescript
interface CleanupResult {
  totalKeys: number
  usedKeys: number
  unusedKeys: number
  unusedTranslations: string[]
  usedKeysSet: Set<string>
  cleaned: boolean
}
```

## Limitations

### Dynamic Keys

Keys constructed dynamically are **not detected**:

```javascript
// ❌ Not detected
const type = 'error'
t(`messages.${type}`)

// ❌ Not detected
t(variableName)

// ✅ Detected
t('messages.error')
```

**Solution**: Use parent prefix matching by referencing the parent key:

```javascript
// Reference parent to preserve all children
const prefix = 'messages'
t(prefix) // Keeps all messages.*
t(`${prefix}.${type}`)
```

### Template Expressions

Complex template expressions may not be detected:

```vue
<!-- ❌ May not be detected -->
<div>{{ $t(`prefix.${dynamicKey}`) }}</div>

<!-- ✅ Detected -->
<div>{{ $t('prefix.key') }}</div>
```

### External Dependencies

Keys used in external libraries or generated code won't be detected unless those files are scanned.

## Best Practices

### 1. Run in Dry Mode First

Always preview changes:

```bash
npx vue-translations-cleanup --dry-run --verbose
```

### 2. Check Backups

Review backup files before committing:

```bash
git diff locales/en.json locales/en.json.backup
```

### 3. Commit Separately

Commit cleanup changes separately from feature work:

```bash
npx vue-translations-cleanup
git add locales/
git commit -m "chore: remove unused translation keys"
```

### 4. CI/CD Integration

Add to CI to detect unused keys:

```yaml
# .github/workflows/check-translations.yml
- name: Check for unused translations
  run: |
    npx vue-translations-cleanup --dry-run
    if [ $? -ne 0 ]; then
      echo "Found unused translations!"
      exit 1
    fi
```

### 5. Regular Maintenance

Run cleanup regularly:
- Before major releases
- After large refactors
- Monthly/quarterly maintenance

## Troubleshooting

### Keys marked as unused but are used

**Possible causes:**
1. Dynamic key construction
2. Files not scanned (check pattern)
3. Usage in external files

**Solutions:**
- Use verbose mode to see scanned files
- Adjust file pattern
- Reference parent prefixes

### Too many keys marked as unused

**Check:**
- Is source path correct?
- Are all file types included in pattern?
- Run with `--verbose` to debug

### Performance issues with large codebases

**Optimize:**
- Use more specific source path
- Narrow file pattern
- Process translation files individually

## Next Steps

- [Extract Mode](/guide/extract-mode) - Convert raw strings to i18n
- [Config File](/guide/config-file) - Advanced configuration
- [API Reference](/api/cleanup) - Programmatic usage
