import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findConfigFile, loadConfig, loadConfigFile } from '@/config/loader'
import type { ToolConfig } from '@/config/types'

describe.sequential('config/loader', () => {
  const fixturesDir = path.join(__dirname, 'fixtures')
  let testDir: string

  beforeEach(() => {
    // Clean up fixtures directory completely
    if (fs.existsSync(fixturesDir)) {
      fs.rmSync(fixturesDir, { recursive: true, force: true })
    }

    //Create unique test directory using timestamp and random number
    const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(7)}`
    testDir = path.join(fixturesDir, `loader-test-${uniqueId}`)

    // Create test directory
    fs.mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(fixturesDir)) {
      fs.rmSync(fixturesDir, { recursive: true, force: true })
    }
  })

  describe('findConfigFile', () => {
    it('should find .ts config file', () => {
      const configPath = path.join(testDir, 'vue-translations-cleanup.config.ts')
      fs.writeFileSync(configPath, 'export default {}')

      const found = findConfigFile(testDir)
      expect(found).toBe(configPath)
    })

    it('should find .mjs config file when it exists alone', () => {
      const configPath = path.join(testDir, 'vue-translations-cleanup.config.mjs')
      fs.writeFileSync(configPath, 'export default {}')

      const found = findConfigFile(testDir)
      expect(found).toBe(configPath)
    })

    it('should find .json config file when it exists alone', () => {
      const configPath = path.join(testDir, '.vue-translations-cleanup.config.json')
      fs.writeFileSync(configPath, '{}')

      const found = findConfigFile(testDir)
      expect(found).toBe(configPath)
    })

    it('should prioritize .ts over .mjs and .json', () => {
      const tsPath = path.join(testDir, 'vue-translations-cleanup.config.ts')
      const mjsPath = path.join(testDir, 'vue-translations-cleanup.config.mjs')
      const jsonPath = path.join(testDir, '.vue-translations-cleanup.config.json')

      fs.writeFileSync(tsPath, 'export default {}')
      fs.writeFileSync(mjsPath, 'export default {}')
      fs.writeFileSync(jsonPath, '{}')

      const found = findConfigFile(testDir)
      expect(found).toBe(tsPath)
    })

    it('should return null when no config file exists', () => {
      const found = findConfigFile(testDir)
      expect(found).toBeNull()
    })
  })

  describe('loadConfigFile - JSON', () => {
    it('should load JSON config', async () => {
      const config: ToolConfig = {
        translationFile: './locales/en.json',
        srcPath: './src',
        cleanup: {
          backup: true,
          verbose: false,
        },
      }

      const configPath = path.join(testDir, 'test-config.json')
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

      const loaded = await loadConfigFile(configPath)
      expect(loaded).toEqual(config)
    })

    it('should throw error for invalid JSON', async () => {
      const configPath = path.join(testDir, 'invalid.json')
      fs.writeFileSync(configPath, '{ invalid json }')

      await expect(loadConfigFile(configPath)).rejects.toThrow('Failed to load config')
    })

    it('should throw error for unsupported file type', async () => {
      const configPath = path.join(testDir, 'config.yaml')
      fs.writeFileSync(configPath, 'foo: bar')

      await expect(loadConfigFile(configPath)).rejects.toThrow('Unsupported config file type')
    })
  })

  describe('loadConfig - JSON', () => {
    it('should load config from explicit JSON path', async () => {
      const config: ToolConfig = {
        translationFile: './locales/en.json',
        srcPath: './src',
      }

      const configPath = path.join(testDir, 'my-config.json')
      fs.writeFileSync(configPath, JSON.stringify(config))

      const loaded = await loadConfig(testDir, configPath)
      expect(loaded).toEqual(config)
    })

    it('should auto-detect JSON config file', async () => {
      const config: ToolConfig = {
        translationFile: './locales/en.json',
      }

      const configPath = path.join(testDir, '.vue-translations-cleanup.config.json')
      fs.writeFileSync(configPath, JSON.stringify(config))

      const loaded = await loadConfig(testDir)
      expect(loaded).toEqual(config)
    })

    it('should return null when no config found', async () => {
      const loaded = await loadConfig(testDir)
      expect(loaded).toBeNull()
    })

    it('should throw error when explicit path does not exist', async () => {
      await expect(
        loadConfig(testDir, './non-existent.json'),
      ).rejects.toThrow('Config file not found')
    })

    it('should resolve relative config path', async () => {
      const config: ToolConfig = {
        translationFile: './locales/en.json',
      }

      const subDir = path.join(testDir, 'configs')
      fs.mkdirSync(subDir, { recursive: true })
      const configPath = path.join(subDir, 'custom.json')
      fs.writeFileSync(configPath, JSON.stringify(config))

      const loaded = await loadConfig(testDir, './configs/custom.json')
      expect(loaded).toEqual(config)
    })
  })

  describe('complex config scenarios - JSON', () => {
    it('should load config with extract options', async () => {
      const config: ToolConfig = {
        extract: {
          targetLanguage: 'fr',
          confidence: 'medium',
          keyFormat: 'camelCase',
          maxKeyLength: 40,
          includeAttributes: ['placeholder', 'title'],
          excludePatterns: ['**/*.test.ts'],
        },
      }

      const configPath = path.join(testDir, 'config.json')
      fs.writeFileSync(configPath, JSON.stringify(config))

      const loaded = await loadConfigFile(configPath)
      expect(loaded).toEqual(config)
    })

    it('should load config with AI options', async () => {
      const config: ToolConfig = {
        ai: {
          enabled: true,
          provider: 'ollama',
          baseUrl: 'http://localhost:11434',
          model: 'codellama',
          timeout: 60000,
        },
      }

      const configPath = path.join(testDir, 'config.json')
      fs.writeFileSync(configPath, JSON.stringify(config))

      const loaded = await loadConfigFile(configPath)
      expect(loaded).toEqual(config)
    })

    it('should load config with custom i18n patterns', async () => {
      const config: ToolConfig = {
        extract: {
          i18nPatterns: [
            {
              pattern: 'const\\s*{\\s*t\\s*}\\s*=\\s*useI18n\\(\\)',
              functionName: 't',
              importTemplate: 'const { t } = useI18n()',
            },
          ],
        },
      }

      const configPath = path.join(testDir, 'config.json')
      fs.writeFileSync(configPath, JSON.stringify(config))

      const loaded = await loadConfigFile(configPath)
      expect(loaded.extract?.i18nPatterns).toBeDefined()
      expect(loaded.extract?.i18nPatterns?.[0].functionName).toBe('t')
    })
  })
})
