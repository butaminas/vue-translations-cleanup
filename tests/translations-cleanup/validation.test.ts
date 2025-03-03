import * as fs from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { cleanupTranslations } from '../../src/translations-cleanup'

describe('cleanupTranslations validation', () => {
  it('should validate input paths', async () => {
    vi.mocked(fs.existsSync).mockImplementation(() => false)

    await expect(cleanupTranslations({
      translationFile: 'nonexistent.json',
      srcPath: 'src',
    })).rejects.toThrow('Translation file not found')
  })
})
