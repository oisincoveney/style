/**
 * `oisin-dev set-commands`
 *
 * Fill in or update dev/build/test/typecheck/lint/format commands in an
 * existing project. Re-runs only the command prompts, then regenerates
 * hooks, docs, and settings without touching other config.
 */

import * as p from '@clack/prompts'
import { configPath, readConfig, writeConfig } from './config.js'
import { detectProject } from './detect.js'
import { installAll } from './install.js'
import { askCommand, defaultCommandsFor } from './prompts.js'
import type { Answers } from './prompts.js'

export async function runSetCommands(): Promise<void> {
  p.intro('@oisincoveney/dev set-commands')

  const cwd = process.cwd()
  const config = readConfig(cwd)
  if (!config) {
    p.log.error('No .dev.config.json found. Run `oisin-dev init` first.')
    process.exit(1)
  }

  const detected = detectProject(cwd)
  const defaults = defaultCommandsFor(config.variant, config.packageManager, detected)

  const existing = config.commands
  const commands: typeof config.commands = {
    dev: await askUpdatable('Dev command?', existing.dev, defaults.dev),
    build: await askUpdatable('Build command?', existing.build, defaults.build),
    test: await askUpdatable('Test command?', existing.test, defaults.test),
    typecheck: await askUpdatable('Typecheck command?', existing.typecheck, defaults.typecheck),
    lint: await askUpdatable('Lint command?', existing.lint, defaults.lint),
    format: await askUpdatable('Format command?', existing.format, defaults.format),
  }
  if (existing.e2e !== undefined) {
    commands.e2e = existing.e2e
  }

  const updated = { ...config, commands }
  writeConfig(cwd, updated)
  p.log.success(`Wrote ${configPath(cwd)}`)

  const spinner = p.spinner()
  spinner.start('Regenerating hooks, docs, and settings')
  await installAll(cwd, updated, {} as never as Answers, {
    skipSideEffects: true,
    isUpdate: true,
  })
  spinner.stop('Done')

  p.outro('Commit the updated files.')
}

async function askUpdatable(
  message: string,
  existing: string | null | undefined,
  fallback: string | null,
): Promise<string | null> {
  const seed = existing ?? fallback
  if (seed === null || seed.length === 0) {
    const value = await p.text({
      message: `${message} (leave blank to skip)`,
      placeholder: '',
    })
    if (p.isCancel(value)) {
      p.cancel('Aborted.')
      process.exit(0)
    }
    return value.length === 0 ? null : value
  }
  return askCommand(message, seed)
}
