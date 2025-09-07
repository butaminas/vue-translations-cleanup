import type { MockInstance } from 'vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// We will mock detectConfig and cleanupTranslations per test

describe('cli auto-detect usage', () => {
  let consoleLogSpy: MockInstance
  let consoleErrorSpy: MockInstance
  let processExitSpy: MockInstance
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    )
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('runs with no -t/-s by using auto-detection for both', async () => {
    // Arrange argv: no paths
    process.argv = ['node', 'cli.js']

    // Mock detection to provide both paths
    vi.doMock('@/cli-detection', () => ({
      detectConfig: vi.fn().mockResolvedValue({
        srcPath: '/project/src',
        translationsPath: '/project/locales',
      }),
    }))

    // Mock cleanup
    const cleanupMock = vi.fn().mockResolvedValue({
      totalKeys: 10,
      usedKeys: 5,
      unusedKeys: 5,
      unusedTranslations: ['a', 'b'],
      cleaned: true,
    })
    vi.doMock('@/translations-cleanup', () => ({
      cleanupTranslations: cleanupMock,
    }))

    // Act
    await import('@/cli')

    // Assert: called once with detected paths
    expect(cleanupMock).toHaveBeenCalledTimes(1)
    expect(cleanupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        translationFile: expect.any(String),
        srcPath: expect.any(String),
      }),
    )

    // Non-verbose default prints a summary containing 'Found' and 'unused'
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Found'),
    )
  })

  it('with only -t provided uses auto-detect for src', async () => {
    process.argv = ['node', 'cli.js', '-t', '/project/locales/en.json']

    vi.doMock('@/cli-detection', () => ({
      detectConfig: vi.fn().mockResolvedValue({ srcPath: '/project/src' }),
    }))

    const cleanupMock = vi.fn().mockResolvedValue({
      totalKeys: 10,
      usedKeys: 9,
      unusedKeys: 1,
      unusedTranslations: ['x'],
      cleaned: true,
    })
    vi.doMock('@/translations-cleanup', () => ({
      cleanupTranslations: cleanupMock,
    }))

    await import('@/cli')

    expect(cleanupMock).toHaveBeenCalledTimes(1)
    expect(cleanupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        translationFile: expect.stringContaining('en.json'),
        srcPath: expect.any(String),
      }),
    )
  })

  it('with only -s provided uses auto-detect for translations', async () => {
    process.argv = ['node', 'cli.js', '-s', '/project/src']

    vi.doMock('@/cli-detection', () => ({
      detectConfig: vi.fn().mockResolvedValue({ translationsPath: '/project/locales/en.json' }),
    }))

    const cleanupMock = vi.fn().mockResolvedValue({
      totalKeys: 3,
      usedKeys: 2,
      unusedKeys: 1,
      unusedTranslations: ['y'],
      cleaned: true,
    })
    vi.doMock('@/translations-cleanup', () => ({
      cleanupTranslations: cleanupMock,
    }))

    await import('@/cli')

    expect(cleanupMock).toHaveBeenCalledTimes(1)
    expect(cleanupMock).toHaveBeenCalledWith(
      expect.objectContaining({
        translationFile: expect.any(String),
        srcPath: expect.stringContaining('/project/src'),
      }),
    )
  })

  it('exits with error when auto-detection cannot determine required paths', async () => {
    process.argv = ['node', 'cli.js']

    vi.doMock('@/cli-detection', () => ({
      detectConfig: vi.fn().mockResolvedValue({ reason: 'Could not detect' }),
    }))

    const cleanupMock = vi.fn()
    vi.doMock('@/translations-cleanup', () => ({
      cleanupTranslations: cleanupMock,
    }))

    await import('@/cli')

    expect(cleanupMock).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Could not determine required paths'),
    )
    expect(processExitSpy).toHaveBeenCalledWith(1)
  })
})
