# Extract Mode

Automatically find and convert raw strings to i18n function calls.

## Overview

Extract mode helps you:
- 🔍 Find hardcoded translatable strings
- ✏️ Convert them to i18n calls automatically
- 📦 Generate semantic translation keys
- 🌍 Update translation JSON files
- 🤖 AI-powered key generation (optional)

Perfect for migrating legacy code or adding i18n to existing projects.

## Basic Usage

```bash
# Specify translation file (required for extract mode)
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src

# With config file (enables auto-detection)
npx vue-translations-cleanup --extract --config ./my-config.ts

# Preview only
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src --dry-run --verbose
```

::: warning Important
Extract mode requires a **single translation file**, not a directory.
You must either:
- Specify `-t ./locales/en.json` explicitly, OR
- Use a `--config` file that defines `translationFile`
:::

## Prerequisites

::: warning Important
Your project must have **at least one existing i18n reference** for the tool to detect how i18n is used.
:::

Add a minimal i18n reference:

**Vue 3 Composition API:**
```vue
<script setup>
const { t } = useI18n()
const example = t('hello')
</script>
```

**Nuxt / Options API:**
```vue
<template>
  <div>{{ $t('hello') }}</div>
</template>
```

## How It Works

### Step 1: Detect i18n Patterns

Scans your codebase to understand how i18n is used:

```javascript
// Detects these patterns
const { t } = useI18n()
this.$t('key')
$t('key')
```

### Step 2: Find Raw Strings

Locates translatable strings in:

**Templates:**
```vue
<button>Submit</button>
<!-- Found: "Submit" -->

<input placeholder="Enter name" />
<!-- Found: "Enter name" -->
```

**Scripts:**
```javascript
const message = "Hello world"
// Found: "Hello world"
```

### Step 3: Generate Keys

Creates semantic translation keys:

```
"Submit" → common.submit
"Enter your name" → form.name_placeholder
"Welcome back!" → greeting.welcome_back
```

Key generation considers:
- File path (`LoginForm.vue` → `login_form.*`)
- Context (button, placeholder, error, etc.)
- String content

### Step 4: Replace Strings

Converts raw strings to i18n calls:

**Template:**
```vue
<!-- Before -->
<button>Submit</button>

<!-- After -->
<button>\{\{ t('common.submit') \}\}</button>
```

**Attributes:**
```vue
<!-- Before -->
<input placeholder="Enter name" />

<!-- After -->
<input :placeholder="t('form.name_placeholder')" />
```

**Script:**
```vue
<!-- Before -->
<script setup>
const message = "Hello"
</script>

<!-- After -->
<script setup>
const { t } = useI18n()
const message = t('greeting.hello')
</script>
```

### Step 5: Update Translations

Adds new keys to your translation file:

```json
{
  "common": {
    "submit": "Submit"
  },
  "form": {
    "name_placeholder": "Enter name"
  },
  "greeting": {
    "hello": "Hello"
  }
}
```

## String Detection

### Heuristics

The tool uses smart heuristics to avoid false positives:

**✅ Detected (High Confidence):**
- Multiple words with spaces: `"Hello world"`
- Natural language: `"Welcome back!"`
- Common UI text: `"Submit"`, `"Cancel"`
- Form placeholders: `"Enter your name"`

**❌ Not Detected (Filtered Out):**
- URLs: `"https://example.com"`
- Hex colors: `"#FF5733"`
- CSS classes: `"flex justify-center"`
- Email addresses: `"user@example.com"`
- File paths: `"/api/users"`
- Short technical strings: `"px"`, `"id"`

### Confidence Levels

Configure minimum confidence:

```typescript
{
  extract: {
    confidence: 'high' // 'high' | 'medium' | 'low'
  }
}
```

- **High**: Strict, fewer false positives (default)
- **Medium**: Balanced approach
- **Low**: Permissive, may include non-translatable strings

## Key Generation

### Formats

Choose your preferred key naming format:

```typescript
{
  extract: {
    keyFormat: 'snake_case' // default
  }
}
```

**snake_case** (default):
```
"Submit Form" → submit_form
"User Profile" → user_profile
```

**camelCase**:
```
"Submit Form" → submitForm
"User Profile" → userProfile
```

**kebab-case**:
```
"Submit Form" → submit-form
"User Profile" → user-profile
```

**dot.case**:
```
"Submit Form" → submit.form
"User Profile" → user.profile
```

### Contextual Prefixes

Keys are grouped by context:

**File-based:**
```
LoginForm.vue → login_form.submit
UserProfile.vue → user_profile.title
```

**Attribute-based:**
```
placeholder="..." → form.*_placeholder
title="..." → tooltip.*_title
alt="..." → image.*_alt
```

**Content-based:**
```
"Submit" (button) → common.submit
"Error: ..." → errors.*
"Are you sure?" → confirm.*
```

### AI-Powered Generation

With AI enabled, get context-aware keys:

```typescript
{
  ai: {
    enabled: true,
    provider: 'ollama',
    model: 'codellama'
  }
}
```

**Example:**
```vue
<!-- File: src/components/auth/LoginForm.vue -->
<button>Log in to continue</button>
```

**Heuristic key:**
```
login_form.log_in_to_continue
```

**AI-generated key:**
```
auth.login.submit_button
```

AI considers:
- File path and component name
- Surrounding code context
- Semantic meaning
- Common i18n conventions

## Configuration

### Extract Config

```typescript
{
  extract: {
    targetLanguage: 'en',
    confidence: 'high',
    keyFormat: 'snake_case',
    maxKeyLength: 50,

    includeAttributes: [
      'placeholder',
      'title',
      'alt',
      'label',
      'aria-label'
    ],

    excludePatterns: [
      '**/*.spec.ts',
      '**/*.test.ts',
      '**/test/**'
    ]
  }
}
```

### Custom i18n Patterns

For non-standard i18n setups:

```typescript
{
  extract: {
    i18nPatterns: [
      {
        pattern: /const\s*{\s*translate\s*}\s*=\s*useTranslation\(\)/,
        functionName: 'translate',
        importTemplate: 'const { translate } = useTranslation()',
        injectLocation: 'script-setup'
      }
    ]
  }
}
```

## Examples

### Basic Extraction

```bash
# Specify translation file and source path
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src
```

### Preview Changes

```bash
# Dry run to see what would be extracted
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src --dry-run --verbose
```

Output:
```
[1/5] Detecting i18n usage patterns...
  Found 3 i18n patterns
  Recommended: useI18n

[2/5] Scanning for source files...
  Found 42 files

[3/5] Detecting raw translatable strings...
  Detected 18 strings (high confidence)

[4/5] Generating translation keys...
  Generated 18 keys

[5/5] Would replace strings in files...
  [DRY RUN] LoginForm.vue: 3 replacements
  [DRY RUN] Header.vue: 2 replacements
```

### With AI

```bash
# Requires AI config
npx vue-translations-cleanup --extract --config ./config.ts
```

## Programmatic Usage

```typescript
import { runExtraction } from 'vue-translations-cleanup/extract-strings'

const result = await runExtraction({
  translationFile: './locales/en.json',
  srcPath: './src',
  config: {
    extract: {
      confidence: 'high',
      keyFormat: 'snake_case'
    }
  },
  dryRun: false,
  verbose: true
})

console.log(`Extracted ${result.totalExtracted} strings`)
console.log(`Modified ${result.filesModified.length} files`)
```

## Best Practices

### 1. Start with Dry Run

Always preview first:
```bash
npx vue-translations-cleanup --extract --dry-run --verbose
```

### 2. Process Incrementally

Extract one directory at a time:
```bash
npx vue-translations-cleanup --extract -s ./src/components/auth
```

### 3. Review Changes

Check git diff before committing:
```bash
git diff
```

### 4. Test Thoroughly

Run your app and test all affected pages.

### 5. Use AI for Better Keys

AI generates more semantic, maintainable keys.

## Limitations

### No Dynamic String Detection

Dynamic strings won't be detected:
```javascript
const message = getName() + " logged in"
// Not detected
```

### Template Logic

Complex template expressions may not be extracted:
```vue
<div>{{ user.name + ' (' + user.role + ')' }}</div>
<!-- Not extracted -->
```

### Existing i18n Required

At least one i18n reference must exist in your codebase.

## Troubleshooting

### "No i18n patterns found"

Add at least one i18n reference:
```vue
<script setup>
const { t } = useI18n()
t('hello')
</script>
```

### No strings detected

- Check confidence level (try 'medium' or 'low')
- Verify files match the scan pattern
- Use `--verbose` to see what's being scanned

### Too many false positives

- Increase confidence to 'high'
- Add patterns to `excludePatterns`
- Review and adjust manually

## Next Steps

- [AI Features](/guide/ai-features) - Enable AI-powered features
- [Config File](/guide/config-file) - Full configuration reference
- [Examples](/examples/vue-3-vite) - See real-world examples
