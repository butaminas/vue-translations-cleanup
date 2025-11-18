import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { replaceStringsInJsFile, replaceStringsInVueFile, updateTranslationFile } from '@/extract-strings/codeReplacer'
import type { I18nDetectionResult, RawStringLocation } from '@/extract-strings/types'

// Mock the file system using memfs
const { vol } = vi.hoisted(() => {
  const { vol } = require('memfs')
  return { vol }
})

vi.mock('node:fs', () => ({ default: vol }))
vi.mock('node:fs/promises', () => vol.promises)

describe('codeReplacer', () => {
  const testDir = '/test'

  const mockI18nResult: I18nDetectionResult = {
    patterns: [],
    recommendedPattern: {
      pattern: 'const { t } = useI18n()',
      functionName: 't',
      example: 'const { t } = useI18n()',
      file: '/test.vue',
      count: 1,
      type: 'compositionAPI',
    },
    functionNames: new Set(['t']),
    filesScanned: 1,
    filesWithI18n: 1,
  }

  const createLocation = (overrides?: Partial<RawStringLocation>): RawStringLocation => ({
    text: 'Test message',
    file: '/test/Component.vue',
    line: 1,
    column: 1,
    context: 'template',
    confidence: 'high',
    ...overrides,
  })

  beforeEach(() => {
    vol.reset()
    vol.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    vol.reset()
  })

  describe('replaceStringsInVueFile', () => {
    it('should replace template text with i18n function', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <div>Hello World</div>
</template>
<script setup>
</script>
      `)

      const locations: RawStringLocation[] = [
        createLocation({ text: 'Hello World', file }),
      ]
      const keyMap = new Map([['Hello World', 'common.greeting']])

      const result = replaceStringsInVueFile(file, locations, keyMap, mockI18nResult, false)

      expect(result.replacements).toBe(1)
      expect(result.importAdded).toBe(false) // No script replacements

      const updated = fs.readFileSync(file, 'utf-8')
      expect(updated).toContain("{{ $t('common.greeting') }}")
    })

    it('should replace attribute values with i18n function', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <input placeholder="Enter your name" />
</template>
<script setup>
</script>
      `)

      const locations: RawStringLocation[] = [
        createLocation({
          text: 'Enter your name',
          context: 'attribute',
          attributeName: 'placeholder',
          file,
        }),
      ]
      const keyMap = new Map([['Enter your name', 'form.placeholder']])

      const result = replaceStringsInVueFile(file, locations, keyMap, mockI18nResult, false)

      expect(result.replacements).toBe(1)

      const updated = fs.readFileSync(file, 'utf-8')
      expect(updated).toContain(":placeholder=\"$t('form.placeholder')\"")
    })

    it('should replace strings in script and add import', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template><div></div></template>
<script setup>
const message = "Hello World"
</script>
      `)

      const locations: RawStringLocation[] = [
        createLocation({
          text: 'Hello World',
          context: 'script',
          file,
        }),
      ]
      const keyMap = new Map([['Hello World', 'common.greeting']])

      const result = replaceStringsInVueFile(file, locations, keyMap, mockI18nResult, false)

      expect(result.replacements).toBe(1)
      expect(result.importAdded).toBe(true)

      const updated = fs.readFileSync(file, 'utf-8')
      expect(updated).toContain("t('common.greeting')")
      expect(updated).toContain('const { t } = useI18n()')
    })

    it('should not add duplicate imports', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template><div></div></template>
<script setup>
const { t } = useI18n()
const message = "Hello World"
</script>
      `)

      const locations: RawStringLocation[] = [
        createLocation({
          text: 'Hello World',
          context: 'script',
          file,
        }),
      ]
      const keyMap = new Map([['Hello World', 'common.greeting']])

      const result = replaceStringsInVueFile(file, locations, keyMap, mockI18nResult, false)

      expect(result.replacements).toBe(1)
      expect(result.importAdded).toBe(false)

      const updated = fs.readFileSync(file, 'utf-8')
      // Should only have one import
      const importCount = (updated.match(/const { t } = useI18n\(\)/g) || []).length
      expect(importCount).toBe(1)
    })

    it('should create backup when requested', () => {
      const file = path.join(testDir, 'Component.vue')
      const originalContent = `
<template>
  <div>Hello World</div>
</template>
      `
      fs.writeFileSync(file, originalContent)

      const locations: RawStringLocation[] = [
        createLocation({ text: 'Hello World', file }),
      ]
      const keyMap = new Map([['Hello World', 'common.greeting']])

      const result = replaceStringsInVueFile(file, locations, keyMap, mockI18nResult, true)

      expect(result.backupCreated).toBe(true)

      const backupPath = `${file}.backup`
      expect(fs.existsSync(backupPath)).toBe(true)

      const backup = fs.readFileSync(backupPath, 'utf-8')
      expect(backup).toBe(originalContent)
    })

    it('should handle multiple replacements', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <div>Hello World</div>
  <p>Welcome message</p>
  <input placeholder="Enter name" />
</template>
      `)

      const locations: RawStringLocation[] = [
        createLocation({ text: 'Hello World', file }),
        createLocation({ text: 'Welcome message', file }),
        createLocation({
          text: 'Enter name',
          context: 'attribute',
          attributeName: 'placeholder',
          file,
        }),
      ]
      const keyMap = new Map([
        ['Hello World', 'greeting'],
        ['Welcome message', 'welcome'],
        ['Enter name', 'placeholder'],
      ])

      const result = replaceStringsInVueFile(file, locations, keyMap, mockI18nResult, false)

      expect(result.replacements).toBe(3)

      const updated = fs.readFileSync(file, 'utf-8')
      expect(updated).toContain("{{ $t('greeting') }}")
      expect(updated).toContain("{{ $t('welcome') }}")
      expect(updated).toContain(":placeholder=\"$t('placeholder')\"")
    })
  })

  describe('replaceStringsInJsFile', () => {
    it('should replace strings in JS file', () => {
      const file = path.join(testDir, 'utils.ts')
      fs.writeFileSync(file, `
export const ERROR_MESSAGE = "An error occurred"
export const SUCCESS_MESSAGE = 'Success'
      `)

      const locations: RawStringLocation[] = [
        createLocation({
          text: 'An error occurred',
          context: 'script',
          file,
        }),
        createLocation({
          text: 'Success',
          context: 'script',
          file,
        }),
      ]
      const keyMap = new Map([
        ['An error occurred', 'error.general'],
        ['Success', 'success.general'],
      ])

      const result = replaceStringsInJsFile(file, locations, keyMap, mockI18nResult, false)

      expect(result.replacements).toBe(2)

      const updated = fs.readFileSync(file, 'utf-8')
      expect(updated).toContain("t('error.general')")
      expect(updated).toContain("t('success.general')")
    })

    it('should add import at top of file', () => {
      const file = path.join(testDir, 'utils.ts')
      fs.writeFileSync(file, `
export const MESSAGE = "Hello"
      `)

      const locations: RawStringLocation[] = [
        createLocation({
          text: 'Hello',
          context: 'script',
          file,
        }),
      ]
      const keyMap = new Map([['Hello', 'greeting']])

      const result = replaceStringsInJsFile(file, locations, keyMap, mockI18nResult, false)

      expect(result.importAdded).toBe(true)

      const updated = fs.readFileSync(file, 'utf-8')
      expect(updated).toContain('const { t } = useI18n()')
      // Import should be at the top
      const importIndex = updated.indexOf('const { t }')
      const messageIndex = updated.indexOf('export const MESSAGE')
      expect(importIndex).toBeLessThan(messageIndex)
    })
  })

  describe('updateTranslationFile', () => {
    it('should create new translation file with keys', () => {
      const translationFile = path.join(testDir, 'en.json')

      const keyMap = new Map([
        ['Hello World', 'common.greeting'],
        ['Welcome', 'common.welcome'],
      ])

      updateTranslationFile(translationFile, keyMap, 'en', false)

      expect(fs.existsSync(translationFile)).toBe(true)

      const content = fs.readFileSync(translationFile, 'utf-8')
      const translations = JSON.parse(content)

      expect(translations.common.greeting).toBe('Hello World')
      expect(translations.common.welcome).toBe('Welcome')
    })

    it('should preserve existing translations', () => {
      const translationFile = path.join(testDir, 'en.json')
      fs.writeFileSync(translationFile, JSON.stringify({
        existing: {
          key: 'Existing value',
        },
      }, null, 2))

      const keyMap = new Map([
        ['New message', 'new.message'],
      ])

      updateTranslationFile(translationFile, keyMap, 'en', false)

      const content = fs.readFileSync(translationFile, 'utf-8')
      const translations = JSON.parse(content)

      expect(translations.existing.key).toBe('Existing value')
      expect(translations.new.message).toBe('New message')
    })

    it('should not overwrite existing keys', () => {
      const translationFile = path.join(testDir, 'en.json')
      fs.writeFileSync(translationFile, JSON.stringify({
        common: {
          greeting: 'Custom greeting',
        },
      }, null, 2))

      const keyMap = new Map([
        ['Hello World', 'common.greeting'],
      ])

      updateTranslationFile(translationFile, keyMap, 'en', false)

      const content = fs.readFileSync(translationFile, 'utf-8')
      const translations = JSON.parse(content)

      // Should preserve existing value
      expect(translations.common.greeting).toBe('Custom greeting')
    })

    it('should handle nested keys with dot notation', () => {
      const translationFile = path.join(testDir, 'en.json')

      const keyMap = new Map([
        ['Error', 'errors.validation.required'],
        ['Success', 'messages.success.saved'],
      ])

      updateTranslationFile(translationFile, keyMap, 'en', false)

      const content = fs.readFileSync(translationFile, 'utf-8')
      const translations = JSON.parse(content)

      expect(translations.errors.validation.required).toBe('Error')
      expect(translations.messages.success.saved).toBe('Success')
    })

    it('should create backup when requested', () => {
      const translationFile = path.join(testDir, 'en.json')
      const originalContent = {
        existing: {
          key: 'value',
        },
      }
      fs.writeFileSync(translationFile, JSON.stringify(originalContent, null, 2))

      const keyMap = new Map([
        ['New', 'new.key'],
      ])

      updateTranslationFile(translationFile, keyMap, 'en', true)

      const backupPath = `${translationFile}.backup`
      expect(fs.existsSync(backupPath)).toBe(true)

      const backup = fs.readFileSync(backupPath, 'utf-8')
      const backupData = JSON.parse(backup)
      expect(backupData).toEqual(originalContent)
    })
  })
})
