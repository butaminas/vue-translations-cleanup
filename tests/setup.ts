import { vi } from 'vitest'
import * as fs from 'node:fs'
import { glob } from 'glob'
import { afterEach, beforeEach } from 'vitest'

// Mock modules
vi.mock('node:fs')
vi.mock('glob')

export const mockTranslations = {
    common: {
        hello: 'Hello',
        unused: 'Unused Key'
    },
    buttons: {
        submit: 'Submit'
    }
}

export const mockFiles = [
    'src/components/Test.vue',
    'src/utils/helper.ts'
]

beforeEach(() => {
    // Setup fs mock
    vi.mocked(fs.existsSync).mockImplementation(() => true)
    vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (path === 'translations.json') {
            return JSON.stringify(mockTranslations)
        }
        // Mock file content that uses some translations
        return `
            const t = (key) => key;
            t('common.hello')
            t('buttons.submit')
        `
    })

    // Setup glob mock
    vi.mocked(glob).mockResolvedValue(mockFiles)
})

afterEach(() => {
    vi.clearAllMocks()
})
