#!/usr/bin/env node
import path from 'node:path'
import process from 'node:process'
import { Command } from 'commander'
import { version } from '../package.json'
import { cleanupTranslations } from './translations-cleanup'

const program = new Command()

program
  .name('vue-translations-cleanup')
  .description('Clean up unused translation keys in your i18n files')
  .version(version)
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
    }
  })
  .catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
