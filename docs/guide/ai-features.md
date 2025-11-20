# AI Features

Enhance extraction with AI-powered key generation and automatic translation.

## Overview

AI integration provides:
- 🧠 Context-aware translation key generation
- 🌍 Auto-translate to multiple languages
- 🏠 Local or cloud AI providers
- ⚡ Fast with graceful fallbacks

## Why Use AI?

**Without AI:**
```
"Submit your application" → form.submit_your_application
```

**With AI:**
```
"Submit your application" → application.submit_button
```

AI understands:
- Semantic meaning
- File/component context
- Common i18n conventions
- Natural groupings

## AI Providers

### Local Providers (Free)

Run AI models locally for privacy and cost savings.

#### Ollama (Recommended)

**Setup:**
1. Install Ollama: [https://docs.ollama.com/quickstart](https://docs.ollama.com/quickstart)
2. Pull a model:
   ```bash
   ollama pull codellama
   ollama pull deepseek-coder
   ollama pull llama3
   ```

**Config:**
```typescript
{
  ai: {
    enabled: true,
    provider: 'ollama',
    model: 'codellama',
    baseUrl: 'http://localhost:11434',
    timeout: 30000
  }
}
```

**Recommended models:**
- `codellama` - Fast, good for code
- `deepseek-coder` - Better context understanding
- `llama3` - General purpose, slower

#### LM Studio

**Setup:**
1. Download LM Studio: https://lmstudio.ai
2. Load a model
3. Start local server

**Config:**
```typescript
{
  ai: {
    enabled: true,
    provider: 'lmstudio',
    baseUrl: 'http://localhost:1234',
    model: 'local-model'
  }
}
```

#### LocalAI

Self-hosted OpenAI-compatible API.

**Config:**
```typescript
{
  ai: {
    enabled: true,
    provider: 'localai',
    baseUrl: 'http://localhost:8080',
    model: 'gpt-3.5-turbo'
  }
}
```

### Cloud Providers

For best results with auto-translation.

#### Anthropic (Claude)

**Setup:**
1. Get API key: https://console.anthropic.com
2. Set environment variable:
   ```bash
   export ANTHROPIC_API_KEY=sk-ant-...
   ```

**Config:**
```typescript
{
  ai: {
    enabled: true,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 30000
  }
}
```

**Recommended models:**
- `claude-3-5-sonnet-20241022` - Best balance
- `claude-3-opus-20240229` - Highest quality
- `claude-3-haiku-20240307` - Fastest, cheapest

#### OpenAI (GPT)

**Setup:**
1. Get API key: https://platform.openai.com
2. Set environment variable:
   ```bash
   export OPENAI_API_KEY=sk-...
   ```

**Config:**
```typescript
{
  ai: {
    enabled: true,
    provider: 'openai',
    model: 'gpt-4',
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 30000
  }
}
```

**Recommended models:**
- `gpt-4` - Best quality
- `gpt-4-turbo` - Faster, cheaper
- `gpt-3.5-turbo` - Fast, economical

### Custom Provider

Any OpenAI-compatible API:

```typescript
{
  ai: {
    enabled: true,
    provider: 'custom',
    baseUrl: 'https://your-api.com/v1',
    model: 'your-model',
    apiKey: 'your-key',
    headers: {
      'X-Custom-Header': 'value'
    }
  }
}
```

## Key Generation

AI analyzes context to generate better keys:

**File context:**
```vue
<!-- File: src/components/auth/LoginForm.vue -->
<button>Sign in</button>
```

AI generates: `auth.login.signin_button`

**Nearby code:**
```vue
<script setup>
const { t } = useI18n()
const loginError = ref('')
</script>

<template>
  <p>Invalid credentials</p>
</template>
```

AI generates: `auth.login.invalid_credentials_error`

**Semantic understanding:**
```vue
<button>Add to cart</button>
```

AI generates: `cart.add_item_button` (not `button.add_to_cart`)

## Auto-Translation

Automatically translate extracted keys to multiple languages.

### Setup

```typescript
{
  ai: {
    enabled: true,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,

    // Auto-translation: just add target languages
    languages: ['de', 'fr', 'es', 'nl']
  },
  extract: {
    targetLanguage: 'en'
  }
}
```

### How It Works

When you run extraction:

```bash
npx vue-translations-cleanup --extract
```

**Step 1:** Extract strings to English (targetLanguage):
```json
// locales/en.json
{
  "common": {
    "submit": "Submit"
  }
}
```

**Step 2:** Auto-translate to other languages:
```json
// locales/de.json
{
  "common": {
    "submit": "Absenden"
  }
}

// locales/fr.json
{
  "common": {
    "submit": "Soumettre"
  }
}

// locales/es.json
{
  "common": {
    "submit": "Enviar"
  }
}
```

### Features

✅ **Preserves existing translations**
   - Only translates new keys
   - Won't overwrite manual translations

✅ **Maintains placeholders**
   ```
   "Hello {name}" → "Hallo {name}" (German)
   ```

✅ **Professional quality**
   - Context-aware translations
   - Idiomatic expressions
   - Proper formality levels

✅ **Handles nested structures**
   ```json
   {
     "common": {
       "buttons": {
         "submit": "Absenden"
       }
     }
   }
   ```

### Supported Languages

Full language name mapping for better quality:

```
en → English    de → German      fr → French
es → Spanish    it → Italian     nl → Dutch
pt → Portuguese ru → Russian     ja → Japanese
zh → Chinese    ko → Korean      ar → Arabic
hi → Hindi
```

Add any ISO 639-1 language code.

## Configuration Examples

### Minimal (Local AI)

```typescript
// vue-translations-cleanup.config.ts
export default {
  ai: {
    enabled: true
    // Uses Ollama defaults
  }
}
```

### Full Configuration

```typescript
export default {
  extract: {
    targetLanguage: 'en',
    keyFormat: 'snake_case'
  },

  ai: {
    enabled: true,
    provider: 'anthropic',
    model: 'claude-3-5-sonnet-20241022',
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 30000,

    // Auto-translation: just add target languages
    languages: ['de', 'fr', 'es', 'it', 'nl'],

    // Exclude brand names, legal terms, etc.
    excludeFromTranslation: ['app.name', 'company.*']
  }
}
```

### Multiple Providers

Use different providers for different tasks:

```typescript
export default {
  ai: {
    enabled: true,

    // Fast local model for key generation
    provider: 'ollama',
    model: 'codellama',

    // For auto-translation, could use cloud API
    // by switching config or using environment variables
  }
}
```

## Performance

### Local Models

**Ollama (codellama):**
- Key generation: ~500ms per key
- Translation: ~1s per translation
- Cost: Free
- Privacy: 100% local

**LM Studio:**
- Similar to Ollama
- GPU acceleration support
- Custom model loading

### Cloud Models

**Anthropic Claude:**
- Key generation: ~300ms per key
- Translation: ~500ms per translation
- Cost: ~$0.01 per 1000 translations
- Quality: Excellent

**OpenAI GPT:**
- Key generation: ~400ms per key
- Translation: ~600ms per translation
- Cost: ~$0.02 per 1000 translations (GPT-4)
- Quality: Excellent

## Best Practices

### 1. Start with Local AI

Test with free local models ([install Ollama first](https://docs.ollama.com/quickstart)):
```bash
ollama pull codellama
```

### 2. Use Cloud for Production

Cloud AI provides better quality for auto-translation.

### 3. Cache Translations

Once translated, keys are cached in JSON files.

### 4. Review AI Output

Always review AI-generated keys and translations.

### 5. Set Timeouts

Prevent hanging on slow responses:
```typescript
{
  ai: {
    timeout: 30000 // 30 seconds
  }
}
```

## Troubleshooting

### "Connection refused"

Ollama not running:
```bash
ollama serve
```

### "API key required"

Set environment variable:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
```

### Slow performance

- Use faster models (codellama, claude-haiku, gpt-3.5-turbo)
- Reduce timeout
- Process fewer files at once

### Translation quality issues

- Use cloud providers (Anthropic, OpenAI)
- Provide more context in code
- Review and manually adjust

## Graceful Degradation

If AI fails, the tool falls back:

```
[WARNING] AI key generation failed, using heuristic approach
```

**AI failure → Heuristic fallback**
- Extraction still works
- Keys generated from string content
- No errors or crashes

This ensures the tool always works, with or without AI.

## Cost Estimates

### Free Options
- ✅ Ollama: $0
- ✅ LM Studio: $0
- ✅ LocalAI: $0 (self-hosted)

### Cloud Options (per 1000 operations)

**Anthropic:**
- Claude Sonnet: ~$0.01
- Claude Haiku: ~$0.003

**OpenAI:**
- GPT-4: ~$0.02
- GPT-3.5-turbo: ~$0.002

**Example project:**
- 500 strings extracted
- 3 target languages
- Total: 500 + (500 × 3) = 2000 operations
- Cost with Claude Sonnet: ~$0.02
- Cost with GPT-3.5: ~$0.004

## Next Steps

- [Config File](/guide/config-file) - Full AI configuration options
- [Examples](/examples/vue-3-vite) - See AI in action
- [API Reference](/api/extraction) - Programmatic usage
