#!/usr/bin/env node

import { Command } from 'commander'
import { cleanupTranslations } from './translations-cleanup'

const program = new Command()

program
  .name('vue-translations-cleanup')
  .description('Clean up unused translation keys in your i18n files')
  .version('1.0.0')
  .requiredOption('-t, --translation-file <path>', 'Path to translation file')
  .requiredOption('-s, --src-path <path>', 'Path to source files')
  .option('-n, --dry-run', 'Show what would be removed without making changes')
  .option('--no-backup', 'Skip creating backup file')
  .option('-v, --verbose', 'Show detailed output')

program.parse()

const options = program.opts()

cleanupTranslations({
  translationFile: options.translationFile,
  srcPath: options.srcPath,
  backup: options.backup,
  dryRun: options.dryRun,
  verbose: options.verbose,
})
  .then((result) => {
    console.log('\nResults:')
    console.log('Total translation keys:', result.totalKeys)
    console.log('Used keys:', result.usedKeys)
    console.log('Unused keys:', result.unusedKeys)

    if (result.unusedKeys > 0) {
      console.log('\nUnused translations:')
      console.log(result.unusedTranslations)

      if (options.dryRun) {
        console.log('\nDry run - no changes made')
      }
      else if (result.cleaned) {
        console.log('\nTranslations file has been updated')
      }
    }
    else {
      console.log('\nNo unused translations found')
    }
  })
  .catch((error) => {
    console.error('Error:', error.message)
    process.exit(1)
  })
