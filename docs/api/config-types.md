# Configuration Types

TypeScript type definitions for configuration.

## Import

```typescript
import type {
  ToolConfig,
  ExtractConfig,
  AIConfig,
  CleanupConfig,
} from 'vue-translations-cleanup/config'
```

## Types

### ToolConfig

```typescript
interface ToolConfig {
  translationFile?: string
  srcPath?: string
  extract?: ExtractConfig
  ai?: AIConfig
  cleanup?: CleanupConfig
}
```

### ExtractConfig

```typescript
interface ExtractConfig {
  targetLanguage?: string
  i18nPatterns?: I18nCustomPattern[]
  includeAttributes?: string[]
  excludePatterns?: string[]
  keyFormat?: 'snake_case' | 'camelCase' | 'kebab-case' | 'dot.case'
  maxKeyLength?: number
  interactive?: boolean
  ignorePattern?: string
  ignoreText?: string[]
}
```

### AIConfig

```typescript
interface AIConfig {
  enabled?: boolean
  provider?: 'ollama' | 'anthropic' | 'openai' | 'lmstudio' | 'localai' | 'custom'
  baseUrl?: string
  model?: string
  apiKey?: string
  timeout?: number
  headers?: Record<string, string>
  languages?: string[]
  excludeFromTranslation?: string[]
}
```

### CleanupConfig

```typescript
interface CleanupConfig {
  backup?: boolean
  verbose?: boolean
  dryRun?: boolean
  pattern?: string
}
```

See [Config File Guide](/guide/config-file) for usage examples.
