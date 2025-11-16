import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectI18nPatterns, getImportTemplate, shouldUseGlobalT } from '@/extract-strings/i18nPatternDetector'

// Mock the file system using memfs
const { vol } = vi.hoisted(() => {
  const { vol } = require('memfs')
  return { vol }
})

vi.mock('node:fs', () => ({ default: vol }))
vi.mock('node:fs/promises', () => vol.promises)

// Mock glob to use the virtual file system
vi.mock('glob', async (importOriginal) => {
  const { Glob } = await importOriginal<typeof import('glob')>()
  return {
    glob: async (pattern: string, options: any) => {
      // Use the mocked fs by manually finding files
      const cwd = options?.cwd || process.cwd()
      const files: string[] = []

      const collectFiles = (dir: string) => {
        try {
          const entries = vol.readdirSync(dir, { withFileTypes: true })
          for (const entry of entries) {
            const fullPath = path.join(dir, entry.name)
            if (entry.isDirectory()) {
              collectFiles(fullPath)
            }
            else if (entry.isFile()) {
              // Simple pattern matching - just check if filename matches
              const relativePath = path.relative(cwd, fullPath)
              if (pattern.includes('**/*.vue') && fullPath.endsWith('.vue')) {
                files.push(options?.absolute ? fullPath : relativePath)
              }
              else if (pattern.includes('**/*.ts') && fullPath.endsWith('.ts')) {
                files.push(options?.absolute ? fullPath : relativePath)
              }
            }
          }
        }
        catch (err) {
          // Directory doesn't exist or can't be read
        }
      }

      collectFiles(cwd)
      return files
    },
  }
})

describe('i18nPatternDetector', () => {
  const testDir = '/test'

  beforeEach(() => {
    // Clear the virtual file system
    vol.reset()
    // Create test directory
    vol.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Clear the virtual file system
    vol.reset()
  })

  describe('detectI18nPatterns', () => {
    it('should detect useI18n() pattern', async () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<script setup>
const { t } = useI18n()
const message = t('hello.world')
</script>
      `)

      const result = await detectI18nPatterns(testDir, '**/*.vue')

      expect(result.filesScanned).toBe(1)
      expect(result.filesWithI18n).toBe(1)
      expect(result.patterns.length).toBeGreaterThan(0)
      expect(result.recommendedPattern).toBeDefined()
      expect(result.recommendedPattern?.functionName).toBe('t')
      expect(result.functionNames.has('t')).toBe(true)
    })

    it('should detect $t in templates', async () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <div>{{ $t('hello.world') }}</div>
  <p>{{ $t('another.key') }}</p>
</template>
      `)

      const result = await detectI18nPatterns(testDir, '**/*.vue')

      expect(result.filesWithI18n).toBe(1)
      expect(result.functionNames.has('$t')).toBe(true)
    })

    it('should detect this.$t in options API', async () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<script>
export default {
  computed: {
    message() {
      return this.$t('hello.world')
    }
  }
}
</script>
      `)

      const result = await detectI18nPatterns(testDir, '**/*.vue')

      expect(result.filesWithI18n).toBe(1)
      expect(result.functionNames.has('$t')).toBe(true)
      expect(result.recommendedPattern?.type).toBe('optionsAPI')
    })

    it('should detect custom patterns', async () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<script setup>
const { i18n: { t } } = injectContext()
const message = t('hello.world')
</script>
      `)

      const customPatterns = [
        {
          pattern: /const\s*{\s*i18n:\s*{\s*t\s*}\s*}\s*=\s*injectContext\(\)/,
          functionName: 't',
          importTemplate: 'const { i18n: { t } } = injectContext()',
        },
      ]

      const result = await detectI18nPatterns(testDir, '**/*.vue', customPatterns)

      expect(result.filesWithI18n).toBe(1)
      expect(result.patterns.length).toBeGreaterThan(0)
      expect(result.recommendedPattern?.type).toBe('custom')
      expect(result.recommendedPattern?.functionName).toBe('t')
    })

    it('should detect multiple patterns and recommend most common', async () => {
      const file1 = path.join(testDir, 'Component1.vue')
      fs.writeFileSync(file1, `
<script setup>
const { t } = useI18n()
</script>
      `)

      const file2 = path.join(testDir, 'Component2.vue')
      fs.writeFileSync(file2, `
<script setup>
const { t } = useI18n()
</script>
      `)

      const file3 = path.join(testDir, 'Component3.vue')
      fs.writeFileSync(file3, `
<template>
  {{ $t('key') }}
</template>
      `)

      const result = await detectI18nPatterns(testDir, '**/*.vue')

      expect(result.filesScanned).toBe(3)
      expect(result.filesWithI18n).toBe(3)
      // useI18n appears twice, $t once, so useI18n should be recommended
      expect(result.recommendedPattern?.functionName).toBe('t')
      expect(result.recommendedPattern?.type).toBe('compositionAPI')
    })

    it('should handle files without i18n', async () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <div>No translation here</div>
</template>
<script>
export default {}
</script>
      `)

      const result = await detectI18nPatterns(testDir, '**/*.vue')

      expect(result.filesScanned).toBe(1)
      expect(result.filesWithI18n).toBe(0)
      expect(result.patterns.length).toBe(0)
      expect(result.recommendedPattern).toBeNull()
    })

    it('should handle empty directory', async () => {
      const result = await detectI18nPatterns(testDir, '**/*.vue')

      expect(result.filesScanned).toBe(0)
      expect(result.filesWithI18n).toBe(0)
      expect(result.patterns.length).toBe(0)
      expect(result.recommendedPattern).toBeNull()
    })

    it('should detect aliased function names', async () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<script setup>
const { t: translate } = useI18n()
const message = translate('hello')
</script>
      `)

      const result = await detectI18nPatterns(testDir, '**/*.vue')

      expect(result.filesWithI18n).toBe(1)
      expect(result.patterns.length).toBeGreaterThan(0)
    })

    it('should detect destructured with other properties', async () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<script setup>
const { t, locale, availableLocales } = useI18n()
</script>
      `)

      const result = await detectI18nPatterns(testDir, '**/*.vue')

      expect(result.filesWithI18n).toBe(1)
      expect(result.functionNames.has('t')).toBe(true)
    })
  })

  describe('getImportTemplate', () => {
    it('should return pattern template', () => {
      const pattern = {
        pattern: 'const { t } = useI18n()',
        functionName: 't',
        example: 'const { t } = useI18n()',
        file: '/test.vue',
        count: 5,
        type: 'compositionAPI' as const,
      }

      expect(getImportTemplate(pattern)).toBe('const { t } = useI18n()')
    })

    it('should return default when pattern is null', () => {
      expect(getImportTemplate(null)).toBe('const { t } = useI18n()')
    })
  })

  describe('shouldUseGlobalT', () => {
    it('should return true for global $t pattern', () => {
      const result = {
        patterns: [],
        recommendedPattern: {
          pattern: '$t(...)',
          functionName: '$t',
          example: '$t("key")',
          file: '/test.vue',
          count: 10,
          type: 'global' as const,
        },
        functionNames: new Set(['$t']),
        filesScanned: 5,
        filesWithI18n: 3,
      }

      expect(shouldUseGlobalT(result)).toBe(true)
    })

    it('should return false for composition API pattern', () => {
      const result = {
        patterns: [],
        recommendedPattern: {
          pattern: 'const { t } = useI18n()',
          functionName: 't',
          example: 'const { t } = useI18n()',
          file: '/test.vue',
          count: 10,
          type: 'compositionAPI' as const,
        },
        functionNames: new Set(['t']),
        filesScanned: 5,
        filesWithI18n: 3,
      }

      expect(shouldUseGlobalT(result)).toBe(false)
    })

    it('should return false when no pattern detected', () => {
      const result = {
        patterns: [],
        recommendedPattern: null,
        functionNames: new Set(),
        filesScanned: 5,
        filesWithI18n: 0,
      }

      expect(shouldUseGlobalT(result)).toBe(false)
    })
  })
})
