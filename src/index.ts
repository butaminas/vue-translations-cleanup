// Main entry point - re-export types for consumers
export type {
  ToolConfig,
  ExtractConfig,
  AIConfig,
  CleanupConfig,
  I18nCustomPattern,
  ConfigFileExport,
} from './config/types'

// Re-export the cleanup function for programmatic use
export { cleanupTranslations } from './translations-cleanup'
export type { CleanupOptions } from './translations-cleanup/types'
