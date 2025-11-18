# CLAUDE.md

This document provides a comprehensive guide for AI assistants working with the `vue-translations-cleanup` codebase. It covers the project structure, development workflows, coding conventions, and key patterns.

## Project Overview

**vue-translations-cleanup** is a dual-purpose CLI tool for Vue.js and Nuxt i18n projects:
1. **Cleanup Mode** (default): Find and remove unused translation keys
2. **Extract Mode** (new): Find raw strings and convert them to i18n keys

It primarily targets vue-i18n (Intlify) and @nuxtjs/i18n but may work with compatible i18n libraries.

### Key Features

**Cleanup Mode**:
- Auto-detection of source and translation paths (Nuxt 3/4 with @nuxtjs/i18n, Vite + @intlify/unplugin-vue-i18n)
- Advanced translation detection (t(), $t(), rt(), $rt(), tc(), $tc(), Composition API)
- Support for Vue template directives (v-t) and components (<i18n-t>)
- Safe updates with automatic backups
- Dry-run mode for previewing changes
- Automatic pruning of empty objects after deletions
- Both single-file and directory-wide cleanup support

**Extract Mode** (NEW):
- Detect raw translatable strings in templates and scripts
- Heuristic-based key generation with semantic naming
- AI-powered auto-translation to multiple languages (optional)
- Automatic code replacement with i18n function calls
- Auto-inject i18n imports when needed
- Update translation JSON files with new keys
- Config file support for complex setups
- Support for custom i18n patterns

### Package Information
- **Name**: vue-translations-cleanup
- **Current Version**: 1.4.0
- **License**: MIT
- **Author**: Mindaugas Kristutis
- **Main Entry**: dist/index.js
- **CLI Binary**: dist/cli.js

## Repository Structure

```
vue-translations-cleanup/
├── src/                              # Source code
│   ├── translations-cleanup/         # Core translation cleanup logic
│   │   ├── index.ts                  # Main cleanup function
│   │   ├── fileScanner.ts            # File scanning and pattern matching
│   │   ├── translationUtils.ts       # Translation key utilities
│   │   ├── patterns.ts               # Regex patterns for detecting translation usage
│   │   └── types.ts                  # TypeScript type definitions
│   ├── extract-strings/              # NEW: String extraction feature
│   │   ├── orchestrator.ts           # Coordinates extraction pipeline
│   │   ├── i18nPatternDetector.ts    # Detect existing i18n patterns
│   │   ├── rawStringDetector.ts      # Find raw translatable strings
│   │   ├── keyGenerator.ts           # Generate semantic translation keys
│   │   ├── codeReplacer.ts           # Replace strings with i18n calls
│   │   └── types.ts                  # Type definitions for extraction
│   ├── config/                       # NEW: Config file support
│   │   ├── types.ts                  # Config type definitions
│   │   ├── loader.ts                 # Load config from .ts/.mjs/.json
│   │   └── validator.ts              # Validate and merge with defaults
│   ├── ai/                           # NEW: AI integration
│   │   └── client.ts                 # LLM client (Ollama, Anthropic, OpenAI)
│   ├── cli.ts                        # CLI entry point and command handling
│   ├── cli-detection.ts              # Auto-detection logic for paths
│   └── cli-style.ts                  # CLI styling utilities (colors, symbols)
├── tests/                            # Test files (176 tests total)
│   ├── translations-cleanup/         # Core functionality tests (15 tests)
│   │   ├── edgeCases.test.ts         # Edge case testing
│   │   ├── pruning.test.ts           # Empty object pruning tests
│   │   ├── nestedTranslations.test.ts # Nested key handling
│   │   ├── nestedParams.test.ts      # Nested parameter tests
│   │   ├── vueTemplateDirectives.test.ts # Vue template usage tests
│   │   ├── validation.test.ts        # Input validation tests
│   │   └── translationPatterns.test.ts # Pattern detection tests
│   ├── extract-strings/              # NEW: Extraction feature tests (80 tests)
│   │   ├── i18nPatternDetector.test.ts # Pattern detection tests
│   │   ├── rawStringDetector.test.ts   # Raw string detection tests
│   │   ├── keyGenerator.test.ts        # Key generation tests
│   │   └── codeReplacer.test.ts        # Code replacement tests
│   ├── config/                       # NEW: Config system tests (49 tests)
│   │   ├── validator.test.ts         # Config validation tests
│   │   └── loader.test.ts            # Config loading tests
│   ├── ai/                           # NEW: AI client tests (13 tests)
│   │   └── client.test.ts            # LLM integration tests
│   ├── cli.test.ts                   # CLI interface tests
│   ├── cli-directory-mode.test.ts    # Directory mode tests
│   ├── cli-autodetect-usage.test.ts  # Auto-detection tests
│   └── setup.ts                      # Test setup configuration
├── .github/workflows/                # GitHub Actions workflows
│   ├── test.yml                      # PR testing workflow
│   ├── release.yml                   # Release automation workflow
│   └── auto-merge-release-pr.yml     # Auto-merge for release PRs
├── dist/                             # Compiled output (git-ignored)
├── package.json                      # Package configuration
├── tsconfig.json                     # TypeScript configuration
├── eslint.config.js                  # ESLint configuration
├── vitest.config.mts                 # Vitest configuration
├── vue-translations-cleanup.config.example.ts  # NEW: Example config file
├── README.md                         # User documentation
├── CHANGELOG.md                      # Version history
└── LICENSE                           # MIT License
```

## Technology Stack

### Core Dependencies
- **@vue/compiler-sfc** (^3.5.24) - NEW: Vue SFC parser for extraction
- **commander** (^14.0.0) - CLI argument parsing
- **glob** (^11.0.3) - File pattern matching
- **kleur** (^4.1.5) - Terminal color styling

### Development Dependencies
- **TypeScript** (^5.9.2) - Type-safe development
- **Vitest** (^3.2.4) - Unit testing framework
- **memfs** (^4.51.0) - NEW: Virtual file system for test isolation
- **ESLint** (^9.35.0) - Code linting
- **@antfu/eslint-config** (^5.2.2) - Opinionated ESLint config
- **conventional-changelog-cli** (^4.1.0) - Changelog generation
- **commit-and-tag-version** (^12.4.0) - Version management

### Package Manager
The project uses **yarn** for dependency management (as evidenced by yarn.lock and CI workflows).

## Development Workflows

### Build Process
```bash
# Build TypeScript to JavaScript
yarn build   # or pnpm run build

# Output directory: dist/
# Entry points: dist/index.js (main), dist/cli.js (binary)
```

**TypeScript Configuration**:
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
- Declaration files generated
- Path alias: `@/*` -> `src/*`

### Testing

**Test Framework**: Vitest with memfs for file system mocking

```bash
# Run all tests
yarn test

# Tests are located in tests/ directory
# Setup file: tests/setup.ts
# Pattern: tests/**/*.test.{ts,js}
```

**Test Coverage Areas**:
- Core translation cleanup logic (15 tests)
- Pattern matching and detection
- Nested key handling
- Empty object pruning
- CLI interface and options
- Auto-detection functionality
- Directory mode processing
- Vue template directives and components
- **NEW**: String extraction pipeline (84 tests)
- **NEW**: Config file loading and validation (49 tests)
- **NEW**: AI client and auto-translation (19 tests)

**Total**: 176 tests, all passing

**Test Isolation**:
Tests use `memfs` to create virtual file systems, ensuring perfect isolation between test runs. This eliminates file system collision issues when tests run in parallel.

### Linting

**Linter**: ESLint with @antfu/eslint-config

```bash
# Lint source files
yarn lint

# Lints: src/**/*.ts
```

**ESLint Configuration**:
- Based on @antfu/eslint-config
- Vue support disabled (vue: false)
- TypeScript-first approach

### Release Process

The project uses **simple-release-action** for automated releases.

**Release Workflow** (.github/workflows/release.yml):
1. Triggered by issue comments or pushes to main
2. Creates release PRs with version bumps
3. Publishes to npm when PR is merged
4. Uses pnpm for release builds (Node 18)

**Manual Release Commands**:
```bash
# Patch release (1.4.0 -> 1.4.1)
yarn release:patch

# Minor release (1.4.0 -> 1.5.0)
yarn release:minor

# Major release (1.4.0 -> 2.0.0)
yarn release:major
```

**Versioning**:
- Tag prefix: `v` (e.g., v1.4.0)
- Changelog generation uses conventional commits
- commit-and-tag-version skips changelog (handled separately)

**CI/CD**:
- **Test Workflow** (.github/workflows/test.yml): Runs on PRs targeting main/master
- **Release Workflow** (.github/workflows/release.yml): Automated release management
- **Auto-merge Workflow** (.github/workflows/auto-merge-release-pr.yml): Auto-merges release PRs

## Code Architecture

### Core Modules (Cleanup Mode)

#### 1. translations-cleanup/index.ts
Main cleanup orchestration function.

**Key Function**: `cleanupTranslations(options: CleanupOptions)`

**Algorithm**:
1. Validate translation file and source path existence
2. Parse JSON translation file
3. Flatten translations to dot notation (e.g., "user.name.first")
4. Scan source files for translation key usage
5. Compute effective used leaves (considers parent prefixes)
6. Identify unused translations
7. Remove unused keys and prune empty objects
8. Create backup if enabled
9. Write cleaned translations back to file

**Special Features**:
- **Prune-only mode**: Removes empty objects even when no unused keys found
- **Parent prefix matching**: If "user" is used, all "user.*" keys are considered used
- **Recursive pruning**: Removes empty parent objects after deleting leaves

#### 2. translations-cleanup/fileScanner.ts
Scans source files for translation key usage.

**Functionality**:
- Uses glob patterns to find source files
- Default pattern: `**/*.{vue,ts,tsx,js,jsx,mjs,cjs}`
- Applies regex patterns to extract translation keys
- Normalizes bracket notation to dot notation (e.g., `['user']['name']` -> `user.name`)

#### 3. translations-cleanup/patterns.ts
Regex patterns for detecting translation usage.

**Supported Patterns**:
- Function calls: `t()`, `$t()`, `rt()`, `$rt()`, `tc()`, `$tc()`
- Composition API: `useI18n().t()`
- Quote types: single, double, template literals
- Multi-line strings
- Vue template directive: `v-t="'key'"`, `v-t="{ path: 'key' }"`
- i18n-t component: `<i18n-t keypath="key">`, `<i18n-t :keypath="'key'">`
- Legacy path attribute: `<i18n-t path="key">`

**Important Note**: Only captures the first argument (the translation key), ignoring additional parameters.

#### 4. translations-cleanup/translationUtils.ts
Utilities for working with translation objects.

**Key Function**: `flattenTranslations(translations: TranslationObject): Map<string, string>`
- Converts nested translation objects to flat dot-notation map
- Example: `{ user: { name: "John" } }` -> `"user.name": "John"`

### Extraction Modules (NEW)

#### 5. extract-strings/orchestrator.ts
Coordinates the complete extraction pipeline.

**Key Function**: `runExtraction(options: ExtractOptions)`

**Pipeline Steps**:
1. Detect existing i18n usage patterns in codebase
   - **Validation**: Requires at least one i18n pattern to be detected
   - **Error**: Returns empty result with helpful error message if no patterns found
   - **Supported patterns**: `useI18n()`, `$t()`, custom patterns from config
2. Find and scan source files matching pattern
3. Detect raw translatable strings (with heuristics)
4. Generate translation keys (heuristic or AI-powered)
5. Replace strings in code and update translation files

**Features**:
- Progress reporting with verbose mode
- Statistics (files scanned, strings extracted, etc.)
- Dry-run support
- Error handling with graceful degradation
- **Pattern validation**: Ensures at least one i18n reference exists before extraction

#### 6. extract-strings/i18nPatternDetector.ts
Auto-detects existing i18n usage patterns in the codebase.

**Built-in Pattern Detection**:
- Composition API: `const { t } = useI18n()`
- Options API: `this.$t(...)`
- Global: `$t(...)` in templates
- Custom patterns via config

**Functionality**:
- Scans files for i18n usage
- Counts pattern occurrences
- Recommends most common pattern
- Supports custom patterns from config
- **NEW**: Detects import statements (e.g., `import { useI18n } from 'vue-i18n'`)
- **NEW**: Config-first approach for custom patterns (explicit `importStatement` in config takes precedence)
- **NEW**: Auto-detection fallback (scans code if no explicit import provided)

#### 7. extract-strings/rawStringDetector.ts
Finds raw translatable strings using AST parsing and heuristics.

**Detection Strategy**:
- **Vue files**: Uses `@vue/compiler-sfc` to parse templates and scripts
- **Template strings**: Text nodes, attribute values (placeholder, title, alt, etc.)
- **Script strings**: String literals not already in i18n calls
- **Heuristics**: Filters out URLs, hex colors, CSS classes, emails, etc.

**Confidence Levels**:
- **High**: Multiple words with spaces, natural language indicators
- **Medium**: Longer single words, some context
- **Low**: Short words, borderline cases

#### 8. extract-strings/keyGenerator.ts
Generates semantic translation keys.

**Key Formats Supported**:
- `snake_case` (default)
- `camelCase`
- `kebab-case`
- `dot.case`

**Smart Features**:
- Infers hierarchical prefixes from file paths
- Context-aware naming (buttons, errors, placeholders, tooltips)
- Duplicate handling with numeric suffixes
- Truncation with max length support
- Grouping by prefix

**Example**:
```typescript
// Input: "Submit" in /src/components/LoginForm.vue
// Output: "login_form.submit"
```

#### 9. extract-strings/codeReplacer.ts
Replaces raw strings with i18n function calls.

**Replacements**:
- Template text: `>text<` → `>{{ t('key') }}<`
- Attributes: `attr="text"` → `:attr="t('key')"`
- Script strings: `"text"` → `t('key')`

**Auto-import Injection**:
- Detects if import already exists
- Adds `const { t } = useI18n()` for Vue SFC setup scripts
- Adds appropriate import for plain TS/JS files
- Respects custom i18n patterns from detection
- **NEW**: Injects both import statement and usage pattern
- **NEW**: Adds blank line between import and usage for clean formatting
- **NEW**: Handles files without existing script section (creates new `<script setup>`)
- **NEW**: Smart insertion (after other imports, before component logic)

**Translation File Updates**:
- Creates nested structure from dot notation
- Preserves existing translations
- Supports multiple languages (via config)

### Config System (NEW)

#### 10. config/loader.ts
Loads configuration from files.

**Supported Formats**:
- TypeScript: `vue-translations-cleanup.config.ts`
- ES Module: `vue-translations-cleanup.config.mjs`
- JSON: `vue-translations-cleanup.config.json`

**Loading Strategy**:
1. Check for explicit `--config` flag
2. Auto-detect config file in project root
3. Priority: .ts > .mjs > .json

#### 11. config/validator.ts
Validates configuration and merges with defaults.

**Validation**:
- Type checking for all config options
- Range validation (e.g., timeout > 0)
- Required field validation (e.g., API keys for cloud providers)
- Provides helpful error messages

**Default Values**:
```typescript
{
  extract: {
    targetLanguage: 'en',
    keyFormat: 'snake_case',
    maxKeyLength: 50,
    includeAttributes: ['placeholder', 'title', 'alt', 'label', 'aria-label'],
  },
  ai: {
    enabled: false,
    provider: 'ollama',
    model: 'codellama',
    timeout: 30000,
  },
  cleanup: {
    backup: true,
    pattern: '**/*.{vue,js,ts}',
  },
}
```

### AI Integration (NEW)

#### 12. ai/client.ts
LLM client for AI-powered translation.

**Supported Providers**:
- **Local**: Ollama, LM Studio, LocalAI
- **Cloud**: Anthropic (Claude), OpenAI (GPT)
- **Custom**: Any OpenAI-compatible API

**Provider-Specific Defaults**:
- Ollama: `http://localhost:11434`
- Anthropic: `https://api.anthropic.com`
- OpenAI: `https://api.openai.com`

**Features**:
- Translation to multiple languages
- JSON response parsing with fallback
- Timeout handling with AbortController
- Connection testing
- Confidence scoring

**Translation Example**:
```typescript
const client = new AIClient({
  enabled: true,
  provider: 'ollama',
  model: 'codellama',
  timeout: 30000,
})

const result = await client.translateText('Hello {name}', 'de', {
  key: 'greeting',
  sourceLanguage: 'en',
  category: 'common',
})
// result.translation: "Hallo {name}"
// result.confidence: 0.95
```

#### 12b. extract-strings/autoTranslate.ts (NEW)
Auto-translation orchestration for multilingual projects.

**Key Function**: `autoTranslate(options: AutoTranslateOptions)`

**Features**:
- Translates new extraction keys to multiple target languages
- Preserves existing translations (only translates new keys)
- Handles nested key structures with dot notation
- Creates translation files if they don't exist
- Creates backups before modifying existing files
- Graceful error handling (continues even if some translations fail)

**Process**:
1. Load source translation file (e.g., `en.json`)
2. For each target language (e.g., `['de', 'fr', 'nl']`):
   - Load or create target translation file
   - For each new key:
     - Skip if translation already exists
     - Call AI client to translate source text
     - Set translated value with nested structure
   - Write updated translation file
3. Report statistics and errors

**Example**:
```typescript
const result = await autoTranslate({
  sourceFile: '/locales/en.json',
  targetLanguages: ['de', 'fr'],
  aiClient,
  sourceLanguage: 'en',
  newKeys: new Map([
    ['greeting', 'Hello'],
    ['common.submit', 'Submit'],
  ]),
  backup: true,
  verbose: true,
})

// Creates/updates:
// - /locales/de.json with German translations
// - /locales/fr.json with French translations
```

**Language Code Mapping**:
Built-in language names for better translation quality:
- `en` → English, `de` → German, `fr` → French
- `es` → Spanish, `it` → Italian, `nl` → Dutch
- `pt` → Portuguese, `ru` → Russian, `ja` → Japanese
- `zh` → Chinese, `ko` → Korean, `ar` → Arabic, `hi` → Hindi

**Integration with Orchestrator**:
Auto-translation runs as optional Step 6 in the extraction pipeline when:
- `ai.languages` array is not empty
- AI client is available and configured (ai.enabled is true)

### CLI Integration

#### 13. cli.ts
CLI entry point with commander.js.

**CLI Options** (updated):
- `-t, --translation-file <path>`: Translation file or directory (optional, auto-detected)
- `-s, --src-path <path>`: Source files path (optional, auto-detected)
- `-c, --config <path>`: **NEW**: Config file path
- `--extract`: **NEW**: Enable extraction mode
- `-n, --dry-run`: Preview changes without writing
- `--no-backup`: Skip backup creation
- `-v, --verbose`: Show detailed output
- `-p, --pattern <glob>`: Custom file pattern (default: `**/*.{vue,js,ts}`)

**Modes**:
1. **Cleanup mode** (default): Remove unused translations
   - Single-file mode: Process one JSON file
   - Directory mode: Process all JSON files recursively
2. **Extract mode** (NEW): Convert raw strings to i18n
   - Requires a single translation file (not directory)
   - Runs full extraction pipeline

#### 14. cli-detection.ts
Auto-detection logic for translation and source paths.

**Detection Strategy** (priority order):
1. **Nuxt detection**: Checks for nuxt.config.{ts,mts,js,mjs} with @nuxtjs/i18n module
   - Nuxt 4 defaults: `app/` (source), `i18n/locales/` (translations)
   - Nuxt 3 defaults: `src/` or `app/` (source), `locales/` or `i18n/locales/` (translations)
2. **Vite detection**: Checks for vite.config with @intlify/unplugin-vue-i18n
   - Parses `include` option to find translations path
3. **Common paths fallback**: Standard directory conventions
   - Source: `src/`, `app/`, `client/`
   - Translations: `src/locales/`, `i18n/locales/`, `locales/`, `i18n/`, etc.
4. Returns detected paths with reason/explanation

#### 15. cli-style.ts
Terminal styling utilities.

**Provides**:
- Color functions (using kleur)
- Symbols (✓, ✖, ℹ, etc.)
- Separators and formatting helpers

### Type Definitions

**TranslationObject** (translations-cleanup/types.ts):
```typescript
interface TranslationObject {
  [key: string]: string | TranslationObject
}
```

**CleanupOptions** (translations-cleanup/types.ts):
```typescript
interface CleanupOptions {
  translationFile: string   // Path to JSON file
  srcPath: string           // Path to source files
  backup?: boolean          // Create .backup file (default: true)
  dryRun?: boolean          // Preview only (default: false)
  verbose?: boolean         // Detailed logging (default: false)
}
```

**ToolConfig** (NEW - config/types.ts):
```typescript
interface ToolConfig {
  translationFile?: string
  srcPath?: string
  extract?: ExtractConfig
  ai?: AIConfig
  cleanup?: CleanupConfig
}

interface ExtractConfig {
  targetLanguage?: string          // default: 'en'
  i18nPatterns?: I18nCustomPattern[]
  includeAttributes?: string[]
  excludePatterns?: string[]
  keyFormat?: 'snake_case' | 'camelCase' | 'kebab-case' | 'dot.case'
  maxKeyLength?: number
  interactive?: boolean
  ignorePattern?: string           // Regex pattern to ignore strings
  ignoreText?: string[]            // Exact strings to ignore
}

interface AIConfig {
  enabled: boolean
  provider?: 'ollama' | 'anthropic' | 'openai' | 'lmstudio' | 'localai' | 'custom'
  baseUrl?: string
  model?: string
  apiKey?: string
  timeout?: number
  headers?: Record<string, string>
  languages?: string[]               // Auto-translate to these languages (e.g., ['de', 'fr', 'nl'])
}
```

**RawStringLocation** (NEW - extract-strings/types.ts):
```typescript
interface RawStringLocation {
  text: string
  file: string
  line: number
  column: number
  context: 'template' | 'script' | 'attribute'
  attributeName?: string
  confidence: 'high' | 'medium' | 'low'
}
```

**I18nCustomPattern** (NEW - config/types.ts):
```typescript
interface I18nCustomPattern {
  pattern: RegExp | string              // Pattern to detect in existing code
  functionName: string                  // Translation function name (e.g., 't')
  importTemplate: string                // Usage pattern to inject (e.g., 'const { t } = useI18n()')
  importStatement?: string              // Import statement to add (e.g., "import { useI18n } from 'vue-i18n'")
  injectLocation?: 'script-setup' | 'script-top' | 'composable'
}
```

**How importStatement works**:
- **Config-first**: If `importStatement` is provided in config, it's used explicitly
- **Auto-detection**: If not provided, the tool scans existing files to detect the import
- **Injection**: When extracting strings, both the import and usage pattern are added to files
- **Blank line**: A blank line is automatically added between the import and usage pattern

## Coding Conventions

### TypeScript Style
- **Strict mode enabled**: All type checking features on
- **Explicit types**: Function parameters and return types clearly typed
- **No `any` types**: Prefer proper typing or `unknown`
- **ES2020 features**: Modern JavaScript syntax

### ESLint Rules
- Following @antfu/eslint-config conventions
- No semicolons (statement-ending)
- Single quotes for strings
- 2-space indentation
- Trailing commas in multi-line structures

### File Naming
- **Dash-case** for multi-word files: `cli-detection.ts`, `cli-style.ts`
- **camelCase** for single-word modules: `fileScanner.ts`, `patterns.ts`
- **Test files**: `*.test.ts` suffix

### Import Conventions
- Node built-ins with `node:` prefix: `import fs from 'node:fs'`
- Type imports: `import type { ... }`
- Path alias: `@/` for `src/` directory

### Code Organization
- **Separation of concerns**: CLI logic separate from core logic
- **Single responsibility**: Each module has a clear, focused purpose
- **Testability**: Core logic independent of CLI for easy testing
- **Feature isolation**: Extraction feature in separate directory

## Testing Guidelines

### Test Structure
- **Setup file**: `tests/setup.ts` for shared configuration
- **Descriptive names**: Clear test descriptions
- **Arrange-Act-Assert**: Standard test pattern
- **Isolation**: Tests use `memfs` for virtual file systems

### Test Categories
1. **Unit tests**: Core logic (translationUtils, patterns, keyGenerator)
2. **Integration tests**: Full cleanup/extraction workflows
3. **CLI tests**: Command-line interface behavior
4. **Edge cases**: Boundary conditions and error handling
5. **NEW**: Extraction pipeline tests
6. **NEW**: Config loading and validation tests
7. **NEW**: AI client integration tests

### Test Isolation with memfs
All file system operations in tests use `memfs` to create virtual file systems:

```typescript
import { vol } from 'memfs'

// Mock the file system
const { vol } = vi.hoisted(() => {
  const { vol } = require('memfs')
  return { vol }
})

vi.mock('node:fs', () => ({ default: vol }))
vi.mock('node:fs/promises', () => vol.promises)

beforeEach(() => {
  vol.reset()  // Clear virtual file system
  vol.mkdirSync('/test', { recursive: true })
})
```

This ensures:
- Perfect test isolation
- No file system collisions
- Fast test execution
- No cleanup needed

### Running Tests
```bash
# All tests (154 total)
yarn test

# Watch mode (if configured)
yarn test --watch

# Coverage (if configured)
yarn test --coverage

# Specific test file
yarn test config/loader
```

## Important Patterns and Behaviors

### 1. Parent Prefix Matching
When a parent key is used (e.g., `t('user')`), all child keys (`user.name`, `user.email`) are considered used. This prevents accidental deletion of grouped translations.

### 2. Dynamic Keys Are Ignored
Keys constructed dynamically (e.g., `t(variableName)` or `t(\`prefix.\${type}\`)`) are NOT detected to avoid false positives. This is intentional and documented.

### 3. Backup Strategy
- Backups created before any write operation
- Backup filename: `<original>.backup`
- Can be disabled with `--no-backup` flag
- Applied to both translation files and source files

### 4. Pruning Behavior
- Automatic removal of empty objects after key deletion
- Recursive pruning up the tree
- Prune-only mode when no unused keys but empty groups exist

### 5. Multi-line Support
Regex patterns support multi-line translation keys in function calls:
```javascript
t(
  'very.long.translation.key'
)
```

### 6. Heuristic-based String Detection (NEW)
The extraction feature uses heuristics to avoid false positives:
- Filters out URLs, hex colors, CSS classes
- Filters out email addresses, file paths
- Prioritizes natural language (multiple words, spaces)
- Confidence levels guide which strings to extract

### 7. AI Fallback Strategy (NEW)
When AI is enabled but fails:
- Falls back to heuristic-based key generation
- Logs warning but continues execution
- Timeout handling prevents hanging
- Graceful degradation ensures feature always works

### 8. Config File Priority (NEW)
Configuration sources in order of priority:
1. CLI arguments (highest priority)
2. Explicit config file (--config flag)
3. Auto-detected config file
4. Default values (lowest priority)

## Working with This Codebase

### For Bug Fixes
1. **Identify affected module**: Check src/translations-cleanup/ for cleanup, src/extract-strings/ for extraction
2. **Write/update tests**: Add test case reproducing the bug
3. **Run tests**: Ensure fix resolves issue without breaking existing tests (all 154 must pass)
4. **Update patterns**: If detection bug, modify patterns.ts or rawStringDetector.ts
5. **Test CLI**: Verify CLI behavior with both modes and all flags

### For New Features
1. **Core logic first**: Add functionality to appropriate src/ directory
2. **Add tests**: Comprehensive test coverage required (use memfs for file system tests)
3. **Update CLI**: Add new options/flags if needed
4. **Update types**: Extend interfaces if adding new options
5. **Update config**: Add to config system if user-configurable
6. **Document**: Update README.md and CLAUDE.md with new feature details
7. **Consider backwards compatibility**: Maintain existing behavior

### For Pattern Updates
When adding support for new translation patterns:
1. **Update patterns.ts**: Add new regex pattern for cleanup
2. **Update i18nPatternDetector.ts**: Add pattern for extraction auto-detection
3. **Add tests**: Create comprehensive test cases
4. **Test edge cases**: Multi-line, different quotes, nested structures
5. **Update README**: Document new detection capability

### For AI Provider Support (NEW)
When adding a new AI provider:
1. **Update AIConfig type**: Add provider to union type
2. **Add provider case in ai/client.ts**: Implement API call format
3. **Add response extraction**: Implement response parsing
4. **Add tests**: Mock API responses and test
5. **Update docs**: Document provider setup

### Common Pitfall: Regex Capturing Groups
The patterns use various capturing groups. When adding patterns:
- Ensure you capture only the translation key (first argument)
- Use non-capturing groups `(?:...)` for grouping without capture
- Test with different quote types and multi-line strings

### Auto-detection Updates
When improving auto-detection (cli-detection.ts):
1. **Maintain priority chain**: Nuxt detection -> Vite detection -> common conventions
2. **Return reason**: Helpful for debugging and verbose mode
3. **Add tests**: Update cli-autodetect-usage.test.ts and cli-detection.test.ts
4. **Consider new frameworks**: Support additional build tools/configs (currently supports Nuxt 3/4 and Vite)

### Config System Updates (NEW)
When adding new config options:
1. **Update config/types.ts**: Add to appropriate interface
2. **Update config/validator.ts**: Add validation rules
3. **Add tests**: Test validation and defaults
4. **Update example**: Add to vue-translations-cleanup.config.example.ts
5. **Document**: Update README with new option

## Release Checklist

Before releasing a new version:
- [ ] All tests pass (`yarn test`) - **176/176 tests must pass**
- [ ] Linter passes (`yarn lint`)
- [ ] README.md updated with new features/changes
- [ ] CLAUDE.md updated with technical details
- [ ] Version bumped appropriately (patch/minor/major)
- [ ] CHANGELOG.md updated (via conventional commits)
- [ ] Build succeeds (`yarn build`)
- [ ] Manual testing of CLI with real projects
- [ ] Test both cleanup and extraction modes
- [ ] Test config file loading
- [ ] Test with and without AI enabled

## Environment Requirements

- **Node.js**: 18+ (release builds use Node 18)
- **Package Manager**: yarn (preferred), npm, or pnpm supported
- **OS**: Cross-platform (Linux, macOS, Windows)
- **Optional**: Ollama or other LLM for AI features

## Helpful Commands Reference

```bash
# Development
yarn install              # Install dependencies
yarn build                # Build TypeScript
yarn test                 # Run tests (176 tests)
yarn lint                 # Lint code

# Release (manual)
yarn release:patch        # Patch version bump
yarn release:minor        # Minor version bump
yarn release:major        # Major version bump
yarn changelog            # Generate changelog

# CLI Usage Examples - Cleanup Mode
npx vue-translations-cleanup                                    # Auto-detect
npx vue-translations-cleanup -t ./locales/en.json -s ./src      # Manual paths
npx vue-translations-cleanup -t ./locales -s ./src              # Directory mode
npx vue-translations-cleanup --dry-run --verbose                # Preview with details

# CLI Usage Examples - Extract Mode (NEW)
npx vue-translations-cleanup --extract                          # Auto-detect, extract strings
npx vue-translations-cleanup --extract --config ./my-config.ts  # Use config file
npx vue-translations-cleanup --extract --dry-run --verbose      # Preview extraction
npx vue-translations-cleanup --extract -t ./locales/en.json -s ./src  # Manual paths
```

## Key Files to Review for Context

When starting work, review these files first:
1. **README.md** - User-facing documentation and features
2. **CLAUDE.md** - This file - technical documentation
3. **package.json** - Scripts, dependencies, project metadata
4. **src/translations-cleanup/index.ts** - Core cleanup algorithm
5. **src/extract-strings/orchestrator.ts** - NEW: Extraction pipeline
6. **src/cli.ts** - CLI interface and options (both modes)
7. **src/config/types.ts** - NEW: Config system types
8. **tests/extract-strings/*.test.ts** - NEW: Extraction feature tests
9. **vue-translations-cleanup.config.example.ts** - NEW: Config file example

## Tips for AI Assistants

1. **Test-driven approach**: Always check/add tests when modifying core logic. **All 176 tests must pass.**
2. **Preserve backwards compatibility**: Existing CLI behavior should not break
3. **Pattern precision**: Be careful with regex patterns - test thoroughly
4. **Documentation updates**: Keep README.md and CLAUDE.md in sync with code changes
5. **Type safety**: Maintain strict TypeScript typing throughout
6. **Error messages**: Provide clear, actionable error messages for users
7. **Performance**: Consider performance when scanning large codebases
8. **Cross-platform**: Ensure file paths work on Windows, Linux, and macOS
9. **Conventional commits**: Follow conventional commit format for changelog
10. **CLI UX**: Maintain clear, helpful CLI output with appropriate verbosity levels
11. **NEW: Test isolation**: Always use memfs for file system tests
12. **NEW: Config validation**: Validate all config options thoroughly
13. **NEW: AI graceful degradation**: Ensure extraction works even if AI fails
14. **NEW: Feature flags**: Keep cleanup and extraction modes separate and independent

## Common Workflows

### Adding a New Heuristic for String Detection
1. Update `rawStringDetector.ts` `isLikelyTranslatable()` function
2. Add test cases in `tests/extract-strings/rawStringDetector.test.ts`
3. Run tests to ensure no regressions
4. Document in README if it affects user-visible behavior

### Adding a New Key Format
1. Update `ExtractConfig` type in `config/types.ts`
2. Add format case in `keyGenerator.ts` `formatKey()` function
3. Add tests in `tests/extract-strings/keyGenerator.test.ts`
4. Update config validator defaults
5. Update example config file

### Debugging Test Failures
1. Check if tests use memfs properly (virtual file system)
2. Ensure `vol.reset()` in beforeEach/afterEach
3. Verify mocked modules are hoisted with `vi.hoisted()`
4. Check test isolation (tests shouldn't affect each other)
5. Run single test file to isolate issue

---

Last Updated: 2025-11-16 (for version 1.4.0 with extraction feature)
