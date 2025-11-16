import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'node:path'

const { vol } = vi.hoisted(() => {
  const { vol } = require('memfs')
  return { vol }
})

vi.mock('node:fs', () => ({ default: vol }))
vi.mock('node:fs/promises', () => vol.promises)

vi.mock('glob', async (importOriginal) => {
  return {
    glob: async (pattern: string, options: any) => {
      const cwd = options?.cwd || process.cwd()
      const files: string[] = []

      const collectFiles = (dir: string) => {
        try {
          const entries = vol.readdirSync(dir, { withFileTypes: true }) as any[]
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            if (entry.isDirectory()) {
              collectFiles(fullPath)
            }
            else if (entry.isFile()) {
              if (pattern.includes('**/*.json') && fullPath.endsWith('.json')) {
                const relativePath = path.relative(cwd, fullPath)
                files.push(options?.absolute ? fullPath : relativePath)
              }
            }
          }
        }
        catch (err) {
          // Directory doesn't exist, skip
        }
      }

      collectFiles(cwd)
      return files
    },
  }
})

describe('cli-detection', () => {
  beforeEach(() => {
    vol.reset()
    vol.mkdirSync('/test', { recursive: true })
  })

  afterEach(() => {
    vol.reset()
    vi.resetModules()
  })

  describe('Nuxt detection', () => {
    it('detects Nuxt 4 project with app/ directory and i18n/locales/', async () => {
      vol.mkdirSync('/test/app', { recursive: true })
      vol.mkdirSync('/test/i18n/locales', { recursive: true })
      vol.writeFileSync('/test/nuxt.config.ts', `
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
  i18n: {
    locales: ['en', 'fr'],
  }
})
      `)
      vol.writeFileSync('/test/i18n/locales/en.json', '{}')

      const { detectConfig } = await import('@/cli-detection')
      const result = await detectConfig('/test')

      expect(result.srcPath).toBe('/test/app')
      expect(result.translationsPath).toBe('/test/i18n/locales')
    })

    it('detects Nuxt 3 project with src/ directory and locales/', async () => {
      vol.mkdirSync('/test/src', { recursive: true })
      vol.mkdirSync('/test/locales', { recursive: true })
      vol.writeFileSync('/test/nuxt.config.ts', `
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
})
      `)
      vol.writeFileSync('/test/locales/en.json', '{}')

      const { detectConfig } = await import('@/cli-detection')
      const result = await detectConfig('/test')

      expect(result.srcPath).toBe('/test/src')
      expect(result.translationsPath).toBe('/test/locales')
    })

    it('skips Nuxt config without @nuxtjs/i18n module', async () => {
      vol.mkdirSync('/test/app', { recursive: true })
      vol.mkdirSync('/test/src', { recursive: true })
      vol.mkdirSync('/test/locales', { recursive: true })
      vol.writeFileSync('/test/nuxt.config.ts', `
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwind'],
})
      `)
      vol.writeFileSync('/test/locales/en.json', '{}')

      const { detectConfig } = await import('@/cli-detection')
      const result = await detectConfig('/test')

      // Should fall back to common path detection
      expect(result.srcPath).toBeDefined()
      expect(result.translationsPath).toBe('/test/locales')
    })

    it('detects Nuxt with .mjs config file', async () => {
      vol.mkdirSync('/test/app', { recursive: true })
      vol.mkdirSync('/test/i18n/locales', { recursive: true })
      vol.writeFileSync('/test/nuxt.config.mjs', `
export default {
  modules: ['@nuxtjs/i18n'],
}
      `)
      vol.writeFileSync('/test/i18n/locales/en.json', '{}')

      const { detectConfig } = await import('@/cli-detection')
      const result = await detectConfig('/test')

      expect(result.srcPath).toBe('/test/app')
      expect(result.translationsPath).toBe('/test/i18n/locales')
    })
  })

  describe('Vite detection', () => {
    it('detects Vite project with @intlify/unplugin-vue-i18n', async () => {
      vol.mkdirSync('/test/src/locales', { recursive: true })
      vol.writeFileSync('/test/vite.config.ts', `
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
export default defineConfig({
  plugins: [
    VueI18nPlugin({
      include: 'src/locales/**'
    })
  ]
})
      `)
      vol.writeFileSync('/test/src/locales/en.json', '{}')

      const { detectConfig } = await import('@/cli-detection')
      const result = await detectConfig('/test')

      expect(result.srcPath).toBe('/test/src')
      expect(result.translationsPath).toBe('/test/src/locales')
    })
  })

  describe('Common path detection', () => {
    it('falls back to common paths when no config found', async () => {
      vol.mkdirSync('/test/src/locales', { recursive: true })
      vol.writeFileSync('/test/src/locales/en.json', '{}')

      const { detectConfig } = await import('@/cli-detection')
      const result = await detectConfig('/test')

      expect(result.srcPath).toBe('/test/src')
      expect(result.translationsPath).toBe('/test/src/locales')
    })

    it('detects i18n/locales as common path for Nuxt-style projects', async () => {
      vol.mkdirSync('/test/app', { recursive: true })
      vol.mkdirSync('/test/i18n/locales', { recursive: true })
      vol.writeFileSync('/test/i18n/locales/en.json', '{}')

      const { detectConfig } = await import('@/cli-detection')
      const result = await detectConfig('/test')

      expect(result.srcPath).toBe('/test/app')
      expect(result.translationsPath).toBe('/test/i18n/locales')
    })
  })

  describe('Priority order', () => {
    it('prioritizes Nuxt detection over Vite detection', async () => {
      vol.mkdirSync('/test/app', { recursive: true })
      vol.mkdirSync('/test/i18n/locales', { recursive: true })
      vol.mkdirSync('/test/src/locales', { recursive: true })

      // Both Nuxt and Vite config present
      vol.writeFileSync('/test/nuxt.config.ts', `
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n'],
})
      `)
      vol.writeFileSync('/test/vite.config.ts', `
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
export default defineConfig({
  plugins: [VueI18nPlugin({ include: 'src/locales/**' })]
})
      `)
      vol.writeFileSync('/test/i18n/locales/en.json', '{}')
      vol.writeFileSync('/test/src/locales/en.json', '{}')

      const { detectConfig } = await import('@/cli-detection')
      const result = await detectConfig('/test')

      // Should use Nuxt paths (app/ and i18n/locales/)
      expect(result.srcPath).toBe('/test/app')
      expect(result.translationsPath).toBe('/test/i18n/locales')
    })
  })
})
