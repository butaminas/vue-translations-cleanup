import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the translations-cleanup module
vi.mock('@/translations-cleanup', () => ({
  cleanupTranslations: vi.fn().mockResolvedValue({
    totalKeys: 100,
    usedKeys: 90,
    unusedKeys: 10,
    unusedTranslations: ['key1', 'key2', 'key3'],
    cleaned: true,
  }),
}))

describe('cLI', () => {
  let consoleLogSpy: MockInstance
  let consoleErrorSpy: MockInstance
  let processExitSpy: MockInstance
  let originalArgv: string[]

  beforeEach(() => {
    // Save original process.argv
    originalArgv = process.argv

    // Mock console methods
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    )
  })

  afterEach(() => {
    // Restore original argv
    process.argv = originalArgv

    // Clear mocks
    vi.clearAllMocks()
  })

  it('should execute with required options', async () => {
    // Set up process.argv for the CLI
    process.argv = [
      'node',
      'cli.js',
      '-t',
      './locales/en.json',
      '-s',
      './src',
    ]

    // Import and execute the CLI module
    const { cleanupTranslations } = await import('@/translations-cleanup')
    await import('@/cli')

    // Verify cleanupTranslations was called with correct arguments
    expect(cleanupTranslations).toHaveBeenCalledWith({
      translationFile: expect.any(String),
      srcPath: expect.any(String),
      backup: true,
      dryRun: undefined,
      verbose: undefined,
    })

    // Check console output contained expected message
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Found 10 unused translation keys out of 100 total keys'),
    )

    // Check expected results were logged
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Translations file has been updated:'),
    )
  })

  it('should support dry run mode', async () => {
    // Set up process.argv for the CLI with dry-run option
    process.argv = [
      'node',
      'cli.js',
      '-t',
      './locales/en.json',
      '-s',
      './src',
      '--dry-run',
    ]

    // Clear module cache to ensure fresh execution
    vi.resetModules()

    const { cleanupTranslations } = await import('@/translations-cleanup')
    await import('@/cli')

    // Verify cleanupTranslations was called with dry-run flag
    expect(cleanupTranslations).toHaveBeenCalledWith({
      translationFile: expect.any(String),
      srcPath: expect.any(String),
      backup: true,
      dryRun: true,
      verbose: undefined,
    })

    // Check dry run message was logged
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Dry run - no changes made'),
    )
  })

  it('should display verbose output when requested', async () => {
    // Set up process.argv for the CLI with verbose option
    process.argv = [
      'node',
      'cli.js',
      '-t',
      './locales/en.json',
      '-s',
      './src',
      '--verbose',
    ]

    // Clear module cache to ensure fresh execution
    vi.resetModules()

    const { cleanupTranslations } = await import('@/translations-cleanup')
    await import('@/cli')

    // Verify cleanupTranslations was called with verbose flag
    expect(cleanupTranslations).toHaveBeenCalledWith({
      translationFile: expect.any(String),
      srcPath: expect.any(String),
      backup: true,
      dryRun: undefined,
      verbose: true,
    })

    // Check verbose information was logged (partially)
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Results:'))
    expect(consoleLogSpy).toHaveBeenCalledWith('Total translation keys:', 100)
    expect(consoleLogSpy).toHaveBeenCalledWith('Used keys:', 90)
    expect(consoleLogSpy).toHaveBeenCalledWith('Unused keys:', 10)
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Unused translations:'))
  })

  it('should handle errors', async () => {
    // Mock cleanupTranslations to reject with an error
    const { cleanupTranslations } = await import('@/translations-cleanup')
    vi.mocked(cleanupTranslations).mockRejectedValueOnce(new Error('Test error'))

    // Set up process.argv for the CLI
    process.argv = [
      'node',
      'cli.js',
      '-t',
      './locales/en.json',
      '-s',
      './src',
    ]

    // Clear module cache to ensure fresh execution
    vi.resetModules()

    // Import and execute the CLI module
    await import('@/cli')

    // Verify error handling
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error:', 'Test error')
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})
