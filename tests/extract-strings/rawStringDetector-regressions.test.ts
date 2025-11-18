import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectRawStringsInFile } from '@/extract-strings/rawStringDetector'
import type { ExtractConfig } from '@/config/types'
import fs from 'node:fs'
import path from 'node:path'

// Mock the file system using memfs
const { vol } = vi.hoisted(() => {
  const { vol } = require('memfs')
  return { vol }
})

vi.mock('node:fs', () => ({ default: vol }))
vi.mock('node:fs/promises', () => vol.promises)

/**
 * REGRESSION TESTS based on real user-reported issues
 *
 * User feedback: "the result is very very poor"
 * Issues:
 * 1. Extracted already-translated strings like t('deleteDialog.title')
 * 2. Extracted variable references like {{ dialogTitle }}
 * 3. Extracted CSS code like "white-space: break-spaces;"
 * 4. Extracted data bindings like {{ item.name }}
 * 5. MISSED the only real raw string: text="New Project"
 */

describe('rawStringDetector - user-reported regressions', () => {
  const testFilePath = '/test/temp-regression-test.vue'

  const config: ExtractConfig = {
    targetLanguage: 'en',
    confidence: 'high',
    keyFormat: 'camelCase',
    includeAttributes: ['text', 'placeholder', 'title', 'alt', 'label', 'aria-label'],
  }

  beforeEach(() => {
    vol.reset()
    vol.mkdirSync('/test', { recursive: true })
  })

  afterEach(() => {
    vol.reset()
  })

  describe('Issue 1: Should NOT extract already-translated strings', () => {
    it('should skip {{ t(...) }} in templates', () => {
      const vueContent = `
<template>
  <span class="text-h6">{{ t('deleteDialog.title') }}</span>
</template>
<script setup>
const { t } = useI18n()
</script>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // Should NOT extract "t('deleteDialog.title')" or "deleteDialog.title"
      expect(results).toEqual([])
    })

    it('should skip {{ $t(...) }} in templates', () => {
      const vueContent = `
<template>
  <p>{{ $t('deleteDialog.message', { name: projectName }) }}</p>
</template>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // Should NOT extract anything
      expect(results).toEqual([])
    })

    it('should skip t() calls in script', () => {
      const vueContent = `
<script setup>
const { t } = useI18n()
const dialogTitle = computed(() =>
  isEditMode.value
    ? t('dialog.editProject', { name: props.project?.name })
    : t('dialog.createProject')
)
</script>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // Should NOT extract "dialog.editProject" or "dialog.createProject"
      expect(results).toEqual([])
    })
  })

  describe('Issue 2: Should NOT extract variable references', () => {
    it('should skip {{ variableName }} interpolations', () => {
      const vueContent = `
<template>
  <div class="text-h5 ps-2">
    {{ dialogTitle }}
  </div>
</template>
<script setup>
const { t } = useI18n()
const dialogTitle = computed(() => isEditMode.value ? t('dialog.editProject') : t('dialog.createProject'))
</script>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // Should NOT extract "dialogTitle" variable reference from template
      // The t() calls in script are already i18n, so nothing to extract
      expect(results).toEqual([])
    })

    it('should skip {{ item.property }} data bindings', () => {
      const vueContent = `
<template>
  <template #item.title="{ value }">
    {{ value }}
  </template>
  <td>{{ item.name }}</td>
  <td>{{ item.number }}</td>
  <td>{{ item.description || '-' }}</td>
</template>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // Should NOT extract "value", "item.name", etc.
      // The "-" is a single character, so it's also not translatable
      expect(results).toEqual([])
    })

    it('should skip complex expressions', () => {
      const vueContent = `
<template>
  <span>{{ imagePreview ? t('form.changeImage') : t('form.uploadImage') }}</span>
</template>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // Should NOT extract anything (all inside {{ }} and using t())
      expect(results).toEqual([])
    })
  })

  describe('Issue 3: Should NOT extract CSS/code', () => {
    it('should skip CSS style values', () => {
      const vueContent = `
<script setup>
export const vuetify = createVuetify({
  defaults: {
    VCardTitle: {
      style: 'white-space: break-spaces;',
    },
  },
})
</script>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // Should NOT extract CSS code
      expect(results).toEqual([])
    })

    it('should skip config object values', () => {
      const vueContent = `
<script setup>
const config = {
  elevation: 0,
  rounded: 'xl',
  flat: true,
  border: true,
}
</script>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // Should NOT extract "xl" or other config values
      expect(results).toEqual([])
    })
  })

  describe('Issue 4: SHOULD extract actual raw strings', () => {
    it('should extract text attribute values (Vuetify)', () => {
      const vueContent = `
<template>
  <v-btn
    color="primary"
    class="me-2"
    prepend-icon="mdi-plus"
    rounded="lg"
    variant="outlined"
    text="New Project"
    @click="emit('create')"
  />
</template>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // SHOULD extract "New Project"
      expect(results).toHaveLength(1)
      expect(results[0].text).toBe('New Project')
      expect(results[0].attributeName).toBe('text')
      expect(results[0].context).toBe('attribute')
    })

    it('should extract placeholder attribute values', () => {
      const vueContent = `
<template>
  <input placeholder="Enter your name" />
  <input :placeholder="t('form.placeholder')" />
</template>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // SHOULD extract "Enter your name"
      // Should NOT extract the :placeholder (dynamic binding)
      expect(results).toHaveLength(1)
      expect(results[0].text).toBe('Enter your name')
    })

    it('should extract literal text content', () => {
      const vueContent = `
<template>
  <h1>Welcome to our application</h1>
  <p>This is a paragraph with real text that needs translation.</p>
  <span>{{ alreadyTranslated }}</span>
</template>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // SHOULD extract the two literal text strings
      // Should NOT extract {{ alreadyTranslated }}
      expect(results).toHaveLength(2)
      expect(results.map(r => r.text)).toContain('Welcome to our application')
      expect(results.map(r => r.text)).toContain('This is a paragraph with real text that needs translation.')
    })
  })

  describe('Issue 5: Should handle mixed scenarios correctly', () => {
    it('should extract only raw strings from complex template', () => {
      const vueContent = `
<template>
  <div>
    <h1>Create Project</h1>
    <p>{{ t('dialog.description') }}</p>
    <input placeholder="Project name" />
    <button>{{ buttonLabel }}</button>
    <button>Save</button>
  </div>
</template>
<script setup>
const { t } = useI18n()
const buttonLabel = ref('Cancel')
</script>
`
      fs.writeFileSync(testFilePath, vueContent)
      const results = detectRawStringsInFile(testFilePath, config)

      // Debug: show what we extracted
      if (results.length !== 3) {
        console.log('Extracted:', results.map(r => ({ text: r.text, context: r.context })))
      }

      // SHOULD extract:
      // - "Create Project" (literal text in template)
      // - "Project name" (placeholder attribute in template)
      // - "Save" (literal text in template)
      //
      // Should NOT extract:
      // - {{ t('dialog.description') }} (already translated)
      // - {{ buttonLabel }} (variable reference)
      // - "Cancel" in script (we don't extract from script sections to match eslint-plugin-vue-i18n/no-raw-text)
      expect(results).toHaveLength(3)
      expect(results.map(r => r.text)).toContain('Create Project')
      expect(results.map(r => r.text)).toContain('Project name')
      expect(results.map(r => r.text)).toContain('Save')
    })
  })
})
