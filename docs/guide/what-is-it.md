# What is vue-translations-cleanup?

**vue-translations-cleanup** is a powerful CLI tool designed for Vue.js and Nuxt developers working with internationalization (i18n). It solves two common problems:

## Problem 1: Unused Translation Keys

Over time, translation files accumulate unused keys as features change and code evolves. Finding and removing these manually is:
- ⏰ Time-consuming
- ❌ Error-prone
- 😰 Risky without proper tooling

**Solution**: Cleanup Mode automatically scans your codebase, identifies unused keys, and safely removes them.

## Problem 2: Raw Strings in Code

When building multilingual apps, you often need to:
- Convert legacy code with hardcoded strings
- Retrofit i18n into existing projects
- Migrate from one i18n library to another

Manually finding and converting hundreds of strings is tedious.

**Solution**: Extract Mode finds raw translatable strings and automatically converts them to i18n function calls.

## Key Features

### Cleanup Mode (Default)
- 🔍 Scans source files for translation usage
- 🗑️ Identifies and removes unused keys
- 🌳 Prunes empty nested objects
- 💾 Creates automatic backups
- 👀 Dry-run preview mode

### Extract Mode (NEW in v2.0)
- 🎯 Detects raw translatable strings
- 🤖 Generates semantic translation keys
- ✏️ Replaces strings with i18n calls
- 📦 Auto-injects i18n imports
- 🌍 AI-powered auto-translation

### AI Integration (Optional)
- 🧠 Smart key generation with context awareness
- 🌐 Auto-translate to multiple languages
- 🏠 Local (Ollama, LM Studio) or cloud (Anthropic, OpenAI)
- ⚡ Fast with graceful fallbacks

## Supported Frameworks

- ✅ **Vue 3** with vue-i18n
- ✅ **Nuxt 3** with @nuxtjs/i18n
- ✅ **Nuxt 4** with @nuxtjs/i18n
- ✅ **Vite** with @intlify/unplugin-vue-i18n
- ✅ Custom i18n patterns (configurable)

## Supported i18n Patterns

### Cleanup Mode

Cleanup mode detects **all common vue-i18n patterns**:

**Function Calls:**
```javascript
t('key')
$t('key')
rt('key')
$rt('key')
tc('key')
$tc('key')
```

**Composition API:**
```javascript
const { t } = useI18n()
t('greeting')
```

**Vue Templates:**
```vue
<!-- Directive -->
<div v-t="'key'"></div>

<!-- Component -->
<i18n-t keypath="key" />

<!-- Interpolation -->
\{\{ $t('key') \}\}
```

### Extract Mode

Extract mode currently supports **`t()` and `$t()` only**:

```javascript
// Supported patterns
t('key')
$t('key')
const { t } = useI18n()
```

::: tip Future Support
Support for additional patterns (`rt`, `tc`, `v-t`, `i18n-t`) in extract mode is planned for future releases.
:::

## How It Works

### Cleanup Mode Process

1. **Parse** translation JSON files
2. **Scan** source files for i18n usage
3. **Match** used keys with translation keys
4. **Identify** unused keys
5. **Remove** unused translations
6. **Prune** empty nested objects
7. **Backup** original file (optional)

### Extract Mode Process

1. **Detect** existing i18n patterns in your codebase
2. **Scan** source files for raw strings
3. **Filter** using heuristics (or AI)
4. **Generate** semantic translation keys
5. **Replace** strings with i18n calls
6. **Inject** necessary imports
7. **Update** translation JSON files
8. **Translate** to other languages (AI, optional)

## Philosophy

- **Safe by Default**: Automatic backups, dry-run mode
- **Zero Config**: Auto-detects most project setups
- **Extensible**: Config files for complex scenarios
- **Graceful Degradation**: Works without AI, falls back on errors
- **Developer Experience**: Clear output, helpful errors

## When to Use It

**Cleanup Mode:**
- 🧹 Before major releases to reduce bundle size
- 📊 Regular maintenance to keep translations organized
- 🔄 After refactoring features
- 🚀 CI/CD integration for automated checks

**Extract Mode:**
- 🔁 Migrating legacy projects to i18n
- 🌐 Adding internationalization to existing apps
- 📝 Converting hardcoded strings in bulk
- 🆕 Standardizing translation key formats

## What's Next?

Ready to get started? Head over to the [Getting Started guide](/guide/getting-started) to install and run your first cleanup or extraction!
