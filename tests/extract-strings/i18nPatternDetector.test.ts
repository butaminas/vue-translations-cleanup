import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectI18nPatterns, getImportTemplate, shouldUseGlobalT } from '@/extract-strings/i18nPatternDetector'

describe('i18nPatternDetector', () => {
  let testDir: string

  beforeEach(() => {
    // Create a unique temporary directory using timestamp and random string
    const uniqueId = `i18n-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    testDir = path.join(__dirname, 'tmp', uniqueId)
    fs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up the temporary directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true })
    }
    // Clean up parent tmp directory if empty
    const tmpDir = path.join(__dirname, 'tmp')
    if (fs.existsSync(tmpDir)) {
      try {
        const files = fs.readdirSync(tmpDir)
        if (files.length === 0) {
          fs.rmdirSync(tmpDir)
        }
      }
      catch {
        // Ignore errors
      }
    }
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
