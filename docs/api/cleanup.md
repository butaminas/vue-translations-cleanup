# Cleanup API

Programmatic API for cleanup mode.

## Import

```typescript
import { cleanupTranslations } from 'vue-translations-cleanup'
```

## Function Signature

```typescript
async function cleanupTranslations(
  options: CleanupOptions
): Promise<CleanupResult>
```

## Options

```typescript
interface CleanupOptions {
  translationFile: string   // Path to JSON file
  srcPath: string           // Path to source files
  backup?: boolean          // Create .backup file (default: true)
  dryRun?: boolean          // Preview only (default: false)
  verbose?: boolean         // Detailed logging (default: false)
}
```

## Result

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

## Example

```typescript
import { cleanupTranslations } from 'vue-translations-cleanup'

const result = await cleanupTranslations({
  translationFile: './locales/en.json',
  srcPath: './src',
  backup: true,
  dryRun: false,
  verbose: true,
})

console.log(`Removed ${result.unusedKeys} unused keys`)
console.log('Unused translations:', result.unusedTranslations)
```

See [Cleanup Mode Guide](/guide/cleanup-mode) for more details.
