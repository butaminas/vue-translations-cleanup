import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cleanupTranslations } from '../src/translations-cleanup'
import * as fs from 'node:fs'
import { glob } from 'glob'

// Mock fs and glob
vi.mock('node:fs')
vi.mock('glob')
vi.mock('../src/translation-cleanup', () => ({
    cleanupTranslations: vi.fn().mockResolvedValue({
        totalKeys: 3,
        usedKeys: 2,
        unusedKeys: 1,
        unusedTranslations: ['common.unused'],
        cleaned: true
    })
}))


describe('CLI', () => {
    beforeEach(() => {
        // Reset process.argv and mocks
        process.argv = ['node', 'cli.js']
        vi.clearAllMocks()

        // Clear module cache
        vi.resetModules()

        // Setup fs mock
        vi.mocked(fs.existsSync).mockImplementation(() => true)
        vi.mocked(fs.readFileSync).mockImplementation((path) => {
            if (path === 'translations.json') {
                return JSON.stringify({
                    common: { hello: 'Hello', unused: 'Unused Key' },
                    buttons: { submit: 'Submit' }
                })
            }
            return ''
        })

        // Setup glob mock
        vi.mocked(glob).mockResolvedValue(['src/components/Test.vue'])
    })

    afterEach(() => {
        vi.clearAllMocks()
        vi.resetModules()
    })


    it('should require translation file and source path', async () => {
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

        process.argv = ['node', 'cli.js']

        await import('../src/cli')

        expect(mockExit).toHaveBeenCalledWith(1)
    })

    it('should pass correct options to cleanupTranslations', async () => {
        process.argv = [
            'node',
            'cli.js',
            '-t', 'translations.json',
            '-s', 'src',
            '--dry-run',
            '-v'
        ]

        await import('../src/cli')

        // Wait for next tick
        await new Promise(process.nextTick)

        // Check if the function was called at all
        expect(cleanupTranslations).toHaveBeenCalled()

        // Check the actual arguments
        const calls = vi.mocked(cleanupTranslations).mock.calls
        const firstCall = calls[0][0]

        expect(firstCall).toMatchObject({
            translationFile: 'translations.json',
            srcPath: 'src',
            backup: true,
            dryRun: true,
            verbose: true
        })
    })

    it('should handle successful execution', async () => {
        const consoleSpy = vi.spyOn(console, 'log')

        process.argv = [
            'node',
            'cli.js',
            '-t', 'translations.json',
            '-s', 'src'
        ]

        // Import CLI module fresh for each test
        await import('../src/cli')

        // Wait for next tick to ensure async operations complete
        await new Promise(resolve => setImmediate(resolve))

        expect(cleanupTranslations).toHaveBeenCalled()
        expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Results:'))
        expect(consoleSpy).toHaveBeenCalledWith('Total translation keys:', 3)
        expect(consoleSpy).toHaveBeenCalledWith('Used keys:', 2)
    })

    it('should handle errors', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error')
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

        // Mock the rejection before importing the CLI
        vi.mocked(cleanupTranslations).mockRejectedValueOnce(new Error('Test error'))

        process.argv = [
            'node',
            'cli.js',
            '-t', 'translations.json',
            '-s', 'src'
        ]

        await import('../src/cli')

        // Wait for promises to resolve
        await vi.waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Test error')
            expect(mockExit).toHaveBeenCalledWith(1)
        })
    })
})
