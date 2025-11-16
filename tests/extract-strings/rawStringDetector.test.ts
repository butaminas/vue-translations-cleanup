import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectRawStrings, detectRawStringsInFile } from '@/extract-strings/rawStringDetector'

// Mock the file system using memfs
const { vol } = vi.hoisted(() => {
  const { vol } = require('memfs')
  return { vol }
})

vi.mock('node:fs', () => ({ default: vol }))
vi.mock('node:fs/promises', () => vol.promises)

describe('rawStringDetector', () => {
  const testDir = '/test'

  beforeEach(() => {
    vol.reset()
    vol.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    vol.reset()
  })

  describe('detectRawStringsInFile - Vue templates', () => {
    it('should detect translatable text in template', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <div>Hello World</div>
  <p>This is a test message</p>
</template>
      `)

      const config = { confidence: 'high' as const }
      const results = detectRawStringsInFile(file, config)

      expect(results.length).toBeGreaterThan(0)
      const texts = results.map(r => r.text)
      expect(texts).toContain('Hello World')
      expect(texts).toContain('This is a test message')
    })

    it('should detect translatable attributes', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <input placeholder="Enter your name" />
  <button title="Click to submit">Submit</button>
</template>
      `)

      const config = {
        confidence: 'high' as const,
        includeAttributes: ['placeholder', 'title'],
      }
      const results = detectRawStringsInFile(file, config)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Enter your name')
      expect(texts).toContain('Click to submit')

      const placeholderResult = results.find(r => r.text === 'Enter your name')
      expect(placeholderResult?.context).toBe('attribute')
      expect(placeholderResult?.attributeName).toBe('placeholder')
    })

    it('should not detect non-translatable strings', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <div>
    <a href="https://example.com">Link</a>
    <div class="btn-primary">Button</div>
    <span>#FF5733</span>
    <p>123</p>
  </div>
</template>
      `)

      const config = { confidence: 'high' as const }
      const results = detectRawStringsInFile(file, config)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('https://example.com')
      expect(texts).not.toContain('btn-primary')
      expect(texts).not.toContain('#FF5733')
      expect(texts).not.toContain('123')
    })

    it('should respect confidence level', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <div>Welcome to our application</div>
  <span>btn</span>
</template>
      `)

      const highConfig = { confidence: 'high' as const }
      const lowConfig = { confidence: 'low' as const }

      const highResults = detectRawStringsInFile(file, highConfig)
      const lowResults = detectRawStringsInFile(file, lowConfig)

      expect(lowResults.length).toBeGreaterThanOrEqual(highResults.length)
    })
  })

  describe('detectRawStringsInFile - Script sections', () => {
    it('should detect strings in script', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template><div></div></template>
<script setup>
const message = "Welcome to the application"
const description = 'This is a longer description text'
</script>
      `)

      const config = { confidence: 'high' as const }
      const results = detectRawStringsInFile(file, config)

      const texts = results.map(r => r.text)
      expect(texts).toContain('Welcome to the application')
      expect(texts).toContain('This is a longer description text')
    })

    it('should skip strings already in i18n calls', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<script setup>
const { t } = useI18n()
const message = t('already.translated')
const newMessage = "Not yet translated"
</script>
      `)

      const config = { confidence: 'high' as const }
      const results = detectRawStringsInFile(file, config)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('already.translated')
      expect(texts).toContain('Not yet translated')
    })

    it('should detect strings in plain TS/JS files', () => {
      const file = path.join(testDir, 'utils.ts')
      fs.writeFileSync(file, `
export const ERROR_MESSAGE = "An error occurred"
export const SUCCESS_MESSAGE = 'Operation completed successfully'
      `)

      const config = { confidence: 'high' as const }
      const results = detectRawStringsInFile(file, config)

      const texts = results.map(r => r.text)
      expect(texts).toContain('An error occurred')
      expect(texts).toContain('Operation completed successfully')
    })
  })

  describe('detectRawStrings - multiple files', () => {
    it('should detect strings across multiple files', async () => {
      const file1 = path.join(testDir, 'Component1.vue')
      fs.writeFileSync(file1, `
<template>
  <div>First component message</div>
</template>
      `)

      const file2 = path.join(testDir, 'Component2.vue')
      fs.writeFileSync(file2, `
<template>
  <div>Second component message</div>
</template>
      `)

      const config = { confidence: 'high' as const }
      const results = await detectRawStrings([file1, file2], config)

      expect(results.length).toBeGreaterThanOrEqual(2)
      const texts = results.map(r => r.text)
      expect(texts).toContain('First component message')
      expect(texts).toContain('Second component message')
    })

    it('should remove duplicate strings', async () => {
      const file1 = path.join(testDir, 'Component1.vue')
      fs.writeFileSync(file1, `
<template>
  <div>Same message</div>
</template>
      `)

      const file2 = path.join(testDir, 'Component2.vue')
      fs.writeFileSync(file2, `
<template>
  <div>Same message</div>
</template>
      `)

      const config = { confidence: 'high' as const }
      const results = await detectRawStrings([file1, file2], config)

      const sameMessages = results.filter(r => r.text === 'Same message')
      expect(sameMessages.length).toBe(1)
    })

    it('should handle files with parse errors gracefully', async () => {
      const validFile = path.join(testDir, 'Valid.vue')
      fs.writeFileSync(validFile, `
<template>
  <div>Valid message</div>
</template>
      `)

      const invalidFile = path.join(testDir, 'Invalid.vue')
      fs.writeFileSync(invalidFile, '<template><div>Invalid')

      const config = { confidence: 'high' as const }
      const results = await detectRawStrings([validFile, invalidFile], config)

      // Should still get results from valid file
      const texts = results.map(r => r.text)
      expect(texts).toContain('Valid message')
    })
  })

  describe('heuristics', () => {
    it('should filter out URLs', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <a href="https://example.com">Visit site</a>
</template>
      `)

      const config = {
        confidence: 'high' as const,
        includeAttributes: ['href'],
      }
      const results = detectRawStringsInFile(file, config)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('https://example.com')
      expect(texts).toContain('Visit site')
    })

    it('should filter out hex colors', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <div>#FF5733</div>
  <div>This is red color</div>
</template>
      `)

      const config = { confidence: 'high' as const }
      const results = detectRawStringsInFile(file, config)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('#FF5733')
      expect(texts).toContain('This is red color')
    })

    it('should filter out email addresses', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <div>user@example.com</div>
  <div>Contact us</div>
</template>
      `)

      const config = { confidence: 'high' as const }
      const results = detectRawStringsInFile(file, config)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('user@example.com')
      expect(texts).toContain('Contact us')
    })

    it('should filter out CSS classes', () => {
      const file = path.join(testDir, 'Component.vue')
      fs.writeFileSync(file, `
<template>
  <div class="btn-primary">Submit button</div>
</template>
      `)

      const config = {
        confidence: 'high' as const,
        includeAttributes: ['class'],
      }
      const results = detectRawStringsInFile(file, config)

      const texts = results.map(r => r.text)
      expect(texts).not.toContain('btn-primary')
      expect(texts).toContain('Submit button')
    })
  })
})
