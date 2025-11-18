import fs from 'node:fs'
import { parse as parseVueSFC } from '@vue/compiler-sfc'
import { shouldUseGlobalT } from './i18nPatternDetector'
import type { I18nDetectionResult, RawStringLocation } from './types'

export interface ReplaceResult {
  file: string
  replacements: number
  importAdded: boolean
  backupCreated: boolean
}

/**
 * Replace a raw string with i18n function call in template
 * Uses $t() if globally available, otherwise uses t() (requires import)
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
    // Handle both root-level text and text between tags
    const escapedText = escapeRegex(text)

    // Try to match text between tags first: >text<
    const betweenTagsRegex = new RegExp(`(>)\\s*${escapedText}\\s*(<)`, 'g')
    let replaced = content.replace(betweenTagsRegex, `$1{{ ${functionName}('${key}') }}$2`)

    // If no replacement made, try root-level text (at start/end of template)
    if (replaced === content) {
      // Match text at root level (with whitespace before/after)
      const rootLevelRegex = new RegExp(`(^|\\n)(\\s*)${escapedText}(\\s*)($|\\n)`, 'gm')
      replaced = content.replace(rootLevelRegex, `$1$2{{ ${functionName}('${key}') }}$3$4`)
    }

    return replaced
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
 * Check if i18n function (t) is already available in script
 * Checks for:
 * - useI18n() destructuring: const { t } = useI18n()
 * - Custom imports with t
 * - injectContext() with t
 */
function hasI18nImport(scriptContent: string, functionName: string = 't'): boolean {
  // Check for various patterns where t is defined
  const patterns = [
    // const { t } = useI18n()
    new RegExp(`const\\s*\\{[^}]*\\b${functionName}\\b[^}]*\\}\\s*=\\s*useI18n\\(\\)`),
    // const { i18n: { t } } = injectContext()
    new RegExp(`\\{[^}]*\\b${functionName}\\b[^}]*\\}[^}]*\\}\\s*=\\s*injectContext\\(\\)`),
    // import { t } from
    new RegExp(`import\\s*\\{[^}]*\\b${functionName}\\b[^}]*\\}\\s*from`),
    // function t( or const t =
    new RegExp(`(function|const)\\s+${functionName}\\s*[=(]`),
  ]

  return patterns.some(pattern => pattern.test(scriptContent))
}

/**
 * Add i18n import to script section
 */
function addI18nImport(
  scriptContent: string,
  usagePattern: string,
  importStatement: string | undefined,
  isSetup: boolean,
): string {
  // Check if usage already exists
  const functionName = usagePattern.match(/(\w+)\s*=/)?.[1] || 't'
  if (hasI18nImport(scriptContent, functionName)) {
    return scriptContent
  }

  const lines = scriptContent.split('\n')
  let importInsertIndex = 0
  let usageInsertIndex = 0

  // Find the best place to insert the import and usage
  if (isSetup) {
    // For <script setup>, add import after other imports or at the beginning
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        importInsertIndex = i + 1
      }
    }
    // Usage goes after imports (with a blank line if there are imports)
    usageInsertIndex = importInsertIndex
    if (importInsertIndex > 0) {
      usageInsertIndex++ // Add blank line after imports
    }
  }
  else {
    // For regular <script>, add inside the component definition
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('export default')) {
        importInsertIndex = i + 1
        usageInsertIndex = i + 1
        break
      }
    }
  }

  // Insert import statement first (if provided)
  if (importStatement) {
    lines.splice(importInsertIndex, 0, importStatement)
    // Adjust usage insert index since we added a line
    usageInsertIndex++
  }

  // Add blank line before usage if we added an import
  if (importStatement && isSetup && importInsertIndex > 0) {
    lines.splice(usageInsertIndex, 0, '')
    usageInsertIndex++
  }

  // Insert the usage pattern
  lines.splice(usageInsertIndex, 0, usagePattern)

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
  const importStatement = i18nResult.recommendedPattern?.importStatement

  // Check if $t is globally available in templates
  const useGlobalT = shouldUseGlobalT(i18nResult)
  const templateFunctionName = useGlobalT ? '$t' : functionName

  // Group locations by context
  const templateLocations = locations.filter(l => l.context === 'template' || l.context === 'attribute')
  const scriptLocations = locations.filter(l => l.context === 'script')

  // Track if we need to add import for template usage
  let templateReplacements = 0

  // Replace in template
  if (descriptor.template && templateLocations.length > 0) {
    let templateContent = descriptor.template.content

    for (const location of templateLocations) {
      const key = keyMap.get(location.text)
      if (key) {
        templateContent = replaceInTemplate(templateContent, location, key, templateFunctionName)
        templateReplacements++
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
  if (scriptDescriptor) {
    let scriptContent = scriptDescriptor.content
    let scriptReplacements = 0

    // Replace strings in script
    for (const location of scriptLocations) {
      const key = keyMap.get(location.text)
      if (key) {
        scriptContent = replaceInScript(scriptContent, location, key, functionName)
        scriptReplacements++
      }
    }

    // Add import if:
    // 1. We made script replacements, OR
    // 2. We made template replacements using non-global t() (needs import for template)
    const needsImport = (scriptReplacements > 0 || (templateReplacements > 0 && !useGlobalT))
      && !hasI18nImport(scriptContent, functionName)

    if (needsImport) {
      const isSetup = descriptor.scriptSetup !== null
      scriptContent = addI18nImport(scriptContent, importTemplate, importStatement, isSetup)
      importAdded = true
    }

    // Only update modifiedContent if we actually changed something
    if (scriptReplacements > 0 || importAdded) {
      // Reconstruct the file with modified script
      const scriptStart = modifiedContent.indexOf(scriptDescriptor.content)
      if (scriptStart !== -1) {
        modifiedContent
          = modifiedContent.substring(0, scriptStart)
          + scriptContent
          + modifiedContent.substring(scriptStart + scriptDescriptor.content.length)
      }
    }

    // Add script replacements to total count
    replacements += scriptReplacements
  }
  // If no script section exists but we need import for template, we need to add a script section
  else if (templateReplacements > 0 && !useGlobalT) {
    // Add a new <script setup> section with the import and usage
    const scriptLines = ['<script setup>']

    // Add import statement first (if available)
    if (importStatement) {
      scriptLines.push(importStatement)
      scriptLines.push('') // Blank line after import
    }

    // Add usage pattern
    scriptLines.push(importTemplate)
    scriptLines.push('</script>')

    const scriptSection = `\n${scriptLines.join('\n')}\n`

    // Find the end of template section
    if (descriptor.template) {
      const templateEnd = modifiedContent.indexOf('</template>') + '</template>'.length
      modifiedContent = modifiedContent.substring(0, templateEnd)
        + scriptSection
        + modifiedContent.substring(templateEnd)
      importAdded = true
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
  const importTemplate = i18nResult.recommendedPattern?.pattern || 'const { t } = useI18n()'
  const importStatement = i18nResult.recommendedPattern?.importStatement

  for (const location of locations) {
    const key = keyMap.get(location.text)
    if (key) {
      content = replaceInScript(content, location, key, functionName)
      replacements++
    }
  }

  // Add import if replacements were made and t is not already available
  if (replacements > 0 && !hasI18nImport(content, functionName)) {
    // Build the import section
    const importLines = []

    // Add import statement if available
    if (importStatement) {
      importLines.push(importStatement)
    }

    // Add usage pattern
    importLines.push(importTemplate)

    // Add import at the top of the file
    content = `${importLines.join('\n')}\n\n${content}`
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
    // Support nested keys (dot notation only - dots indicate hierarchy)
    // Underscores, camelCase, and kebab-case are part of the key name itself
    const keyParts = key.split('.')

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
