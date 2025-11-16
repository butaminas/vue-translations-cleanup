# Custom i18n Patterns

Configure custom i18n patterns for non-standard setups.

## Example

```typescript
// vue-translations-cleanup.config.ts
export default {
  extract: {
    i18nPatterns: [
      {
        pattern: /const\s*{\s*translate\s*}\s*=\s*useTranslation\(\)/,
        functionName: 'translate',
        importTemplate: 'const { translate } = useTranslation()',
        injectLocation: 'script-setup',
      },
    ],
  },
}
```

See [Config File](/guide/config-file) for more details.
