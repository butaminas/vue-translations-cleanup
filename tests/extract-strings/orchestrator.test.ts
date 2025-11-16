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
              const ext = path.extname(fullPath)
              if (pattern.includes('**/*.{vue,js,ts') && ['.vue', '.js', '.ts', '.tsx', '.jsx'].includes(ext)) {
                files.push(options?.absolute ? fullPath : path.relative(cwd, fullPath))
              }
              else if (pattern.includes('**/*.json') && ext === '.json') {
                files.push(options?.absolute ? fullPath : path.relative(cwd, fullPath))
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

describe('extract-strings/orchestrator', () => {
  let consoleErrorSpy: any

  beforeEach(() => {
    vol.reset()
    vol.mkdirSync('/test', { recursive: true })
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vol.reset()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  describe('i18n pattern validation', () => {
    it('should return error when no i18n patterns are detected', async () => {
      // Setup: project with no i18n references
      vol.mkdirSync('/test/src', { recursive: true })
      vol.mkdirSync('/test/locales', { recursive: true })

      // Create a Vue file with raw strings but no i18n usage
      vol.writeFileSync('/test/src/App.vue', `
<template>
  <div>
    <h1>Hello World</h1>
    <p>This is a test</p>
  </div>
</template>

<script setup>
const message = 'Welcome'
</script>
      `)

      vol.writeFileSync('/test/locales/en.json', '{}')

      const { runExtraction } = await import('@/extract-strings/orchestrator')

      const result = await runExtraction({
        translationFile: '/test/locales/en.json',
        srcPath: '/test/src',
        config: {},
        dryRun: false,
        verbose: false,
      })

      // Should return empty result
      expect(result.rawStrings).toEqual([])
      expect(result.generatedKeys.size).toBe(0)
      expect(result.filesModified).toEqual([])
      expect(result.totalExtracted).toBe(0)

      // Should have printed error message
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('No i18n usage patterns found'),
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('const { t } = useI18n()'),
      )
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('$t('),
      )
    })

    it('should proceed when i18n patterns are detected', async () => {
      // Setup: project with i18n reference
      vol.mkdirSync('/test/src', { recursive: true })
      vol.mkdirSync('/test/locales', { recursive: true })

      // Create a Vue file WITH i18n usage
      vol.writeFileSync('/test/src/App.vue', `
<template>
  <div>
    <h1>{{ $t('existing.key') }}</h1>
    <p>Hello World</p>
  </div>
</template>

<script setup>
const message = 'Welcome'
</script>
      `)

      vol.writeFileSync('/test/locales/en.json', JSON.stringify({
        existing: {
          key: 'Existing translation',
        },
      }))

      const { runExtraction } = await import('@/extract-strings/orchestrator')

      const result = await runExtraction({
        translationFile: '/test/locales/en.json',
        srcPath: '/test/src',
        config: {},
        dryRun: true, // Use dry run to avoid file writes
        verbose: false,
      })

      // Should NOT have error about no patterns
      const errorCalls = consoleErrorSpy.mock.calls
        .filter((call: any[]) => call[0]?.includes('No i18n usage patterns found'))
      expect(errorCalls.length).toBe(0)

      // Should have detected strings (even if empty due to heuristics)
      expect(result).toHaveProperty('rawStrings')
      expect(result).toHaveProperty('generatedKeys')
    })

    it('should detect $t() usage in templates', async () => {
      vol.mkdirSync('/test/src', { recursive: true })
      vol.mkdirSync('/test/locales', { recursive: true })

      vol.writeFileSync('/test/src/Component.vue', `
<template>
  <div>{{ $t('test.key') }}</div>
</template>
      `)

      vol.writeFileSync('/test/locales/en.json', '{}')

      const { runExtraction } = await import('@/extract-strings/orchestrator')

      const result = await runExtraction({
        translationFile: '/test/locales/en.json',
        srcPath: '/test/src',
        config: {},
        dryRun: true,
        verbose: false,
      })

      // Should not error about missing patterns
      const errorCalls = consoleErrorSpy.mock.calls
        .filter((call: any[]) => call[0]?.includes('No i18n usage patterns found'))
      expect(errorCalls.length).toBe(0)
    })

    it('should detect useI18n() in script setup', async () => {
      vol.mkdirSync('/test/src', { recursive: true })
      vol.mkdirSync('/test/locales', { recursive: true })

      vol.writeFileSync('/test/src/Component.vue', `
<script setup>
const { t } = useI18n()
const greeting = t('hello')
</script>
      `)

      vol.writeFileSync('/test/locales/en.json', '{}')

      const { runExtraction } = await import('@/extract-strings/orchestrator')

      const result = await runExtraction({
        translationFile: '/test/locales/en.json',
        srcPath: '/test/src',
        config: {},
        dryRun: true,
        verbose: false,
      })

      // Should not error about missing patterns
      const errorCalls = consoleErrorSpy.mock.calls
        .filter((call: any[]) => call[0]?.includes('No i18n usage patterns found'))
      expect(errorCalls.length).toBe(0)
    })
  })
})
