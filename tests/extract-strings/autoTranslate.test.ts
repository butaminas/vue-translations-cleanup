import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import path from 'node:path'

const { vol } = vi.hoisted(() => {
  const { vol } = require('memfs')
  return { vol }
})

vi.mock('node:fs', () => ({ default: vol }))
vi.mock('node:fs/promises', () => vol.promises)

describe('extract-strings/autoTranslate', () => {
  beforeEach(() => {
    vol.reset()
    vol.mkdirSync('/test/locales', { recursive: true })
  })

  afterEach(() => {
    vol.reset()
    vi.resetModules()
  })

  describe('autoTranslate', () => {
    it('should translate new keys to target languages', async () => {
      // Setup: source translation file
      vol.writeFileSync('/test/locales/en.json', JSON.stringify({
        existing: 'Existing translation',
        new_key1: 'Hello',
        new_key2: 'World',
      }, null, 2))

      // Mock AI client
      const mockAIClient = {
        translateText: vi.fn()
          .mockResolvedValueOnce({ translation: 'Hallo', confidence: 0.95 })
          .mockResolvedValueOnce({ translation: 'Welt', confidence: 0.92 }),
      }

      // Map is text -> key
      const newKeys = new Map([
        ['Hello', 'new_key1'],
        ['World', 'new_key2'],
      ])

      const { autoTranslate } = await import('@/extract-strings/autoTranslate')

      const result = await autoTranslate({
        sourceFile: '/test/locales/en.json',
        targetLanguages: ['de'],
        aiClient: mockAIClient as any,
        sourceLanguage: 'en',
        newKeys,
        backup: false,
        verbose: false,
      })

      // Verify results
      expect(result.translatedLanguages).toContain('de')
      expect(result.translationsPerLanguage.de).toBe(2)
      expect(result.errors).toHaveLength(0)

      // Verify file was created
      expect(vol.existsSync('/test/locales/de.json')).toBe(true)

      const deTranslations = JSON.parse(vol.readFileSync('/test/locales/de.json', 'utf-8'))
      expect(deTranslations).toEqual({
        new_key1: 'Hallo',
        new_key2: 'Welt',
      })

      // Verify AI was called correctly
      expect(mockAIClient.translateText).toHaveBeenCalledTimes(2)
      expect(mockAIClient.translateText).toHaveBeenCalledWith('Hello', 'de', {
        key: 'new_key1',
        sourceLanguage: 'en',
        category: '',
      })
    })

    it('should preserve existing translations', async () => {
      vol.writeFileSync('/test/locales/en.json', JSON.stringify({
        key1: 'Hello',
        key2: 'World',
      }))

      vol.writeFileSync('/test/locales/de.json', JSON.stringify({
        key1: 'Hallo (existing)',
      }))

      const mockAIClient = {
        translateText: vi.fn()
          .mockResolvedValueOnce({ translation: 'Welt', confidence: 0.9 }),
      }

      // Map is text -> key
      const newKeys = new Map([
        ['Hello', 'key1'],
        ['World', 'key2'],
      ])

      const { autoTranslate } = await import('@/extract-strings/autoTranslate')

      await autoTranslate({
        sourceFile: '/test/locales/en.json',
        targetLanguages: ['de'],
        aiClient: mockAIClient as any,
        sourceLanguage: 'en',
        newKeys,
        backup: false,
        verbose: false,
      })

      const deTranslations = JSON.parse(vol.readFileSync('/test/locales/de.json', 'utf-8'))

      // key1 should be preserved, key2 should be added
      expect(deTranslations.key1).toBe('Hallo (existing)')
      expect(deTranslations.key2).toBe('Welt')

      // AI should only be called for key2
      expect(mockAIClient.translateText).toHaveBeenCalledTimes(1)
    })

    it('should handle nested keys correctly', async () => {
      vol.writeFileSync('/test/locales/en.json', JSON.stringify({
        common: {
          buttons: {
            submit: 'Submit',
            cancel: 'Cancel',
          },
        },
      }))

      const mockAIClient = {
        translateText: vi.fn()
          .mockResolvedValueOnce({ translation: 'Absenden', confidence: 0.95 })
          .mockResolvedValueOnce({ translation: 'Abbrechen', confidence: 0.92 }),
      }

      // Map is text -> key
      const newKeys = new Map([
        ['Submit', 'common.buttons.submit'],
        ['Cancel', 'common.buttons.cancel'],
      ])

      const { autoTranslate } = await import('@/extract-strings/autoTranslate')

      await autoTranslate({
        sourceFile: '/test/locales/en.json',
        targetLanguages: ['de'],
        aiClient: mockAIClient as any,
        sourceLanguage: 'en',
        newKeys,
        backup: false,
        verbose: false,
      })

      const deTranslations = JSON.parse(vol.readFileSync('/test/locales/de.json', 'utf-8'))

      expect(deTranslations).toEqual({
        common: {
          buttons: {
            submit: 'Absenden',
            cancel: 'Abbrechen',
          },
        },
      })

      // Verify category was detected
      expect(mockAIClient.translateText).toHaveBeenCalledWith('Submit', 'de', {
        key: 'common.buttons.submit',
        sourceLanguage: 'en',
        category: 'common',
      })
    })

    it('should translate to multiple languages', async () => {
      vol.writeFileSync('/test/locales/en.json', JSON.stringify({
        greeting: 'Hello',
      }))

      const mockAIClient = {
        translateText: vi.fn()
          .mockResolvedValueOnce({ translation: 'Hallo', confidence: 0.95 })
          .mockResolvedValueOnce({ translation: 'Bonjour', confidence: 0.93 })
          .mockResolvedValueOnce({ translation: 'Hola', confidence: 0.94 }),
      }

      // Map is text -> key
      const newKeys = new Map([
        ['Hello', 'greeting'],
      ])

      const { autoTranslate } = await import('@/extract-strings/autoTranslate')

      const result = await autoTranslate({
        sourceFile: '/test/locales/en.json',
        targetLanguages: ['de', 'fr', 'es'],
        aiClient: mockAIClient as any,
        sourceLanguage: 'en',
        newKeys,
        backup: false,
        verbose: false,
      })

      expect(result.translatedLanguages).toEqual(['de', 'fr', 'es'])
      expect(result.translationsPerLanguage).toEqual({
        de: 1,
        fr: 1,
        es: 1,
      })

      // Verify all language files were created
      expect(vol.existsSync('/test/locales/de.json')).toBe(true)
      expect(vol.existsSync('/test/locales/fr.json')).toBe(true)
      expect(vol.existsSync('/test/locales/es.json')).toBe(true)

      const deTranslations = JSON.parse(vol.readFileSync('/test/locales/de.json', 'utf-8'))
      const frTranslations = JSON.parse(vol.readFileSync('/test/locales/fr.json', 'utf-8'))
      const esTranslations = JSON.parse(vol.readFileSync('/test/locales/es.json', 'utf-8'))

      expect(deTranslations.greeting).toBe('Hallo')
      expect(frTranslations.greeting).toBe('Bonjour')
      expect(esTranslations.greeting).toBe('Hola')
    })

    it('should handle translation errors gracefully', async () => {
      vol.writeFileSync('/test/locales/en.json', JSON.stringify({
        key1: 'Hello',
        key2: 'World',
      }))

      const mockAIClient = {
        translateText: vi.fn()
          .mockRejectedValueOnce(new Error('Translation failed'))
          .mockResolvedValueOnce({ translation: 'Welt', confidence: 0.9 }),
      }

      // Map is text -> key
      const newKeys = new Map([
        ['Hello', 'key1'],
        ['World', 'key2'],
      ])

      const { autoTranslate } = await import('@/extract-strings/autoTranslate')

      const result = await autoTranslate({
        sourceFile: '/test/locales/en.json',
        targetLanguages: ['de'],
        aiClient: mockAIClient as any,
        sourceLanguage: 'en',
        newKeys,
        backup: false,
        verbose: false,
      })

      // Should still succeed overall
      expect(result.translatedLanguages).toContain('de')
      expect(result.translationsPerLanguage.de).toBe(1) // Only key2 translated

      const deTranslations = JSON.parse(vol.readFileSync('/test/locales/de.json', 'utf-8'))
      expect(deTranslations.key2).toBe('Welt')
      expect(deTranslations).not.toHaveProperty('key1') // Failed translation not added
    })

    it('should create backup if requested', async () => {
      vol.writeFileSync('/test/locales/en.json', JSON.stringify({ key: 'Value' }))
      vol.writeFileSync('/test/locales/de.json', JSON.stringify({ existing: 'Existing' }))

      const mockAIClient = {
        translateText: vi.fn()
          .mockResolvedValueOnce({ translation: 'Wert', confidence: 0.9 }),
      }

      // Map is text -> key
      const newKeys = new Map([
        ['Value', 'key'],
      ])

      const { autoTranslate } = await import('@/extract-strings/autoTranslate')

      await autoTranslate({
        sourceFile: '/test/locales/en.json',
        targetLanguages: ['de'],
        aiClient: mockAIClient as any,
        sourceLanguage: 'en',
        newKeys,
        backup: true,
        verbose: false,
      })

      // Verify backup was created
      expect(vol.existsSync('/test/locales/de.json.backup')).toBe(true)
      const backup = JSON.parse(vol.readFileSync('/test/locales/de.json.backup', 'utf-8'))
      expect(backup).toEqual({ existing: 'Existing' })
    })

    it('should translate missing keys when no new keys are provided', async () => {
      vol.writeFileSync('/test/locales/en.json', JSON.stringify({ key: 'Value' }))

      const mockAIClient = {
        translateText: vi.fn().mockResolvedValue({
          translation: 'Wert',
          confidence: 0.9,
        }),
      }

      const { autoTranslate } = await import('@/extract-strings/autoTranslate')

      const result = await autoTranslate({
        sourceFile: '/test/locales/en.json',
        targetLanguages: ['de'],
        aiClient: mockAIClient as any,
        sourceLanguage: 'en',
        newKeys: new Map(), // No new keys, but should check for missing translations
        backup: false,
        verbose: false,
      })

      // Should translate missing key to German
      expect(result.translatedLanguages).toEqual(['de'])
      expect(result.translationsPerLanguage.de).toBe(1)
      expect(mockAIClient.translateText).toHaveBeenCalledWith('Value', 'de', {
        key: 'key',
        sourceLanguage: 'en',
        category: '',
      })

      // Should create de.json with translation
      expect(vol.existsSync('/test/locales/de.json')).toBe(true)
      const deTranslations = JSON.parse(vol.readFileSync('/test/locales/de.json', 'utf-8'))
      expect(deTranslations).toEqual({ key: 'Wert' })
    })
  })
})
