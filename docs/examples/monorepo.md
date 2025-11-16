# Monorepo Setup

Example for monorepo projects.

## Structure

```
my-monorepo/
├── packages/
│   ├── web/
│   │   ├── src/
│   │   └── locales/
│   └── mobile/
│       ├── src/
│       └── locales/
```

## Usage

Run from each package:

```bash
cd packages/web
npx vue-translations-cleanup

cd packages/mobile
npx vue-translations-cleanup
```

Or create package-specific configs.
