import * as fs from 'node:fs'
import { glob } from 'glob'
import { describe, expect, it, vi } from 'vitest'
import { cleanupTranslations } from '../../src/translations-cleanup'

// fs and glob are mocked in tests/setup.ts

describe('Vue template directives and components detection', () => {
  it('detects v-t directive with static string and object path', async () => {
    const translations = {
      labels: {
        license: {
          title: 'License',
          details: 'Details',
        },
      },
    }

    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (path === 'translations.json') {
        return JSON.stringify(translations)
      }
      // Simulate a .vue template content
      return `
      <template>
        <div>
          <span v-t="'labels.license.title'"></span>
          <p v-t="{ path: 'labels.license.details', args: { foo: 1 } }"></p>
        </div>
      </template>
      <script setup lang="ts">
        // Also include a normal t() to ensure no regressions
        t('labels.license.title')
      </script>
      `
    })

    vi.mocked(glob).mockResolvedValue(['src/Component.vue'])

    const result = await cleanupTranslations({
      translationFile: 'translations.json',
      srcPath: 'src',
      dryRun: true,
    })

    const used = Array.from(result.usedKeysSet)
    expect(used).toContain('labels.license.title')
    expect(used).toContain('labels.license.details')
  })

  it('detects <i18n-t> component keypath (static and bound)', async () => {
    const translations = {
      labels: {
        license: {
          header: 'Header',
          footer: 'Footer',
        },
      },
    }

    vi.mocked(fs.readFileSync).mockImplementation((path) => {
      if (path === 'translations.json') {
        return JSON.stringify(translations)
      }
      return `
      <template>
        <i18n-t keypath="labels.license.header"></i18n-t>
        <i18n-t :keypath="'labels.license.footer'"></i18n-t>
      </template>
      `
    })

    vi.mocked(glob).mockResolvedValue(['src/I18nComp.vue'])

    const result = await cleanupTranslations({
      translationFile: 'translations.json',
      srcPath: 'src',
      dryRun: true,
    })

    const used = Array.from(result.usedKeysSet)
    expect(used).toContain('labels.license.header')
    expect(used).toContain('labels.license.footer')
  })
})
