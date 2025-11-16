import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { ConfigFileExport, ToolConfig } from './types'

const CONFIG_FILE_NAMES = [
  'vue-translations-cleanup.config.ts',
  'vue-translations-cleanup.config.mjs',
  '.vue-translations-cleanup.config.json',
]

/**
 * Find config file in the given directory
 */
export function findConfigFile(cwd: string): string | null {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = path.join(cwd, fileName)
    if (fs.existsSync(filePath)) {
      return filePath
    }
  }
  return null
}

/**
 * Load config from a TypeScript or JavaScript file
 * Uses dynamic import to support both .ts (via ts-node/tsx) and .mjs
 */
async function loadTsOrMjsConfig(filePath: string): Promise<ToolConfig> {
  try {
    // Convert to file:// URL for dynamic import
    const fileUrl = pathToFileURL(filePath).href

    // Dynamic import
    const imported = await import(fileUrl) as ConfigFileExport

    // Handle both default export and named export
    const config = 'default' in imported ? imported.default : imported

    return config as ToolConfig
  }
  catch (error) {
    throw new Error(
      `Failed to load config from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Load config from a JSON file
 */
function loadJsonConfig(filePath: string): ToolConfig {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as ToolConfig
  }
  catch (error) {
    throw new Error(
      `Failed to load config from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Load configuration from file
 */
export async function loadConfigFile(filePath: string): Promise<ToolConfig> {
  const ext = path.extname(filePath)

  if (ext === '.json') {
    return loadJsonConfig(filePath)
  }

  if (ext === '.ts' || ext === '.mts' || ext === '.mjs' || ext === '.js') {
    return await loadTsOrMjsConfig(filePath)
  }

  throw new Error(`Unsupported config file type: ${ext}. Supported: .ts, .mjs, .json`)
}

/**
 * Load configuration from the project
 * Searches for config file in the given directory
 */
export async function loadConfig(cwd: string, configPath?: string): Promise<ToolConfig | null> {
  // If explicit config path provided, use it
  if (configPath) {
    const resolvedPath = path.isAbsolute(configPath)
      ? configPath
      : path.resolve(cwd, configPath)

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Config file not found: ${resolvedPath}`)
    }

    return await loadConfigFile(resolvedPath)
  }

  // Otherwise, search for config file
  const foundPath = findConfigFile(cwd)
  if (!foundPath) {
    return null
  }

  return await loadConfigFile(foundPath)
}
