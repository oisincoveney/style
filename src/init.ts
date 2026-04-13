/**
 * `oisin-dev init`
 *
 * If the current directory is a code project (has package.json / Cargo.toml / go.mod),
 * configure it in place. Otherwise, ask for a project name and scaffold a new subdirectory.
 */

import { basename, join, resolve } from 'node:path'
import * as p from '@clack/prompts'
import { type DevConfig, configPath, writeConfig } from './config.js'
import { detectProject } from './detect.js'
import { installAll } from './install.js'
import { type Answers, runPrompts } from './prompts.js'
import { scaffoldNewProject } from './scaffold.js'

export async function runInit(): Promise<void> {
  p.intro('@oisincoveney/dev')

  const cwd = process.cwd()
  const detected = detectProject(cwd)
  const isProjectRoot = detected.language !== null

  if (isProjectRoot) {
    // Current dir is a project — configure in place.
    p.log.info(`Detected ${detected.language} project in ${basename(cwd)}. Configuring in place.`)
    const answers = await runPrompts({
      ...detected,
      scaffoldNew: false,
      preferProjectName: null,
    })
    await writeConfigAndInstall(cwd, answers)
    p.outro('Done.')
    return
  }

  // Not a project root — scaffold a new subdirectory.
  p.log.info(`${cwd} is not a project root. Scaffolding a new project here.`)
  const answers = await runPrompts({
    ...detected,
    scaffoldNew: true,
    preferProjectName: null,
  })
  const working = await scaffoldNewProject(cwd, answers)
  await writeConfigAndInstall(working, answers)
  p.outro(`Done. cd ${resolve(working)} to get started.`)
}

async function writeConfigAndInstall(dir: string, answers: Answers): Promise<void> {
  const config: DevConfig = {
    language: answers.language,
    variant: answers.variant,
    framework: answers.framework,
    packageManager: answers.packageManager,
    commands: answers.commands,
    skills: answers.skills,
    tools: answers.tools,
    workflow: answers.workflow,
    contractDriven: answers.contractDriven,
    targets: answers.targets,
    models: answers.models,
  }

  writeConfig(dir, config)
  p.log.success(`Wrote ${configPath(dir)}`)

  const spinner = p.spinner()
  spinner.start('Installing hooks, configs, skills, and instruction files')
  await installAll(dir, config, answers)
  spinner.stop('Installed')
}
