/**
 * `oisin-dev update`
 *
 * Re-syncs generated files (hook scripts, .claude/docs/ fragments, settings)
 * from the existing .dev.config.json without running prompts and without
 * touching user-customised files (lefthook.yml, lint configs, scaffolded code).
 */

import * as p from '@clack/prompts'
import { readConfig } from './config.js'
import { installAll } from './install.js'

export async function runUpdate(): Promise<void> {
  p.intro('@oisincoveney/dev update')

  const cwd = process.cwd()
  const config = readConfig(cwd)

  if (!config) {
    p.log.error('No .dev.config.json found. Run `init` first.')
    process.exit(1)
  }

  p.log.info(`Re-syncing ${config.variant} project from .dev.config.json`)

  const spinner = p.spinner()
  spinner.start('Updating hooks, docs, and settings')
  await installAll(cwd, config, {} as never, {
    skipSideEffects: true,
    skipScaffolding: true,
    isUpdate: true,
  })
  spinner.stop('Done')

  p.outro('Commit the updated files.')
}
