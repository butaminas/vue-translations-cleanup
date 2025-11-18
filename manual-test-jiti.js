/**
 * Manual test script to verify jiti TypeScript loading works
 * Run with: node manual-test-jiti.js
 */

const fs = require('fs')
const path = require('path')
const { createJiti } = require('jiti')

// Create a test directory and config file
const testDir = path.join(__dirname, 'test-jiti-temp')
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true })
}

const configPath = path.join(testDir, 'test.config.ts')
fs.writeFileSync(configPath, `
export default {
  translationFile: './locales/en.json',
  srcPath: './src',
  extract: {
    targetLanguage: 'en',
    confidence: 'high',
    keyFormat: 'camelCase',
    i18nPatterns: [
      {
        pattern: /const\\s*{\\s*t\\s*}\\s*=\\s*useI18n\\(\\)/g,
        functionName: 't',
        importTemplate: 'const { t } = useI18n()',
      },
    ],
  },
}
`)

console.log('Created test config file at:', configPath)
console.log('File exists:', fs.existsSync(configPath))

try {
  // Create jiti instance
  const jiti = createJiti(__filename, {
    interopDefault: true,
  })

  console.log('\nAttempting to load config with jiti...')
  const config = jiti(configPath)

  console.log('\n✓ Success! Loaded config:')
  console.log(JSON.stringify(config, null, 2))

  // Verify the regex pattern
  console.log('\nPattern type:', typeof config.extract.i18nPatterns[0].pattern)
  console.log('Is RegExp:', config.extract.i18nPatterns[0].pattern instanceof RegExp)
}
catch (error) {
  console.error('\n✗ Failed to load config:')
  console.error(error.message)
  console.error(error.stack)
  process.exit(1)
}
finally {
  // Cleanup
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true })
    console.log('\nCleaned up test directory')
  }
}
