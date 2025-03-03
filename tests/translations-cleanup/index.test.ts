import * as fs from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { cleanupTranslations } from '../../src/translations-cleanup'

describe('cleanupTranslations', () => {
  it('should handle dry run mode', async () => {
    const result = await cleanupTranslations({
      translationFile: 'translations.json',
      srcPath: 'src',
      dryRun: true,
    })

    expect(result.cleaned).toBe(false)
  })
})
