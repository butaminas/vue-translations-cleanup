import * as fs from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('cLI Integration Tests', () => {
  beforeEach(() => {
    vi.unmock('../src/translations-cleanup')
    // Reset process.argv and clear mocks before each test
    process.argv = ['node', 'cli.js']
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should fail when translation file does not exist', async () => {
    // Mock both fs and fileScanner
    vi.mock('node:fs')
    vi.mock('../src/fileScanner')

    // Mock fs implementation after the module is mocked
    vi.mocked(fs.existsSync).mockImplementation(path => path !== 'nonexistent.json')

    const consoleErrorSpy = vi.spyOn(console, 'error')
    const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)

    process.argv = ['node', 'cli.js', '-t', 'nonexistent.json', '-s', 'src']

    // Clear module cache to ensure fresh import
    vi.resetModules()

    await import('../src/cli')

    // Wait for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 100))

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Translation file not found: nonexistent.json')
    expect(mockExit).toHaveBeenCalledWith(1)
  })

  it('should handle successful cleanup with unused translations', async () => {
    // Mock fs module
    vi.mock('node:fs', () => ({
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => JSON.stringify({
        common: { hello: 'Hello', unused: 'Unused Key' },
        buttons: { submit: 'Submit' },
      })),
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
    }))

    // Mock translations-cleanup to return specific results
    vi.mock('../src/translations-cleanup', () => ({
      cleanupTranslations: vi.fn().mockResolvedValue({
        totalKeys: 3,
        usedKeys: 2,
        unusedKeys: 1,
        unusedTranslations: {
          'common.unused': 'Unused Key',
        },
        cleaned: true,
      }),
    }))

    const consoleSpy = vi.spyOn(console, 'log')

    process.argv = ['node', 'cli.js', '-t', 'translations.json', '-s', 'src']

    // Clear module cache and import
    vi.resetModules()
    await import('../src/cli')

    // Wait for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 100))

    // Verify all expected console.log calls
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '\nResults:')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'Total translation keys:', 3)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'Used keys:', 2)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'Unused keys:', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(5, '\nUnused translations:')
    expect(consoleSpy).toHaveBeenNthCalledWith(7, '\nTranslations file has been updated')
  })

  it('should handle dry run mode', async () => {
    vi.mock('node:fs', () => ({
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => JSON.stringify({
        common: { hello: 'Hello', unused: 'Unused Key' },
      })),
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
    }))

    vi.mock('glob', () => ({
      glob: vi.fn().mockResolvedValue(['src/components/Test.vue']),
    }))

    const consoleSpy = vi.spyOn(console, 'log')
    const writeFileSpy = vi.spyOn(fs, 'writeFileSync')

    process.argv = ['node', 'cli.js', '-t', 'translations.json', '-s', 'src', '--dry-run']
    await import('../src/cli')

    await vi.waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('\nDry run - no changes made')
      expect(writeFileSpy).not.toHaveBeenCalled()
    })
  })

  it('should handle no unused translations', async () => {
    // Mock fs module
    vi.mock('node:fs', () => ({
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => JSON.stringify({
        common: { hello: 'Hello' },
      })),
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
    }))

    // Mock translations-cleanup to return results with no unused keys
    vi.mock('../src/translations-cleanup', () => ({
      cleanupTranslations: vi.fn().mockResolvedValue({
        totalKeys: 1,
        usedKeys: 1,
        unusedKeys: 0,
        unusedTranslations: {},
        cleaned: false
      })
    }))

    const consoleSpy = vi.spyOn(console, 'log')

    process.argv = ['node', 'cli.js', '-t', 'translations.json', '-s', 'src']

    // Clear module cache and import
    vi.resetModules()
    await import('../src/cli')

    // Wait for promises to resolve
    await new Promise(resolve => setTimeout(resolve, 100))

    // Verify expected console.log calls
    expect(consoleSpy).toHaveBeenNthCalledWith(1, '\nResults:')
    expect(consoleSpy).toHaveBeenNthCalledWith(2, 'Total translation keys:', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(3, 'Used keys:', 1)
    expect(consoleSpy).toHaveBeenNthCalledWith(4, 'Unused keys:', 0)
    expect(consoleSpy).toHaveBeenNthCalledWith(5, '\nNo unused translations found')
  })

  it('should handle verbose mode with backup', async () => {
    vi.mock('node:fs', () => ({
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => JSON.stringify({
        common: { hello: 'Hello', unused: 'Unused Key' },
      })),
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
    }))

    vi.mock('glob', () => ({
      glob: vi.fn().mockResolvedValue(['src/components/Test.vue']),
    }))

    const consoleSpy = vi.spyOn(console, 'log')
    const copyFileSpy = vi.spyOn(fs, 'copyFileSync')

    process.argv = ['node', 'cli.js', '-t', 'translations.json', '-s', 'src', '-v']
    await import('../src/cli')

    await vi.waitFor(() => {
      expect(copyFileSpy).toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Backup created at:'))
    })
  })

  it('should skip backup when --no-backup is provided', async () => {
    vi.mock('node:fs', () => ({
      existsSync: vi.fn(() => true),
      readFileSync: vi.fn(() => JSON.stringify({
        common: { hello: 'Hello', unused: 'Unused Key' },
      })),
      writeFileSync: vi.fn(),
      copyFileSync: vi.fn(),
    }))

    vi.mock('glob', () => ({
      glob: vi.fn().mockResolvedValue(['src/components/Test.vue']),
    }))

    const copyFileSpy = vi.spyOn(fs, 'copyFileSync')

    process.argv = ['node', 'cli.js', '-t', 'translations.json', '-s', 'src', '--no-backup']
    await import('../src/cli')

    await vi.waitFor(() => {
      expect(copyFileSpy).not.toHaveBeenCalled()
    })
  })
})
