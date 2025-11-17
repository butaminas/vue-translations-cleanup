import fs from 'node:fs'
import { glob } from 'glob'
import type { I18nCustomPattern } from '../config/types'
import type { I18nDetectionResult, I18nUsagePattern } from './types'

/**
 * Built-in patterns to detect common i18n usage
 */
const BUILT_IN_PATTERNS = [
  // Composition API - useI18n()
  {
    regex: /const\s*{\s*t\s*}\s*=\s*useI18n\(\)/g,
    functionName: 't',
    type: 'compositionAPI' as const,
    template: 'const { t } = useI18n()',
  },
  {
    regex: /const\s*{\s*t\s*:\s*(\w+)\s*}\s*=\s*useI18n\(\)/g,
    functionName: '$1', // Capture group
    type: 'compositionAPI' as const,
    template: 'const { t: $1 } = useI18n()',
  },
  // Destructured from useI18n with other properties
  {
    regex: /const\s*{\s*(?:\w+\s*,\s*)*t(?:\s*,\s*\w+)*\s*}\s*=\s*useI18n\(\)/g,
    functionName: 't',
    type: 'compositionAPI' as const,
    template: 'const { ..., t, ... } = useI18n()',
  },
  // Options API - this.$t
  {
    regex: /this\.\$t\s*\(/g,
    functionName: '$t',
    type: 'optionsAPI' as const,
    template: 'this.$t(...)',
  },
  // Global $t in templates
  {
    regex: /\$t\s*\(\s*['"]/g,
    functionName: '$t',
    type: 'global' as const,
    template: '$t(...)',
  },
  // Custom translate function
  {
    regex: /const\s*{\s*translate\s*}\s*=\s*use\w+\(\)/g,
    functionName: 'translate',
    type: 'compositionAPI' as const,
    template: 'const { translate } = use...()',
  },
  // i18n.t direct access
  {
    regex: /i18n\.t\s*\(/g,
    functionName: 't',
    type: 'custom' as const,
    template: 'i18n.t(...)',
  },
]

/**
 * Detect i18n usage patterns in a file
 */
function detectPatternsInFile(filePath: string, customPatterns: I18nCustomPattern[]): Map<string, I18nUsagePattern> {
  const content = fs.readFileSync(filePath, 'utf-8')
  const patterns = new Map<string, I18nUsagePattern>()

  // Check built-in patterns
  for (const builtIn of BUILT_IN_PATTERNS) {
    const matches = content.matchAll(builtIn.regex)

    for (const match of matches) {
      const patternKey = builtIn.template
      const functionName = match[1] || builtIn.functionName

      if (patterns.has(patternKey)) {
        patterns.get(patternKey)!.count++
      }
      else {
        patterns.set(patternKey, {
          pattern: builtIn.template,
          functionName,
          example: match[0],
          file: filePath,
          count: 1,
          type: builtIn.type,
        })
      }
    }
  }

  // Check custom patterns
  for (const custom of customPatterns) {
    const regex = typeof custom.pattern === 'string'
      ? new RegExp(custom.pattern, 'g')
      : new RegExp(custom.pattern.source, 'g')

    const matches = content.matchAll(regex)

    for (const match of matches) {
      const patternKey = custom.importTemplate

      if (patterns.has(patternKey)) {
        patterns.get(patternKey)!.count++
      }
      else {
        patterns.set(patternKey, {
          pattern: custom.importTemplate,
          functionName: custom.functionName,
          example: match[0],
          file: filePath,
          count: 1,
          type: 'custom',
        })
      }
    }
  }

  return patterns
}

/**
 * Detect i18n usage patterns across the project
 */
export async function detectI18nPatterns(
  srcPath: string,
  filePattern: string,
  customPatterns: I18nCustomPattern[] = [],
): Promise<I18nDetectionResult> {
  // Find all source files
  const files = await glob(filePattern, {
    cwd: srcPath,
    absolute: true,
    nodir: true,
  })

  const allPatterns = new Map<string, I18nUsagePattern>()
  const functionNames = new Set<string>()
  let filesWithI18n = 0

  // Scan each file
  for (const file of files) {
    try {
      const filePatterns = detectPatternsInFile(file, customPatterns)

      if (filePatterns.size > 0) {
        filesWithI18n++
      }

      // Merge patterns
      for (const [key, pattern] of filePatterns) {
        functionNames.add(pattern.functionName)

        if (allPatterns.has(key)) {
          // Increment count
          allPatterns.get(key)!.count += pattern.count
        }
        else {
          allPatterns.set(key, { ...pattern })
        }
      }
    }
    catch (error) {
      // Skip files that can't be read
      continue
    }
  }

  // Convert to array and sort by count
  const patterns = Array.from(allPatterns.values()).sort((a, b) => b.count - a.count)

  // Determine recommended pattern (most common)
  const recommendedPattern = patterns.length > 0 ? patterns[0] : null

  return {
    patterns,
    recommendedPattern,
    functionNames,
    filesScanned: files.length,
    filesWithI18n,
  }
}

/**
 * Get import template for a detected pattern
 */
export function getImportTemplate(pattern: I18nUsagePattern | null): string {
  if (!pattern) {
    // Default fallback
    return 'const { t } = useI18n()'
  }

  return pattern.pattern
}

/**
 * Determine if we should use $t in templates or t() with import
 */
export function shouldUseGlobalT(detectionResult: I18nDetectionResult): boolean {
  // If $t is the most common or only pattern, use it
  if (!detectionResult.recommendedPattern) {
    return false
  }

  return detectionResult.recommendedPattern.functionName === '$t'
    && detectionResult.recommendedPattern.type === 'global'
}
