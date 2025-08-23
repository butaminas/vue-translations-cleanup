import * as fs from 'node:fs'
import { glob } from 'glob'
import { describe, expect, it, vi } from 'vitest'
import { cleanupTranslations } from '../../src/translations-cleanup'

// Note: fs and glob are mocked in tests/setup.ts

describe('cleanupTranslations pruning', () => {
  it('prunes fully empty nested branches after deletion', async () => {
    const translations = {
      A: {
        B: {
          C: 'value',
        },
      },
      other: {
        used: 'keep',
      },
    }

    // Mock fs reads: translation file and source files
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (path === 'translations.json') {
        return JSON.stringify(translations)
      }
      // Only use a key from the other branch so A.B.C becomes unused
      return `
        t('other.used')
      `
    })

    // Ensure glob returns at least one file (already set in setup)
    vi.mocked(glob).mockResolvedValue(['src/App.vue'])

    // Capture writeFileSync payload
    const writeSpy = vi.mocked(fs.writeFileSync)

    await cleanupTranslations({
      translationFile: 'translations.json',
      srcPath: 'src',
      dryRun: false, // actually triggers write
      backup: false, // skip backup for simplicity
    })

    expect(writeSpy).toHaveBeenCalled()
    const args = writeSpy.mock.calls[0]
    const written = JSON.parse(String(args[1]))

    // The entire A branch should be removed because it became empty after deleting C
    expect(written.A).toBeUndefined()
    // The other branch must remain intact
    expect(written.other.used).toBe('keep')
  })

  it('keeps parent branch when siblings still exist', async () => {
    const translations = {
      A: {
        B: {
          C1: 'v1',
          C2: 'v2',
        },
      },
    }

    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (path === 'translations.json') {
        return JSON.stringify(translations)
      }
      // Use only C1 so C2 will be removed, but A.B should stay with C1
      return `
        t('A.B.C1')
      `
    })

    vi.mocked(glob).mockResolvedValue(['src/Only.vue'])

    const writeSpy = vi.mocked(fs.writeFileSync)

    await cleanupTranslations({
      translationFile: 'translations.json',
      srcPath: 'src',
      dryRun: false,
      backup: false,
    })

    expect(writeSpy).toHaveBeenCalled()
    const args = writeSpy.mock.calls[0]
    const written = JSON.parse(String(args[1]))

    // Parent and used sibling remain
    expect(written.A.B.C1).toBe('v1')
    // Unused sibling removed
    expect(written.A.B.C2).toBeUndefined()
  })
})

it('removes pre-existing empty root groups when cleanup performs deletions', async () => {
  const translations = {
    tooltips: {},
    validation: {},
    media: {
      appMedia: 'App media',
    },
    other: {
      unused: 'to remove',
    },
  }

  vi.mocked(fs.readFileSync).mockImplementation((path) => {
    if (path === 'translations.json') {
      return JSON.stringify(translations)
    }
    // Use only media.appMedia so 'other.unused' is deleted and root empties can be pruned
    return `
      t('media.appMedia')
    `
  })

  vi.mocked(glob).mockResolvedValue(['src/App.vue'])

  const writeSpy = vi.mocked(fs.writeFileSync)

  await cleanupTranslations({
    translationFile: 'translations.json',
    srcPath: 'src',
    dryRun: false,
    backup: false,
  })

  expect(writeSpy).toHaveBeenCalled()
  const args = writeSpy.mock.calls[0]
  const written = JSON.parse(String(args[1]))

  // Pre-existing empties should be gone
  expect(written.tooltips).toBeUndefined()
  expect(written.validation).toBeUndefined()

  // The used branch remains
  expect(written.media.appMedia).toBe('App media')

  // The 'other' branch becomes empty after removing 'unused' and should be pruned too
  expect(written.other).toBeUndefined()
})

it('prunes empty root groups even when no unused keys are detected in this run', async () => {
  const translations = {
    navigation: {}, // empty group created by previous cleanup
    usedGroup: {
      a: 'b',
    },
  }

  vi.mocked(fs.readFileSync).mockImplementation((path) => {
    if (path === 'translations.json') {
      return JSON.stringify(translations)
    }
    // Only use the existing leaf so there are zero unused keys this run
    return `
      t('usedGroup.a')
    `
  })

  vi.mocked(glob).mockResolvedValue(['src/App.vue'])

  const writeSpy = vi.mocked(fs.writeFileSync)

  await cleanupTranslations({
    translationFile: 'translations.json',
    srcPath: 'src',
    dryRun: false,
    backup: false,
  })

  expect(writeSpy).toHaveBeenCalled()
  const args = writeSpy.mock.calls[0]
  const written = JSON.parse(String(args[1]))

  // Empty navigation group should be pruned even though no unused keys existed
  expect(written.navigation).toBeUndefined()
  // Used branch remains intact
  expect(written.usedGroup.a).toBe('b')
})
