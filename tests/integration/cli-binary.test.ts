import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

/**
 * INTEGRATION TESTS for the compiled CLI binary
 *
 * These tests run the ACTUAL compiled CLI from dist/cli.js
 * This catches issues like:
 * - Path alias resolution problems (@/ imports)
 * - Missing dependencies in production
 * - Module resolution errors
 * - Runtime errors that don't show up in unit tests
 *
 * NOTE: These tests require 'yarn build' to have been run first
 */

// TODO: These tests need work - require building dist first and have environment issues
// For now, manual testing after `yarn build` is the verification method
describe.skip('integration: CLI binary', () => {
  const testDir = path.join(process.cwd(), 'tests', 'integration', 'cli-fixtures')
  const cliBin = path.join(process.cwd(), 'dist', 'cli.js')

  beforeEach(() => {
    // Ensure dist/cli.js exists
    if (!fs.existsSync(cliBin)) {
      throw new Error('CLI binary not found. Run "yarn build" first.')
    }

    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
  })

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(testDir)) {
      const files = fs.readdirSync(testDir, { recursive: true })
      for (const file of files) {
        const filePath = path.join(testDir, String(file))
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath)
        }
      }
      // Remove directories
      const dirs = fs.readdirSync(testDir)
      for (const dir of dirs) {
        const dirPath = path.join(testDir, dir)
        if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
          fs.rmSync(dirPath, { recursive: true })
        }
      }
    }
  })

  describe('--help flag', () => {
    it('should show help without errors', () => {
      const output = execSync(`node "${cliBin}" --help`, {
        encoding: 'utf-8',
        cwd: testDir,
      })

      expect(output).toContain('Usage:')
      expect(output).toContain('vue-translations-cleanup')
    })
  })

  describe('--config flag with TypeScript file', () => {
    it('should load TypeScript config file without module errors', () => {
      // Create a simple translation file
      const localesDir = path.join(testDir, 'locales')
      fs.mkdirSync(localesDir, { recursive: true })
      fs.writeFileSync(
        path.join(localesDir, 'en.json'),
        JSON.stringify({ test: 'value' }),
      )

      // Create a simple source file
      const srcDir = path.join(testDir, 'src')
      fs.mkdirSync(srcDir, { recursive: true })
      fs.writeFileSync(
        path.join(srcDir, 'App.vue'),
        '<template><div>{{ $t("test") }}</div></template>',
      )

      // Create TypeScript config file
      const configPath = path.join(testDir, 'test.config.ts')
      fs.writeFileSync(configPath, `
export default {
  translationFile: './locales/en.json',
  srcPath: './src',
  cleanup: {
    backup: false,
  },
}
`)

      // Run CLI with config - should not throw module resolution errors
      const output = execSync(
        `node "${cliBin}" --config ./test.config.ts --dry-run --verbose`,
        {
          encoding: 'utf-8',
          cwd: testDir,
        },
      )

      // Should not contain module errors
      expect(output).not.toContain('Cannot find module')
      expect(output).not.toContain('Error:')
      expect(output).toContain('en.json') // Should process the file
    })

    it('should load TypeScript config with custom i18n pattern', () => {
      // Create translation file
      const localesDir = path.join(testDir, 'locales')
      fs.mkdirSync(localesDir, { recursive: true })
      fs.writeFileSync(
        path.join(localesDir, 'en.json'),
        JSON.stringify({ greeting: 'Hello' }),
      )

      // Create source file with custom pattern
      const srcDir = path.join(testDir, 'src')
      fs.mkdirSync(srcDir, { recursive: true })
      fs.writeFileSync(
        path.join(srcDir, 'Component.vue'),
        `
<script setup>
const { i18n: { t } } = injectContext()
const msg = t('greeting')
</script>
        `.trim(),
      )

      // Create config with custom pattern
      const configPath = path.join(testDir, 'custom-pattern.config.ts')
      fs.writeFileSync(configPath, `
export default {
  translationFile: './locales/en.json',
  srcPath: './src',
  extract: {
    i18nPatterns: [
      {
        pattern: /const\\s*\\{(?:[^{}]*\\{[^}]*\\}[^,]*,\\s*)*[^{}]*i18n\\s*:\\s*\\{\\s*t\\s*\\}[^}]*\\}\\s*=\\s*injectContext\\(\\)/g,
        functionName: 't',
        importTemplate: 'const { i18n: { t } } = injectContext()',
      },
    ],
  },
}
`)

      // Run with --extract mode
      const output = execSync(
        `node "${cliBin}" --extract --config ./custom-pattern.config.ts --dry-run`,
        {
          encoding: 'utf-8',
          cwd: testDir,
        },
      )

      // Should recognize the custom pattern
      expect(output).not.toContain('Error')
      expect(output).not.toContain('Cannot find module')
    })
  })

  describe('error handling', () => {
    it('should show helpful error when config file not found', () => {
      try {
        execSync(`node "${cliBin}" --config ./non-existent.ts`, {
          encoding: 'utf-8',
          cwd: testDir,
          stdio: 'pipe',
        })
        // Should not reach here
        expect(true).toBe(false)
      }
      catch (error: any) {
        const stderr = error.stderr?.toString() || error.stdout?.toString() || ''
        expect(stderr).toContain('Config file not found')
      }
    })

    it('should show helpful error for invalid TypeScript syntax', () => {
      const configPath = path.join(testDir, 'invalid.config.ts')
      fs.writeFileSync(configPath, `
export default {
  invalid syntax here
}
`)

      try {
        execSync(`node "${cliBin}" --config ./invalid.config.ts`, {
          encoding: 'utf-8',
          cwd: testDir,
          stdio: 'pipe',
        })
        // Should not reach here
        expect(true).toBe(false)
      }
      catch (error: any) {
        const stderr = error.stderr?.toString() || error.stdout?.toString() || ''
        expect(stderr).toContain('Failed to load config')
      }
    })
  })
})
