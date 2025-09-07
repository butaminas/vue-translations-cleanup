import type { MockInstance } from 'vitest'
import fs from 'node:fs'
import { glob } from 'glob'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// We mock cleanupTranslations to track calls and supply deterministic results
vi.mock('@/translations-cleanup', () => ({
  cleanupTranslations: vi.fn().mockResolvedValue({
    totalKeys: 50,
    usedKeys: 47,
    unusedKeys: 3,
    unusedTranslations: ['a.b', 'c.d', 'e.f'],
    cleaned: true,
  }),
}))

describe('cli directory mode', () => {
  let consoleLogSpy: MockInstance
  let processExitSpy: MockInstance
  let originalArgv: string[]

  beforeEach(() => {
    originalArgv = process.argv
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(
      () => undefined as never,
    )
  })

  afterEach(() => {
    process.argv = originalArgv
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('processes all JSON files in a directory and prints summary (non-verbose)', async () => {
    // Arrange: set args with -t as a directory
    process.argv = ['node', 'cli.js', '-t', '/project/locales', '-s', '/project/src']

    // Make fs.statSync return isDirectory() true for translations path
    vi.mocked(fs.statSync as any).mockReturnValue({ isDirectory: () => true })

    // Provide two json files via glob
    vi.mocked(glob).mockResolvedValue(['en.json', 'nested/lt.json'] as any)

    const { cleanupTranslations } = await import('@/translations-cleanup')

    // Act
    await import('@/cli')

    // Assert
    expect(cleanupTranslations).toHaveBeenCalledTimes(2)
    // Summary: each returns 3 unused -> total 6 across 2 files
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Found 6 unused translation keys across 2 file(s)'),
    )

    expect(processExitSpy).not.toHaveBeenCalled()
  })

  it('prints file count when verbose', async () => {
    process.argv = ['node', 'cli.js', '-t', '/project/locales', '-s', '/project/src', '--verbose']

    // Directory mode
    vi.mocked(fs.statSync as any).mockReturnValue({ isDirectory: () => true })
    vi.mocked(glob).mockResolvedValue(['en.json', 'fr.json'] as any)

    await import('@/cli')

    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('Found 2 translation files'),
    )
  })
})
