# CLAUDE.md

This document provides a comprehensive guide for AI assistants working with the `vue-translations-cleanup` codebase. It covers the project structure, development workflows, coding conventions, and key patterns.

## Project Overview

**vue-translations-cleanup** is a CLI tool designed to find and remove unused translation keys in Vue.js i18n projects. It primarily targets the official vue-i18n (Intlify) library but may work with compatible i18n libraries.

### Key Features
- Auto-detection of source and translation paths (Vite + @intlify/unplugin-vue-i18n)
- Advanced translation detection (t(), $t(), rt(), $rt(), tc(), $tc(), Composition API)
- Support for Vue template directives (v-t) and components (<i18n-t>)
- Safe updates with automatic backups
- Dry-run mode for previewing changes
- Automatic pruning of empty objects after deletions
- Both single-file and directory-wide cleanup support

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
│   ├── cli.ts                        # CLI entry point and command handling
│   ├── cli-detection.ts              # Auto-detection logic for paths
│   └── cli-style.ts                  # CLI styling utilities (colors, symbols)
├── tests/                            # Test files
│   ├── translations-cleanup/         # Core functionality tests
│   │   ├── edgeCases.test.ts         # Edge case testing
│   │   ├── pruning.test.ts           # Empty object pruning tests
│   │   ├── nestedTranslations.test.ts # Nested key handling
│   │   ├── nestedParams.test.ts      # Nested parameter tests
│   │   ├── vueTemplateDirectives.test.ts # Vue template usage tests
│   │   ├── validation.test.ts        # Input validation tests
│   │   └── translationPatterns.test.ts # Pattern detection tests
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
├── README.md                         # User documentation
├── CHANGELOG.md                      # Version history
└── LICENSE                           # MIT License
```

## Technology Stack

### Core Dependencies
- **commander** (^14.0.0) - CLI argument parsing
- **glob** (^11.0.3) - File pattern matching
- **kleur** (^4.1.5) - Terminal color styling

### Development Dependencies
- **TypeScript** (^5.9.2) - Type-safe development
- **Vitest** (^3.2.4) - Unit testing framework
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

**Test Framework**: Vitest

```bash
# Run all tests
yarn test

# Tests are located in tests/ directory
# Setup file: tests/setup.ts
# Pattern: tests/**/*.test.{ts,js}
```

**Test Coverage Areas**:
- Core translation cleanup logic
- Pattern matching and detection
- Nested key handling
- Empty object pruning
- CLI interface and options
- Auto-detection functionality
- Directory mode processing
- Vue template directives and components

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

### Core Modules

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

#### 5. cli.ts
CLI entry point with commander.js.

**CLI Options**:
- `-t, --translation-file <path>`: Translation file or directory (optional, auto-detected)
- `-s, --src-path <path>`: Source files path (optional, auto-detected)
- `-n, --dry-run`: Preview changes without writing
- `--no-backup`: Skip backup creation
- `-v, --verbose`: Show detailed output
- `-p, --pattern <glob>`: Custom file pattern (default: `**/*.{vue,js,ts}`)

**Modes**:
1. **Single-file mode**: Process one JSON file
2. **Directory mode**: Process all JSON files in directory recursively

#### 6. cli-detection.ts
Auto-detection logic for translation and source paths.

**Detection Strategy**:
- Checks for Vite config with @intlify/unplugin-vue-i18n
- Falls back to common folder conventions (src/, src/locales/, etc.)
- Returns detected paths with reason/explanation

#### 7. cli-style.ts
Terminal styling utilities.

**Provides**:
- Color functions (using kleur)
- Symbols (✓, ✖, ℹ, etc.)
- Separators and formatting helpers

### Type Definitions

**TranslationObject** (types.ts):
```typescript
interface TranslationObject {
  [key: string]: string | TranslationObject
}
```
Recursive structure allowing nested translation keys.

**CleanupOptions** (types.ts):
```typescript
interface CleanupOptions {
  translationFile: string   // Path to JSON file
  srcPath: string           // Path to source files
  backup?: boolean          // Create .backup file (default: true)
  dryRun?: boolean          // Preview only (default: false)
  verbose?: boolean         // Detailed logging (default: false)
}
```

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

## Testing Guidelines

### Test Structure
- **Setup file**: `tests/setup.ts` for shared configuration
- **Descriptive names**: Clear test descriptions
- **Arrange-Act-Assert**: Standard test pattern
- **Isolation**: Tests should not depend on each other

### Test Categories
1. **Unit tests**: Core logic (translationUtils, patterns)
2. **Integration tests**: Full cleanup workflow
3. **CLI tests**: Command-line interface behavior
4. **Edge cases**: Boundary conditions and error handling

### Running Tests
```bash
# All tests
yarn test

# Watch mode (if configured)
yarn test --watch

# Coverage (if configured)
yarn test --coverage
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

## Working with This Codebase

### For Bug Fixes
1. **Identify affected module**: Check src/translations-cleanup/ for core logic
2. **Write/update tests**: Add test case reproducing the bug
3. **Run tests**: Ensure fix resolves issue without breaking existing tests
4. **Update patterns**: If detection bug, modify patterns.ts regex
5. **Test CLI**: Verify CLI behavior with both single-file and directory modes

### For New Features
1. **Core logic first**: Add functionality to src/translations-cleanup/
2. **Add tests**: Comprehensive test coverage required
3. **Update CLI**: Add new options/flags if needed
4. **Update types**: Extend interfaces if adding new options
5. **Document**: Update README.md with new feature details
6. **Consider backwards compatibility**: Maintain existing behavior

### For Pattern Updates
When adding support for new translation patterns:
1. **Update patterns.ts**: Add new regex pattern
2. **Add tests**: Create tests/translations-cleanup/newPattern.test.ts
3. **Test edge cases**: Multi-line, different quotes, nested structures
4. **Update README**: Document new detection capability

### Common Pitfall: Regex Capturing Groups
The patterns use various capturing groups. When adding patterns:
- Ensure you capture only the translation key (first argument)
- Use non-capturing groups `(?:...)` for grouping without capture
- Test with different quote types and multi-line strings

### Auto-detection Updates
When improving auto-detection (cli-detection.ts):
1. **Maintain fallback chain**: Specific detection -> common conventions
2. **Return reason**: Helpful for debugging and verbose mode
3. **Add tests**: Update cli-autodetect-usage.test.ts
4. **Consider new frameworks**: Support additional build tools/configs

## Release Checklist

Before releasing a new version:
- [ ] All tests pass (`yarn test`)
- [ ] Linter passes (`yarn lint`)
- [ ] README.md updated with new features/changes
- [ ] Version bumped appropriately (patch/minor/major)
- [ ] CHANGELOG.md updated (via conventional commits)
- [ ] Build succeeds (`yarn build`)
- [ ] Manual testing of CLI with real projects

## Environment Requirements

- **Node.js**: 18+ (release builds use Node 18)
- **Package Manager**: yarn (preferred), npm, or pnpm supported
- **OS**: Cross-platform (Linux, macOS, Windows)

## Helpful Commands Reference

```bash
# Development
yarn install              # Install dependencies
yarn build                # Build TypeScript
yarn test                 # Run tests
yarn lint                 # Lint code

# Release (manual)
yarn release:patch        # Patch version bump
yarn release:minor        # Minor version bump
yarn release:major        # Major version bump
yarn changelog            # Generate changelog

# CLI Usage Examples
npx vue-translations-cleanup                                    # Auto-detect
npx vue-translations-cleanup -t ./locales/en.json -s ./src      # Manual paths
npx vue-translations-cleanup -t ./locales -s ./src              # Directory mode
npx vue-translations-cleanup --dry-run --verbose                # Preview with details
```

## Key Files to Review for Context

When starting work, review these files first:
1. **README.md** - User-facing documentation and features
2. **package.json** - Scripts, dependencies, project metadata
3. **src/translations-cleanup/index.ts** - Core cleanup algorithm
4. **src/translations-cleanup/patterns.ts** - Detection patterns
5. **src/cli.ts** - CLI interface and options
6. **tests/translations-cleanup/*.test.ts** - Test examples and expected behavior

## Tips for AI Assistants

1. **Test-driven approach**: Always check/add tests when modifying core logic
2. **Preserve backwards compatibility**: Existing CLI behavior should not break
3. **Pattern precision**: Be careful with regex patterns - test thoroughly
4. **Documentation updates**: Keep README.md in sync with code changes
5. **Type safety**: Maintain strict TypeScript typing throughout
6. **Error messages**: Provide clear, actionable error messages for users
7. **Performance**: Consider performance when scanning large codebases
8. **Cross-platform**: Ensure file paths work on Windows, Linux, and macOS
9. **Conventional commits**: Follow conventional commit format for changelog
10. **CLI UX**: Maintain clear, helpful CLI output with appropriate verbosity levels

---

Last Updated: 2025-11-16 (for version 1.4.0)
