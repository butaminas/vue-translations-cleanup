# Extraction API

Programmatic API for extraction mode.

## Import

```typescript
import { runExtraction } from 'vue-translations-cleanup/extract-strings'
```

## Function Signature

```typescript
async function runExtraction(
  options: ExtractOptions
): Promise<ExtractResult>
```

## Options

```typescript
interface ExtractOptions {
  translationFile: string
  srcPath: string
  config: ToolConfig
  dryRun?: boolean
  interactive?: boolean
  verbose?: boolean
}
```

## Result

```typescript
interface ExtractResult {
  rawStrings: RawStringLocation[]
  generatedKeys: Map<string, string>
  filesModified: string[]
  totalExtracted: number
  duplicates: Array<{
    text: string
    key: string
    locations: RawStringLocation[]
  }>
}
```

## Example

```typescript
import { runExtraction } from 'vue-translations-cleanup/extract-strings'
import { mergeWithDefaults } from 'vue-translations-cleanup/config'

const config = mergeWithDefaults({
  extract: {
    targetLanguage: 'en',
    confidence: 'high',
  },
})

const result = await runExtraction({
  translationFile: './locales/en.json',
  srcPath: './src',
  config,
  dryRun: false,
  verbose: true,
})

console.log(`Extracted ${result.totalExtracted} strings`)
console.log(`Modified ${result.filesModified.length} files`)
```

See [Extract Mode Guide](/guide/extract-mode) for more details.
