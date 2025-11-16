export interface I18nUsagePattern {
  /**
   * The pattern that was detected
   */
  pattern: string

  /**
   * The function name used for translation (e.g., 't', 'translate', '$t')
   */
  functionName: string

  /**
   * Example import/usage from the codebase
   */
  example: string

  /**
   * File where this pattern was found
   */
  file: string

  /**
   * Number of occurrences of this pattern
   */
  count: number

  /**
   * Type of pattern
   */
  type: 'compositionAPI' | 'optionsAPI' | 'global' | 'custom'
}

export interface I18nDetectionResult {
  /**
   * All detected patterns
   */
  patterns: I18nUsagePattern[]

  /**
   * The recommended pattern to use (most common)
   */
  recommendedPattern: I18nUsagePattern | null

  /**
   * Function names found (t, $t, translate, etc.)
   */
  functionNames: Set<string>

  /**
   * Total files scanned
   */
  filesScanned: number

  /**
   * Files with i18n usage
   */
  filesWithI18n: number
}

export interface RawStringLocation {
  /**
   * The detected raw string
   */
  text: string

  /**
   * File path
   */
  file: string

  /**
   * Line number
   */
  line: number

  /**
   * Column number
   */
  column: number

  /**
   * Context where the string was found
   */
  context: 'template' | 'script' | 'attribute'

  /**
   * Attribute name (if context is 'attribute')
   */
  attributeName?: string

  /**
   * Nearby element (e.g., 'button', 'input')
   */
  nearbyElement?: string

  /**
   * Confidence level
   */
  confidence: 'high' | 'medium' | 'low'

  /**
   * Reason for detection or why it might not be translatable
   */
  reason?: string
}

export interface ExtractResult {
  /**
   * Raw strings detected
   */
  rawStrings: RawStringLocation[]

  /**
   * Generated translation keys
   */
  generatedKeys: Map<string, string> // text -> key

  /**
   * Files modified
   */
  filesModified: string[]

  /**
   * Total strings extracted
   */
  totalExtracted: number

  /**
   * Duplicate strings detected
   */
  duplicates: Array<{ text: string, key: string, locations: RawStringLocation[] }>
}
