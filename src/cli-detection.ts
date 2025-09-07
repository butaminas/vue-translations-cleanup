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
    const before = includePath.slice(0, wildcardIdx)
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
  const fromVite = await detectFromViteConfig(cwd)
  Object.assign(detected, fromVite)

  const fromCommon = await detectCommonPaths(cwd)
  if (!detected.srcPath && fromCommon.srcPath)
    detected.srcPath = fromCommon.srcPath
  if (!detected.translationsPath && fromCommon.translationsPath)
    detected.translationsPath = fromCommon.translationsPath

  if (!detected.srcPath && !detected.translationsPath) {
    detected.reason = 'Could not detect Vite i18n include or common directories.'
  }
  else if (!detected.srcPath) {
    detected.reason = 'Detected translations directory but could not detect source directory.'
  }
  else if (!detected.translationsPath) {
    detected.reason = 'Detected source directory but could not detect translations directory.'
  }
  return detected
}
