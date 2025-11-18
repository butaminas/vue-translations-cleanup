const { createJiti } = require('jiti')
const path = require('path')

const configPath = path.join(__dirname, 'vue-translations-cleanup.config.ts')
console.log('Loading config from:', configPath)

const jiti = createJiti(__filename, { interopDefault: true })
const config = jiti(configPath)

console.log('\n✓ Config loaded successfully!')
console.log('Translation file:', config.translationFile)
console.log('Source path:', config.srcPath)
console.log('Custom patterns:', config.extract.i18nPatterns.length)
console.log('Pattern function name:', config.extract.i18nPatterns[0].functionName)
console.log('Pattern is RegExp:', config.extract.i18nPatterns[0].pattern instanceof RegExp)
