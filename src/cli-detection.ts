import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { glob } from 'glob'

export interface DetectedConfig {
  srcPath?: string
  translationsPath?: string
  reason?: string
}

function pathFromIncludeRaw(rawExpr: string, viteDir: string): string | undefined {
  // Try to match a simple string literal: include: 'src/locales/**'
  const strMatch = rawExpr.match(/^[\s\S]*?(['"`])([^'"`]+)\1/)
  if (strMatch) {
    const p = strMatch[2]
    return path.isAbsolute(p) ? p : path.resolve(viteDir, p)
  }
  // Try to match path.resolve(__dirname, 'src', 'locales', '**', '*.json')
  const resolveMatch = rawExpr.match(/path\.resolve\(([^)]*)\)/i)
  if (resolveMatch) {
    const args = [...resolveMatch[1].matchAll(/(['"`])([^'"`]+)\1/g)].map(m => m[2])
    // If __dirname present, use viteDir as base implicitly; otherwise, resolve from viteDir as well
    const base = viteDir
    const resolved = path.resolve(base, ...args)
    return resolved
  }
  return undefined
}

function baseDirFromInclude(includePath: string): string {
  // If it contains glob characters, strip from the first wildcard backwards
  const indices = ['*', '?', '[']
    .map(ch => includePath.indexOf(ch))
    .filter(i => i !== -1)
  const wildcardIdx = indices.length ? Math.min(...indices) : -1
  if (wildcardIdx !== -1) {
    let before = includePath.slice(0, wildcardIdx)
    // Remove trailing slash if present
    before = before.replace(/\/$/, '')
    // If we removed a trailing slash and what's left is a directory path, return it
    // Otherwise, get the directory name
    if (before && !before.endsWith('.json') && !before.includes('.')) {
      return before
    }
    return path.dirname(before)
  }
  // If it ends with a file (e.g., .json), use its dirname
  if (/\.\w+$/.test(includePath))
    return path.dirname(includePath)
  return includePath
}

async function detectFromViteConfig(cwd: string): Promise<Partial<DetectedConfig>> {
  const viteFiles = [
    'vite.config.ts',
    'vite.config.mts',
    'vite.config.js',
    'vite.config.mjs',
    'vite.config.cjs',
  ]
  for (const vf of viteFiles) {
    const full = path.join(cwd, vf)
    if (!fs.existsSync(full))
      continue
    try {
      const content = fs.readFileSync(full, 'utf-8')
      const viteDir = path.dirname(full)
      // Heuristic: ensure plugin is referenced
      const hasI18nPlugin = /@intlify\/unplugin-vue-i18n|VueI18nPlugin/i.test(content)
      if (!hasI18nPlugin)
        continue

      // Find an include: ... expression
      const includePropMatch = content.match(/include\s*:\s*([^,}\n]+)/i)
      if (includePropMatch) {
        const raw = includePropMatch[1]
        const abs = pathFromIncludeRaw(raw, viteDir)
        if (abs) {
          const baseDir = baseDirFromInclude(abs)
          return { translationsPath: baseDir }
        }
      }
    }
    catch {
      // ignore and continue
    }
  }
  return {}
}

async function detectFromNuxtConfig(cwd: string): Promise<Partial<DetectedConfig>> {
  const nuxtFiles = [
    'nuxt.config.ts',
    'nuxt.config.mts',
    'nuxt.config.js',
    'nuxt.config.mjs',
  ]
  for (const nf of nuxtFiles) {
    const full = path.join(cwd, nf)
    if (!fs.existsSync(full))
      continue
    try {
      const content = fs.readFileSync(full, 'utf-8')
      // Check if @nuxtjs/i18n module is used
      const hasI18nModule = /@nuxtjs\/i18n/.test(content)
      if (!hasI18nModule)
        continue

      // Nuxt 4 typically uses /app/ for source, Nuxt 3 can use /src/ or root
      // Nuxt i18n typically uses /i18n/locales/ or /locales/
      const nuxtSrcCandidates = ['app', 'src']
      const nuxtTranslationsCandidates = ['i18n/locales', 'locales', 'i18n']

      let srcPath: string | undefined
      for (const c of nuxtSrcCandidates) {
        const p = path.join(cwd, c)
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
          srcPath = p
          break
        }
      }

      let translationsPath: string | undefined
      for (const c of nuxtTranslationsCandidates) {
        const p = path.join(cwd, c)
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
          const jsons = await glob('**/*.json', { cwd: p, nodir: true })
          if (jsons.length > 0) {
            translationsPath = p
            break
          }
        }
      }

      if (srcPath || translationsPath) {
        return { srcPath, translationsPath }
      }
    }
    catch {
      // ignore and continue
    }
  }
  return {}
}

async function detectCommonPaths(cwd: string): Promise<Partial<DetectedConfig>> {
  const srcCandidates = [
    'src',
    'app',
    'client',
  ]
  let srcPath: string | undefined
  for (const c of srcCandidates) {
    const p = path.join(cwd, c)
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      srcPath = p
      break
    }
  }

  const translationsCandidates = [
    'src/locales',
    'src/i18n',
    'src/translations',
    'i18n/locales',
    'locales',
    'i18n',
    'translations',
  ]
  let translationsPath: string | undefined
  for (const c of translationsCandidates) {
    const p = path.join(cwd, c)
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      const jsons = await glob('**/*.json', { cwd: p, nodir: true })
      if (jsons.length > 0) {
        translationsPath = p
        break
      }
    }
  }
  return { srcPath, translationsPath }
}

export async function detectConfig(cwd: string = process.cwd()): Promise<DetectedConfig> {
  const detected: DetectedConfig = {}

  // Try Nuxt config first
  const fromNuxt = await detectFromNuxtConfig(cwd)
  Object.assign(detected, fromNuxt)

  // Then try Vite config
  const fromVite = await detectFromViteConfig(cwd)
  if (!detected.srcPath && fromVite.srcPath)
    detected.srcPath = fromVite.srcPath
  if (!detected.translationsPath && fromVite.translationsPath)
    detected.translationsPath = fromVite.translationsPath

  // Finally fall back to common paths
  const fromCommon = await detectCommonPaths(cwd)
  if (!detected.srcPath && fromCommon.srcPath)
    detected.srcPath = fromCommon.srcPath
  if (!detected.translationsPath && fromCommon.translationsPath)
    detected.translationsPath = fromCommon.translationsPath

  if (!detected.srcPath && !detected.translationsPath) {
    detected.reason = 'Could not detect Nuxt/Vite i18n config or common directories.'
  }
  else if (!detected.srcPath) {
    detected.reason = 'Detected translations directory but could not detect source directory.'
  }
  else if (!detected.translationsPath) {
    detected.reason = 'Detected source directory but could not detect translations directory.'
  }
  return detected
}
