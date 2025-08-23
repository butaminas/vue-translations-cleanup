import * as fs from 'node:fs'
import { glob } from 'glob'
import { describe, expect, it, vi } from 'vitest'
import { cleanupTranslations } from '../../src/translations-cleanup'

// Note: fs and glob are mocked in tests/setup.ts

describe('nested t() inside params should preserve descendant leaves when parent path is used', () => {
  it('keeps labels.license subtree when t(\'labels.license\') is used inside params', async () => {
    const translations = {
      appList: {
        context: {
          appsFor: 'Apps for {entity} {name}',
        },
      },
      labels: {
        license: {
          title: 'License',
          short: 'Lic.',
        },
        otherGroup: {
          unused: 'to remove',
        },
      },
      extra: {
        unused: 'x',
      },
    }

    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (path === 'translations.json')
        return JSON.stringify(translations)

      // The exact snippet provided (trimmed to essentials)
      return `
      const contextTitle = computed(() => {
        if (isInLicenseContext.value) {
          return t('appList.context.appsFor', { entity: t('labels.license'), name: context.value?.license?.name || '' })
        }
      })
      `
    })

    vi.mocked(glob).mockResolvedValue(['src/Component.ts'])

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

    // Must keep the subtree under labels.license because parent key was used
    expect(written.labels.license.title).toBe('License')
    expect(written.labels.license.short).toBe('Lic.')

    // Unrelated unused keys should be removed
    expect(written.extra).toBeUndefined()
    expect(written.labels.otherGroup).toBeUndefined()

    // The outer key used should remain
    expect(written.appList.context.appsFor).toBe('Apps for {entity} {name}')
  })
})
