#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { Command } from 'commander'
import { cleanupTranslations } from './translations-cleanup'

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
  .requiredOption('-t, --translation-file <path>', 'Path to translation file')
  .requiredOption('-s, --src-path <path>', 'Path to source files')
  .option('-n, --dry-run', 'Show what would be removed without making changes')
  .option('--no-backup', 'Skip creating backup file')
  .option('-v, --verbose', 'Show detailed output')
  .option('-p, --pattern <glob>', 'File pattern to scan (default: "**/*.{vue,js,ts}")')

program.parse()

const options = program.opts()

// Convert relative paths to absolute paths
const translationFile = path.resolve(process.cwd(), options.translationFile)
const srcPath = path.resolve(process.cwd(), options.srcPath)

cleanupTranslations({
  translationFile,
  srcPath,
  backup: options.backup,
  dryRun: options.dryRun,
  verbose: options.verbose,
})
  .then((result) => {
    if (options.verbose) {
      console.log('\nResults:')
      console.log('Total translation keys:', result.totalKeys)
      console.log('Used keys:', result.usedKeys)
      console.log('Unused keys:', result.unusedKeys)
    }
    else {
      console.log(`\nFound ${result.unusedKeys} unused translation keys out of ${result.totalKeys} total keys`)
    }

    if (result.unusedKeys > 0) {
      if (options.verbose) {
        console.log('\nUnused translations:')
        console.log(result.unusedTranslations.join('\n'))
      }

      if (options.dryRun) {
        console.log('\nDry run - no changes made')
      }
      else if (result.cleaned) {
        console.log(`\nTranslations file has been updated: ${translationFile}`)
        if (options.backup) {
          console.log(`Backup created at: ${translationFile}.backup`)
        }
      }
    }
    else {
      console.log('\nNo unused translations found ✓')
      if (result.cleaned && !options.dryRun) {
        console.log(`Pruned empty groups. Translations file has been updated: ${translationFile}`)
        if (options.backup) {
          console.log(`Backup created at: ${translationFile}.backup`)
        }
      }
    }
  })
  .catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
