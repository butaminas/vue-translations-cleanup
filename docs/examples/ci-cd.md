# CI/CD Integration

Integrate translation cleanup into your CI/CD pipeline.

## GitHub Actions

```yaml
name: Check Translations

on: [pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 18
      - name: Check unused translations
        run: npx vue-translations-cleanup --dry-run
```

## GitLab CI

```yaml
check-translations:
  script:
    - npx vue-translations-cleanup --dry-run
```

See [Cleanup Mode](/guide/cleanup-mode) for more CI/CD examples.
