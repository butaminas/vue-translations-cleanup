import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadConfigFile } from '../../src/config/loader'
import type { ToolConfig } from '../../src/config/types'

/**
 * INTEGRATION TESTS for config loading
 *
 * These tests use the REAL file system (not memfs) to verify that
 * TypeScript and ESM config files can actually be loaded at runtime.
 *
 * This catches issues like:
 * - TypeScript transpilation failures
 * - Module resolution errors
 * - Path alias problems
 */

// TODO: These tests need work - vitest environment conflicts with real file system
//  For now, use manual-test-jiti.js and test-real-config.js to verify jiti works
describe.skip('integration: config loading', () => {
  const testDir = path.join(process.cwd(), 'tests', 'integration', 'fixtures')

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
  })

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      try {
        fs.rmSync(testDir, { recursive: true, force: true })
        fs.mkdirSync(testDir, { recursive: true })
      }
      catch (err) {
        // Ignore cleanup errors
      }
    }
  })

  describe('TypeScript config files', () => {
    it('should load TypeScript config with default export', async () => {
      const configPath = path.join(testDir, 'test.config.ts')

      fs.writeFileSync(configPath, `
export default {
  translationFile: './locales/en.json',
  srcPath: './src',
  extract: {
    targetLanguage: 'en',
    confidence: 'high',
  },
}
`)

      const config = await loadConfigFile(configPath)

      expect(config).toBeDefined()
      expect(config.translationFile).toBe('./locales/en.json')
      expect(config.srcPath).toBe('./src')
      expect(config.extract?.targetLanguage).toBe('en')
      expect(config.extract?.confidence).toBe('high')
    })

    it('should load TypeScript config with type import', async () => {
      const configPath = path.join(testDir, 'test-typed.config.ts')

      // This is what users actually write - importing the type
      fs.writeFileSync(configPath, `
import type { ToolConfig } from '../../../src/config/types'

export default {
  translationFile: './locales/en.json',
  srcPath: './src',
  extract: {
    keyFormat: 'camelCase',
    i18nPatterns: [
      {
        pattern: /const\\s*{\\s*t\\s*}\\s*=\\s*useI18n\\(\\)/g,
        functionName: 't',
        importTemplate: 'const { t } = useI18n()',
      },
    ],
  },
} satisfies ToolConfig
`)

      const config = await loadConfigFile(configPath)

      expect(config).toBeDefined()
      expect(config.extract?.keyFormat).toBe('camelCase')
      expect(config.extract?.i18nPatterns).toHaveLength(1)
      expect(config.extract?.i18nPatterns?.[0].functionName).toBe('t')
    })

    it('should load TypeScript config with custom i18n pattern (regex)', async () => {
      const configPath = path.join(testDir, 'test-pattern.config.ts')

      fs.writeFileSync(configPath, `
export default {
  extract: {
    i18nPatterns: [
      {
        pattern: /const\\s*\\{(?:[^{}]*\\{[^}]*\\}[^,]*,\\s*)*[^{}]*i18n\\s*:\\s*\\{\\s*t\\s*\\}[^}]*\\}\\s*=\\s*injectContext\\(\\)/g,
        functionName: 't',
        importTemplate: 'const { i18n: { t } } = injectContext()',
      },
    ],
  },
}
`)

      const config = await loadConfigFile(configPath)

      expect(config.extract?.i18nPatterns).toBeDefined()
      expect(config.extract?.i18nPatterns?.[0].pattern).toBeInstanceOf(RegExp)
      expect(config.extract?.i18nPatterns?.[0].functionName).toBe('t')
    })

    it('should load TypeScript config with AI configuration', async () => {
      const configPath = path.join(testDir, 'test-ai.config.ts')

      fs.writeFileSync(configPath, `
export default {
  ai: {
    enabled: true,
    provider: 'ollama' as const,
    model: 'codellama',
    baseUrl: 'http://localhost:11434',
    languages: ['de', 'fr', 'es'],
  },
}
`)

      const config = await loadConfigFile(configPath)

      expect(config.ai?.enabled).toBe(true)
      expect(config.ai?.provider).toBe('ollama')
      expect(config.ai?.languages).toEqual(['de', 'fr', 'es'])
    })

    it('should handle TypeScript syntax errors gracefully', async () => {
      const configPath = path.join(testDir, 'invalid-syntax.config.ts')

      fs.writeFileSync(configPath, `
export default {
  translationFile: './locales/en.json',
  // Missing closing brace
`)

      await expect(loadConfigFile(configPath)).rejects.toThrow('Failed to load config')
    })
  })

  describe('ESM (.mjs) config files', () => {
    it('should load .mjs config with default export', async () => {
      const configPath = path.join(testDir, 'test.config.mjs')

      fs.writeFileSync(configPath, `
export default {
  translationFile: './locales/en.json',
  srcPath: './src',
}
`)

      const config = await loadConfigFile(configPath)

      expect(config).toBeDefined()
      expect(config.translationFile).toBe('./locales/en.json')
      expect(config.srcPath).toBe('./src')
    })

    it('should handle .mjs syntax errors gracefully', async () => {
      const configPath = path.join(testDir, 'invalid.config.mjs')

      fs.writeFileSync(configPath, `
export default {
  invalid syntax here
}
`)

      await expect(loadConfigFile(configPath)).rejects.toThrow('Failed to load config')
    })
  })

  describe('JSON config files', () => {
    it('should load JSON config', async () => {
      const configPath = path.join(testDir, 'test.config.json')

      const config: ToolConfig = {
        translationFile: './locales/en.json',
        srcPath: './src',
        cleanup: {
          backup: true,
          verbose: false,
        },
      }

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2))

      const loaded = await loadConfigFile(configPath)

      expect(loaded).toEqual(config)
    })
  })

  describe('edge cases', () => {
    it('should handle very large config files', async () => {
      const configPath = path.join(testDir, 'large.config.ts')

      // Generate a config with many custom patterns
      const patterns = Array.from({ length: 100 }, (_, i) => `
        {
          pattern: /pattern${i}/g,
          functionName: 't${i}',
          importTemplate: 'import t${i}',
        }
      `).join(',')

      fs.writeFileSync(configPath, `
export default {
  extract: {
    i18nPatterns: [${patterns}],
  },
}
`)

      const config = await loadConfigFile(configPath)

      expect(config.extract?.i18nPatterns).toHaveLength(100)
    })

    it('should handle config with environment variables', async () => {
      const configPath = path.join(testDir, 'env.config.ts')

      process.env.TEST_API_KEY = 'test-key-123'

      fs.writeFileSync(configPath, `
export default {
  ai: {
    enabled: true,
    provider: 'anthropic' as const,
    apiKey: process.env.TEST_API_KEY,
  },
}
`)

      const config = await loadConfigFile(configPath)

      expect(config.ai?.apiKey).toBe('test-key-123')

      delete process.env.TEST_API_KEY
    })
  })
})
