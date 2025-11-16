import fs from 'node:fs'
import { parse as parseVueSFC } from '@vue/compiler-sfc'
import type { I18nDetectionResult, RawStringLocation } from './types'

export interface ReplaceResult {
  file: string
  replacements: number
  importAdded: boolean
  backupCreated: boolean
}

/**
 * Replace a raw string with i18n function call in template
 */
function replaceInTemplate(
  content: string,
  location: RawStringLocation,
  key: string,
  functionName: string,
): string {
  const { text, context, attributeName } = location

  if (context === 'attribute' && attributeName) {
    // Replace attribute="text" with :attribute="t('key')"
    // Handle both single and double quotes
    const attrRegex = new RegExp(`${attributeName}=["']${escapeRegex(text)}["']`, 'g')
    return content.replace(attrRegex, `:${attributeName}="${functionName}('${key}')"`)
  }

  if (context === 'template') {
    // Replace >text< with >{{ t('key') }}<
    const textRegex = new RegExp(`>\\s*${escapeRegex(text)}\\s*<`, 'g')
    return content.replace(textRegex, `>{{ ${functionName}('${key}') }}<`)
  }

  return content
}

/**
 * Replace a raw string with i18n function call in script
 */
function replaceInScript(
  content: string,
  location: RawStringLocation,
  key: string,
  functionName: string,
): string {
  const { text } = location

  // Replace string literals with t('key')
  // Handle single, double quotes, and template literals
  const patterns = [
    new RegExp(`"${escapeRegex(text)}"`, 'g'),
    new RegExp(`'${escapeRegex(text)}'`, 'g'),
    new RegExp(`\`${escapeRegex(text)}\``, 'g'),
  ]

  let result = content
  for (const pattern of patterns) {
    result = result.replace(pattern, `${functionName}('${key}')`)
  }

  return result
}

/**
 * Check if import already exists in script
 */
function hasI18nImport(scriptContent: string, pattern: string): boolean {
  // Simple check - look for the pattern in the script
  return scriptContent.includes(pattern)
}

/**
 * Add i18n import to script section
 */
function addI18nImport(
  scriptContent: string,
  importTemplate: string,
  isSetup: boolean,
): string {
  // Check if import already exists
  if (hasI18nImport(scriptContent, importTemplate)) {
    return scriptContent
  }

  const lines = scriptContent.split('\n')
  let insertIndex = 0

  // Find the best place to insert the import
  if (isSetup) {
    // For <script setup>, add after imports or at the beginning
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        insertIndex = i + 1
      }
    }
  }
  else {
    // For regular <script>, add inside the component definition
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('export default')) {
        insertIndex = i + 1
        break
      }
    }
  }

  // Insert the import
  lines.splice(insertIndex, 0, importTemplate)

  return lines.join('\n')
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Replace raw strings in a Vue file
 */
export function replaceStringsInVueFile(
  filePath: string,
  locations: RawStringLocation[],
  keyMap: Map<string, string>,
  i18nResult: I18nDetectionResult,
  createBackup: boolean = true,
): ReplaceResult {
  const content = fs.readFileSync(filePath, 'utf-8')
  const { descriptor } = parseVueSFC(content, { filename: filePath })

  let replacements = 0
  let importAdded = false
  let modifiedContent = content

  // Determine which function name to use
  const functionName = i18nResult.recommendedPattern?.functionName || 't'
  const importTemplate = i18nResult.recommendedPattern?.pattern || 'const { t } = useI18n()'

  // Group locations by context
  const templateLocations = locations.filter(l => l.context === 'template' || l.context === 'attribute')
  const scriptLocations = locations.filter(l => l.context === 'script')

  // Replace in template
  if (descriptor.template && templateLocations.length > 0) {
    let templateContent = descriptor.template.content

    for (const location of templateLocations) {
      const key = keyMap.get(location.text)
      if (key) {
        templateContent = replaceInTemplate(templateContent, location, key, functionName)
        replacements++
      }
    }

    // Reconstruct the file with modified template
    const templateStart = modifiedContent.indexOf(descriptor.template.content)
    if (templateStart !== -1) {
      modifiedContent
        = modifiedContent.substring(0, templateStart)
        + templateContent
        + modifiedContent.substring(templateStart + descriptor.template.content.length)
    }
  }

  // Replace in script and add import if needed
  const scriptDescriptor = descriptor.script || descriptor.scriptSetup
  if (scriptDescriptor && scriptLocations.length > 0) {
    let scriptContent = scriptDescriptor.content

    for (const location of scriptLocations) {
      const key = keyMap.get(location.text)
      if (key) {
        scriptContent = replaceInScript(scriptContent, location, key, functionName)
        replacements++
      }
    }

    // Add import if replacements were made
    if (replacements > 0 && !hasI18nImport(scriptContent, importTemplate)) {
      const isSetup = descriptor.scriptSetup !== null
      scriptContent = addI18nImport(scriptContent, importTemplate, isSetup)
      importAdded = true
    }

    // Reconstruct the file with modified script
    const scriptStart = modifiedContent.indexOf(scriptDescriptor.content)
    if (scriptStart !== -1) {
      modifiedContent
        = modifiedContent.substring(0, scriptStart)
        + scriptContent
        + modifiedContent.substring(scriptStart + scriptDescriptor.content.length)
    }
  }

  // Create backup if needed
  let backupCreated = false
  if (createBackup && replacements > 0) {
    const backupPath = `${filePath}.backup`
    fs.writeFileSync(backupPath, content, 'utf-8')
    backupCreated = true
  }

  // Write modified content
  if (replacements > 0) {
    fs.writeFileSync(filePath, modifiedContent, 'utf-8')
  }

  return {
    file: filePath,
    replacements,
    importAdded,
    backupCreated,
  }
}

/**
 * Replace raw strings in a plain TS/JS file
 */
export function replaceStringsInJsFile(
  filePath: string,
  locations: RawStringLocation[],
  keyMap: Map<string, string>,
  i18nResult: I18nDetectionResult,
  createBackup: boolean = true,
): ReplaceResult {
  let content = fs.readFileSync(filePath, 'utf-8')
  let replacements = 0
  let importAdded = false

  const functionName = i18nResult.recommendedPattern?.functionName || 't'
  const importTemplate = i18nResult.recommendedPattern?.pattern || 'import { useI18n } from "vue-i18n"\nconst { t } = useI18n()'

  for (const location of locations) {
    const key = keyMap.get(location.text)
    if (key) {
      content = replaceInScript(content, location, key, functionName)
      replacements++
    }
  }

  // Add import if replacements were made
  if (replacements > 0 && !hasI18nImport(content, importTemplate)) {
    // Add import at the top of the file
    content = `${importTemplate}\n\n${content}`
    importAdded = true
  }

  // Create backup if needed
  let backupCreated = false
  if (createBackup && replacements > 0) {
    const backupPath = `${filePath}.backup`
    fs.writeFileSync(backupPath, fs.readFileSync(filePath, 'utf-8'), 'utf-8')
    backupCreated = true
  }

  // Write modified content
  if (replacements > 0) {
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  return {
    file: filePath,
    replacements,
    importAdded,
    backupCreated,
  }
}

/**
 * Update translation JSON file with new keys
 */
export function updateTranslationFile(
  translationFilePath: string,
  keyMap: Map<string, string>,
  targetLanguage: string = 'en',
  createBackup: boolean = true,
): void {
  // Read existing translations
  let translations: Record<string, any> = {}

  if (fs.existsSync(translationFilePath)) {
    const content = fs.readFileSync(translationFilePath, 'utf-8')
    translations = JSON.parse(content)
  }

  // Create backup if needed
  if (createBackup && Object.keys(translations).length > 0) {
    const backupPath = `${translationFilePath}.backup`
    fs.writeFileSync(backupPath, JSON.stringify(translations, null, 2), 'utf-8')
  }

  // Add new keys
  for (const [text, key] of keyMap) {
    // Support nested keys (dot notation)
    const keyParts = key.split(/[._]/)

    let current = translations
    for (let i = 0; i < keyParts.length - 1; i++) {
      if (!current[keyParts[i]]) {
        current[keyParts[i]] = {}
      }
      current = current[keyParts[i]]
    }

    // Set the value (use the original text as the translation)
    const lastKey = keyParts[keyParts.length - 1]
    if (!current[lastKey]) {
      current[lastKey] = text
    }
  }

  // Write updated translations
  fs.writeFileSync(translationFilePath, JSON.stringify(translations, null, 2), 'utf-8')
}
