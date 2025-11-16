import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, mergeWithDefaults, validateConfig } from '@/config/validator'
import type { ToolConfig } from '@/config/types'

describe('config/validator', () => {
  describe('validateConfig', () => {
    it('should accept valid minimal config', () => {
      const config: ToolConfig = {}
      expect(() => validateConfig(config)).not.toThrow()
    })

    it('should accept valid full config', () => {
      const config: ToolConfig = {
        translationFile: './locales/en.json',
        srcPath: './src',
        extract: {
          targetLanguage: 'en',
          confidence: 'high',
          keyFormat: 'snake_case',
          maxKeyLength: 50,
          includeAttributes: ['placeholder', 'title'],
          excludePatterns: ['**/*.test.ts'],
        },
        ai: {
          enabled: true,
          provider: 'ollama',
          baseUrl: 'http://localhost:11434',
          model: 'codellama',
        },
        cleanup: {
          backup: true,
          verbose: false,
          dryRun: false,
        },
      }

      expect(() => validateConfig(config)).not.toThrow()
    })

    describe('extract validation', () => {
      it('should reject invalid confidence level', () => {
        const config: ToolConfig = {
          extract: {
            confidence: 'invalid' as any,
          },
        }

        expect(() => validateConfig(config)).toThrow('confidence must be one of')
      })

      it('should reject invalid keyFormat', () => {
        const config: ToolConfig = {
          extract: {
            keyFormat: 'invalid' as any,
          },
        }

        expect(() => validateConfig(config)).toThrow('keyFormat must be one of')
      })

      it('should reject negative maxKeyLength', () => {
        const config: ToolConfig = {
          extract: {
            maxKeyLength: -10,
          },
        }

        expect(() => validateConfig(config)).toThrow('maxKeyLength must be a positive number')
      })

      it('should reject zero maxKeyLength', () => {
        const config: ToolConfig = {
          extract: {
            maxKeyLength: 0,
          },
        }

        expect(() => validateConfig(config)).toThrow('maxKeyLength must be a positive number')
      })

      it('should reject non-array includeAttributes', () => {
        const config: ToolConfig = {
          extract: {
            includeAttributes: 'not-an-array' as any,
          },
        }

        expect(() => validateConfig(config)).toThrow('includeAttributes must be an array')
      })

      it('should reject non-array excludePatterns', () => {
        const config: ToolConfig = {
          extract: {
            excludePatterns: 'not-an-array' as any,
          },
        }

        expect(() => validateConfig(config)).toThrow('excludePatterns must be an array')
      })

      it('should reject non-array i18nPatterns', () => {
        const config: ToolConfig = {
          extract: {
            i18nPatterns: 'not-an-array' as any,
          },
        }

        expect(() => validateConfig(config)).toThrow('i18nPatterns must be an array')
      })

      it('should reject i18nPattern without pattern', () => {
        const config: ToolConfig = {
          extract: {
            i18nPatterns: [
              {
                pattern: '' as any,
                functionName: 't',
                importTemplate: 'const { t } = useI18n()',
              },
            ],
          },
        }

        expect(() => validateConfig(config)).toThrow('pattern is required')
      })

      it('should reject i18nPattern without functionName', () => {
        const config: ToolConfig = {
          extract: {
            i18nPatterns: [
              {
                pattern: /test/,
                functionName: '',
                importTemplate: 'const { t } = useI18n()',
              },
            ],
          },
        }

        expect(() => validateConfig(config)).toThrow('functionName must be a non-empty string')
      })

      it('should reject i18nPattern without importTemplate', () => {
        const config: ToolConfig = {
          extract: {
            i18nPatterns: [
              {
                pattern: /test/,
                functionName: 't',
                importTemplate: '',
              },
            ],
          },
        }

        expect(() => validateConfig(config)).toThrow('importTemplate must be a non-empty string')
      })

      it('should convert string pattern to RegExp', () => {
        const config: ToolConfig = {
          extract: {
            i18nPatterns: [
              {
                pattern: 'const\\s*{\\s*t\\s*}',
                functionName: 't',
                importTemplate: 'const { t } = useI18n()',
              },
            ],
          },
        }

        validateConfig(config)
        expect(config.extract?.i18nPatterns?.[0].pattern).toBeInstanceOf(RegExp)
      })

      it('should reject invalid regex pattern string', () => {
        const config: ToolConfig = {
          extract: {
            i18nPatterns: [
              {
                pattern: '[invalid(regex',
                functionName: 't',
                importTemplate: 'const { t } = useI18n()',
              },
            ],
          },
        }

        expect(() => validateConfig(config)).toThrow('not a valid regex')
      })
    })

    describe('AI validation', () => {
      it('should reject invalid provider', () => {
        const config: ToolConfig = {
          ai: {
            provider: 'invalid' as any,
          },
        }

        expect(() => validateConfig(config)).toThrow('provider must be one of')
      })

      it('should accept all valid providers', () => {
        const providers = ['ollama', 'lmstudio', 'localai', 'anthropic', 'openai', 'custom']

        providers.forEach((provider) => {
          const config: ToolConfig = {
            ai: {
              provider: provider as any,
            },
          }
          expect(() => validateConfig(config)).not.toThrow()
        })
      })

      it('should reject negative timeout', () => {
        const config: ToolConfig = {
          ai: {
            timeout: -1000,
          },
        }

        expect(() => validateConfig(config)).toThrow('timeout must be a positive number')
      })

      it('should reject zero timeout', () => {
        const config: ToolConfig = {
          ai: {
            timeout: 0,
          },
        }

        expect(() => validateConfig(config)).toThrow('timeout must be a positive number')
      })
    })

    describe('cleanup validation', () => {
      it('should reject non-boolean backup', () => {
        const config: ToolConfig = {
          cleanup: {
            backup: 'yes' as any,
          },
        }

        expect(() => validateConfig(config)).toThrow('backup must be a boolean')
      })

      it('should reject non-boolean verbose', () => {
        const config: ToolConfig = {
          cleanup: {
            verbose: 'yes' as any,
          },
        }

        expect(() => validateConfig(config)).toThrow('verbose must be a boolean')
      })

      it('should reject non-boolean dryRun', () => {
        const config: ToolConfig = {
          cleanup: {
            dryRun: 'yes' as any,
          },
        }

        expect(() => validateConfig(config)).toThrow('dryRun must be a boolean')
      })

      it('should reject non-string pattern', () => {
        const config: ToolConfig = {
          cleanup: {
            pattern: 123 as any,
          },
        }

        expect(() => validateConfig(config)).toThrow('pattern must be a string')
      })
    })
  })

  describe('mergeWithDefaults', () => {
    it('should merge empty config with defaults', () => {
      const config: ToolConfig = {}
      const merged = mergeWithDefaults(config)

      expect(merged).toEqual(DEFAULT_CONFIG)
    })

    it('should preserve user values', () => {
      const config: ToolConfig = {
        translationFile: './custom/path.json',
        srcPath: './custom/src',
        cleanup: {
          backup: false,
          verbose: true,
        },
      }

      const merged = mergeWithDefaults(config)

      expect(merged.translationFile).toBe('./custom/path.json')
      expect(merged.srcPath).toBe('./custom/src')
      expect(merged.cleanup.backup).toBe(false)
      expect(merged.cleanup.verbose).toBe(true)
      // Should still have defaults for unspecified values
      expect(merged.cleanup.dryRun).toBe(DEFAULT_CONFIG.cleanup.dryRun)
    })

    it('should merge nested extract config', () => {
      const config: ToolConfig = {
        extract: {
          targetLanguage: 'fr',
          confidence: 'medium',
        },
      }

      const merged = mergeWithDefaults(config)

      expect(merged.extract.targetLanguage).toBe('fr')
      expect(merged.extract.confidence).toBe('medium')
      // Should have defaults for unspecified values
      expect(merged.extract.keyFormat).toBe(DEFAULT_CONFIG.extract.keyFormat)
      expect(merged.extract.maxKeyLength).toBe(DEFAULT_CONFIG.extract.maxKeyLength)
    })

    it('should merge custom i18n patterns', () => {
      const customPattern = {
        pattern: /test/,
        functionName: 'translate',
        importTemplate: 'const translate = useTranslate()',
      }

      const config: ToolConfig = {
        extract: {
          i18nPatterns: [customPattern],
        },
      }

      const merged = mergeWithDefaults(config)

      expect(merged.extract.i18nPatterns).toEqual([customPattern])
    })

    it('should override default arrays with user arrays', () => {
      const config: ToolConfig = {
        extract: {
          includeAttributes: ['custom-attr'],
          excludePatterns: ['**/custom/**'],
        },
      }

      const merged = mergeWithDefaults(config)

      expect(merged.extract.includeAttributes).toEqual(['custom-attr'])
      expect(merged.extract.excludePatterns).toEqual(['**/custom/**'])
    })

    it('should merge AI config with defaults', () => {
      const config: ToolConfig = {
        ai: {
          enabled: true,
          model: 'custom-model',
        },
      }

      const merged = mergeWithDefaults(config)

      expect(merged.ai.enabled).toBe(true)
      expect(merged.ai.model).toBe('custom-model')
      // Should have defaults
      expect(merged.ai.provider).toBe(DEFAULT_CONFIG.ai.provider)
      expect(merged.ai.baseUrl).toBe(DEFAULT_CONFIG.ai.baseUrl)
    })

    it('should preserve custom AI headers', () => {
      const config: ToolConfig = {
        ai: {
          headers: {
            'X-Custom': 'value',
          },
        },
      }

      const merged = mergeWithDefaults(config)

      expect(merged.ai.headers).toEqual({ 'X-Custom': 'value' })
    })
  })

  describe('DEFAULT_CONFIG', () => {
    it('should have all required fields', () => {
      expect(DEFAULT_CONFIG.translationFile).toBeDefined()
      expect(DEFAULT_CONFIG.srcPath).toBeDefined()
      expect(DEFAULT_CONFIG.extract).toBeDefined()
      expect(DEFAULT_CONFIG.ai).toBeDefined()
      expect(DEFAULT_CONFIG.cleanup).toBeDefined()
    })

    it('should have sensible extract defaults', () => {
      expect(DEFAULT_CONFIG.extract.targetLanguage).toBe('en')
      expect(DEFAULT_CONFIG.extract.confidence).toBe('high')
      expect(DEFAULT_CONFIG.extract.keyFormat).toBe('snake_case')
      expect(DEFAULT_CONFIG.extract.maxKeyLength).toBe(50)
      expect(DEFAULT_CONFIG.extract.interactive).toBe(false)
      expect(DEFAULT_CONFIG.extract.i18nPatterns).toEqual([])
      expect(DEFAULT_CONFIG.extract.includeAttributes.length).toBeGreaterThan(0)
      expect(DEFAULT_CONFIG.extract.excludePatterns.length).toBeGreaterThan(0)
    })

    it('should have sensible AI defaults', () => {
      expect(DEFAULT_CONFIG.ai.enabled).toBe(false)
      expect(DEFAULT_CONFIG.ai.provider).toBe('ollama')
      expect(DEFAULT_CONFIG.ai.baseUrl).toBe('http://localhost:11434')
      expect(DEFAULT_CONFIG.ai.model).toBe('codellama')
      expect(DEFAULT_CONFIG.ai.timeout).toBe(30000)
    })

    it('should have sensible cleanup defaults', () => {
      expect(DEFAULT_CONFIG.cleanup.backup).toBe(true)
      expect(DEFAULT_CONFIG.cleanup.verbose).toBe(false)
      expect(DEFAULT_CONFIG.cleanup.dryRun).toBe(false)
      expect(DEFAULT_CONFIG.cleanup.pattern).toBe('**/*.{vue,js,ts,tsx,jsx,mjs,cjs}')
    })
  })
})
