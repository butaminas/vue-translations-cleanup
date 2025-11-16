# CLI Options

Complete reference for command-line options.

## Global Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--translation-file <path>` | `-t` | Translation file or directory | Auto-detected |
| `--src-path <path>` | `-s` | Source files path | Auto-detected |
| `--config <path>` | `-c` | Config file path | Auto-detected |
| `--dry-run` | `-n` | Preview without writing | `false` |
| `--no-backup` | | Skip backup creation | Backup enabled |
| `--verbose` | `-v` | Detailed output | `false` |
| `--help` | `-h` | Show help | |
| `--version` | `-V` | Show version | |

## Mode Options

| Option | Description | Default |
|--------|-------------|---------|
| `--extract` | Enable extraction mode | Cleanup mode |

## Cleanup Mode Options

| Option | Alias | Description | Default |
|--------|-------|-------------|---------|
| `--pattern <glob>` | `-p` | File pattern to scan | `**/*.{vue,js,ts}` |

## Usage Examples

### Cleanup Mode

```bash
# Auto-detect
npx vue-translations-cleanup

# Specify paths
npx vue-translations-cleanup -t ./locales/en.json -s ./src

# Custom pattern
npx vue-translations-cleanup -p "**/*.vue"

# Preview only
npx vue-translations-cleanup --dry-run --verbose

# No backup
npx vue-translations-cleanup --no-backup
```

### Extract Mode

```bash
# Auto-detect
npx vue-translations-cleanup --extract

# With config
npx vue-translations-cleanup --extract -c ./config.ts

# Preview
npx vue-translations-cleanup --extract --dry-run

# Verbose
npx vue-translations-cleanup --extract -v
```

## Option Details

### `--translation-file` / `-t`

Path to translation file or directory.

**Single file:**
```bash
npx vue-translations-cleanup -t ./locales/en.json
```

**Directory (cleanup mode only):**
```bash
npx vue-translations-cleanup -t ./locales
```

### `--src-path` / `-s`

Path to source files to scan.

```bash
npx vue-translations-cleanup -s ./src
npx vue-translations-cleanup -s ./app  # Nuxt 4
```

### `--config` / `-c`

Path to configuration file.

```bash
npx vue-translations-cleanup -c ./my-config.ts
```

### `--extract`

Enable extraction mode instead of cleanup mode.

```bash
npx vue-translations-cleanup --extract
```

### `--dry-run` / `-n`

Preview changes without modifying files.

```bash
npx vue-translations-cleanup --dry-run
```

### `--no-backup`

Skip automatic backup creation.

```bash
npx vue-translations-cleanup --no-backup
```

### `--verbose` / `-v`

Show detailed output including file-by-file processing.

```bash
npx vue-translations-cleanup -v
```

### `--pattern` / `-p`

Custom glob pattern for file matching (cleanup mode).

```bash
# Only Vue files
npx vue-translations-cleanup -p "**/*.vue"

# TypeScript only
npx vue-translations-cleanup -p "**/*.{ts,tsx}"
```

## Combining Options

```bash
# Verbose dry-run with custom paths
npx vue-translations-cleanup \
  -t ./i18n/locales/en.json \
  -s ./app \
  --dry-run \
  --verbose

# Extract with config and preview
npx vue-translations-cleanup \
  --extract \
  -c ./config.ts \
  --dry-run \
  -v
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error occurred |

## Next Steps

- [Config File](/guide/config-file) - Advanced configuration
- [Cleanup Mode](/guide/cleanup-mode) - Detailed cleanup guide
- [Extract Mode](/guide/extract-mode) - Detailed extraction guide
