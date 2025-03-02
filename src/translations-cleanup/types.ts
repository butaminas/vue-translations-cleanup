export interface TranslationObject {
  [key: string]: string | TranslationObject
}

export interface CleanupOptions {
  translationFile: string
  srcPath: string
  backup?: boolean
  dryRun?: boolean
  verbose?: boolean
}
