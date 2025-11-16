#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Command } from 'commander'
import { glob } from 'glob'
import { detectConfig } from './cli-detection'
import { c, separator, symbols } from './cli-style'
import { cleanupTranslations } from './translations-cleanup'
import { loadConfig } from './config/loader'
import { validateConfig } from './config/validator'
import { runExtraction } from './extract-strings/orchestrator'

function readPkgVersion(): string {
  try {
    const pkgPath = path.resolve(__dirname, '../package.json')
    const pkgRaw = fs.readFileSync(pkgPath, 'utf-8')
    const pkg = JSON.parse(pkgRaw) as { version?: string }
    return pkg.version || process.env.npm_package_version || '0.0.0'
  }
  catch {
    return process.env.npm_package_version || '0.0.0'
  }
}

const program = new Command()

program
  .name('vue-translations-cleanup')
  .description('Clean up unused translation keys in your i18n files')
  .version(readPkgVersion())
  .option('-t, --translation-file <path>', 'Path to translation file or directory (if omitted, try auto-detect)')
  .option('-s, --src-path <path>', 'Path to source files (if omitted, try auto-detect)')
  .option('-c, --config <path>', 'Path to config file (vue-translations-cleanup.config.{ts,mjs,json})')
  .option('--extract', 'Extract raw strings and create i18n keys (instead of cleanup)')
  .option('-n, --dry-run', 'Show what would be removed/changed without making changes')
  .option('--no-backup', 'Skip creating backup file')
  .option('-v, --verbose', 'Show detailed output')
  .option('-p, --pattern <glob>', 'File pattern to scan (default: "**/*.{vue,js,ts}")')

program.parse()

const options = program.opts()

async function run() {
  // Load config file if provided
  let config = null
  if (options.config) {
    const configPath = path.resolve(process.cwd(), options.config)
    config = await loadConfig(path.dirname(configPath), configPath)

    if (!config) {
      console.error(`Config file not found: ${options.config}`)
      process.exit(1)
    }

    // Validate and merge with defaults
    config = validateConfig(config)

    if (options.verbose) {
      console.log(c.info(`${symbols.info} Loaded config from: ${options.config}`))
    }
  }
  else {
    // Try to auto-load config
    config = await loadConfig(process.cwd())

    if (config) {
      config = validateConfig(config)

      if (options.verbose) {
        console.log(c.info(`${symbols.info} Auto-loaded config file`))
      }
    }
  }

  let translationTarget: string | undefined = options.translationFile || config?.translationFile
  let srcPath: string | undefined = options.srcPath || config?.srcPath

  // Auto-detect when missing
  if (!translationTarget || !srcPath) {
    const detected = await detectConfig(process.cwd())
    if (!translationTarget && detected.translationsPath)
      translationTarget = detected.translationsPath
    if (!srcPath && detected.srcPath)
      srcPath = detected.srcPath

    if (options.verbose) {
      console.log(separator('Auto-detection'))
      console.log(c.strong('[vue-translations-cleanup] Auto-detection:'))
      console.log(c.dim(`${symbols.info} srcPath:`), srcPath || c.warn('not detected'))
      console.log(c.dim(`${symbols.info} translationsPath:`), translationTarget || c.warn('not detected'))
      if (detected.reason)
        console.log(c.dim(`${symbols.warn} note:`), detected.reason)
    }
  }

  if (!translationTarget || !srcPath) {
    console.error('Could not determine required paths. Please specify:')
    console.error('  -t, --translation-file <path-to-file-or-directory>')
    console.error('  -s, --src-path <path-to-source>')
    console.error('  or provide a config file with --config')
    process.exit(1)
  }

  // === EXTRACT MODE ===
  if (options.extract) {
    const absTranslations = path.resolve(process.cwd(), translationTarget)
    const absSrc = path.resolve(process.cwd(), srcPath)

    // For extract mode, translation file must be a file, not a directory
    const isDir = fs.existsSync(absTranslations) && fs.statSync(absTranslations).isDirectory()

    if (isDir) {
      console.error('Error: --extract mode requires a specific translation file, not a directory')
      console.error('Please specify a single JSON file with -t, --translation-file')
      process.exit(1)
    }

    // Ensure config is loaded (use defaults if not)
    if (!config) {
      config = validateConfig({})
    }

    console.log(c.strong('\n=== String Extraction Mode ===\n'))

    try {
      await runExtraction({
        translationFile: absTranslations,
        srcPath: absSrc,
        config,
        dryRun: options.dryRun,
        verbose: options.verbose,
      })
    }
    catch (error) {
      console.error(c.error(`\n${symbols.error} Extraction failed:`), error)
      process.exit(1)
    }

    return
  }

  // === CLEANUP MODE (default) ===

  // Resolve to absolute paths
  const absTranslations = path.resolve(process.cwd(), translationTarget)
  const absSrc = path.resolve(process.cwd(), srcPath)
  // Try to detect if translations target is a directory; if stat fails, treat as file
  let isDir = false
  try {
    isDir = fs.statSync(absTranslations).isDirectory()
  }
  catch {
    isDir = false
  }

  if (!isDir) {
    const translationFile = absTranslations
    const result = await cleanupTranslations({
      translationFile,
      srcPath: absSrc,
      backup: options.backup,
      dryRun: options.dryRun,
      verbose: options.verbose,
    })

    if (options.verbose) {
      console.log('\nResults:')
      console.log('Total translation keys:', result.totalKeys)
      console.log('Used keys:', result.usedKeys)
      console.log('Unused keys:', result.unusedKeys)
    }
    else {
      console.log(c.info(`\n${symbols.info} Found ${result.unusedKeys} unused translation keys out of ${result.totalKeys} total keys`))
    }

    if (result.unusedKeys > 0) {
      if (options.verbose) {
        console.log('\nUnused translations:')
        console.log(result.unusedTranslations.join('\n'))
      }

      if (options.dryRun) {
        console.log(c.dim('\nDry run - no changes made'))
      }
      else if (result.cleaned) {
        console.log(c.success(`\n${symbols.success} Translations file has been updated: ${translationFile}`))
        if (options.backup) {
          console.log(c.dim(`Backup created at: ${translationFile}.backup`))
        }
      }
    }
    else {
      console.log(c.success(`\n${symbols.success} No unused translations found`))
      if (result.cleaned && !options.dryRun) {
        console.log(c.dim(`Pruned empty groups. Translations file has been updated: ${translationFile}`))
        if (options.backup) {
          console.log(c.dim(`Backup created at: ${translationFile}.backup`))
        }
      }
    }

    return
  }

  // Directory mode
  const jsons = await glob('**/*.json', { cwd: absTranslations, nodir: true })
  const files = jsons.map(rel => path.join(absTranslations, rel))
  if (files.length === 0) {
    console.error(`No JSON files found in directory: ${absTranslations}`)
    process.exit(1)
  }
  if (options.verbose) {
    console.log(separator(`Found ${files.length} translation files`))
    console.log(c.dim(absTranslations))
  }

  let totalUnused = 0
  let anyCleaned = false

  for (const file of files) {
    const result = await cleanupTranslations({
      translationFile: file,
      srcPath: absSrc,
      backup: options.backup,
      dryRun: options.dryRun,
      verbose: options.verbose,
    })

    totalUnused += result.unusedKeys
    anyCleaned = anyCleaned || result.cleaned

    if (options.verbose) {
      console.log(`\n${c.info(`[${path.relative(process.cwd(), file)}] -> unused: ${result.unusedKeys}/${result.totalKeys}`)}`)
      if (result.unusedKeys > 0) {
        console.log(c.strong('Unused translations:'))
        console.log(result.unusedTranslations.join('\n'))
      }
      if (result.cleaned && !options.dryRun) {
        console.log(c.success(`Updated file (backup ${options.backup ? 'created' : 'skipped'})`))
      }
    }
  }

  if (!options.verbose) {
    console.log(c.info(`\n${symbols.info} Found ${totalUnused} unused translation keys across ${files.length} file(s)`))
  }

  if (totalUnused === 0) {
    console.log(c.success(`\n${symbols.success} No unused translations found`))
    if (anyCleaned && !options.dryRun)
      console.log(c.dim('Pruned empty groups. Some translation files were updated.'))
  }
}

run().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
