/**
 * One-shot verification: actually run installAll without skipSideEffects against
 * temp target dirs (TS and Rust) so installGroundedHooks runs for real.
 *
 * Asserts that:
 *   1. installAll completes without throwing
 *   2. The generated .claude/settings.json does NOT reference verify-grounding.sh
 *   3. `grounded status` reports the 11 hooks active after the run
 *
 * Cleans up the temp dirs.
 */

import { execSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { installAll } from '../src/install.ts'
import type { DevConfig } from '../src/config.ts'
import type { Answers } from '../src/prompts.ts'

const ANSWERS: Answers = {
  language: 'typescript',
  packageManager: 'bun',
  targets: ['claude'],
  workflow: 'none',
  tools: [],
  skills: [],
  mcpServers: [],
  models: { default: 'opus', planning: 'opus', execution: 'sonnet' },
} as unknown as Answers

function makeConfig(language: 'typescript' | 'rust'): DevConfig {
  return {
    language,
    variant: language === 'typescript' ? 'ts-backend' : 'rust',
    framework: null,
    packageManager: language === 'typescript' ? 'bun' : 'cargo',
    targets: ['claude'],
    workflow: 'none',
    tools: [],
    skills: [],
    contractDriven: false,
    commands: {
      dev: 'echo dev',
      build: 'echo build',
      test: 'echo test',
      typecheck: 'echo typecheck',
      lint: 'echo lint',
      format: 'echo format',
    },
  } as DevConfig
}

async function runOne(label: string, language: 'typescript' | 'rust'): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), `oisin-grounded-${label}-`))
  if (language === 'typescript') {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'fake', version: '0.0.0' }))
  } else {
    writeFileSync(join(dir, 'Cargo.toml'), '[package]\nname = "fake"\nversion = "0.0.0"\n')
  }
  execSync('git init -q', { cwd: dir })
  execSync('git -c user.email=t@t -c user.name=t commit --allow-empty -q -m init', { cwd: dir })

  process.stderr.write(`\n──── ${label} (${language}) at ${dir} ────\n`)
  await installAll(dir, makeConfig(language), ANSWERS, { skipSideEffects: false })

  const settingsPath = join(dir, '.claude', 'settings.json')
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
  const stopCmds = (settings.hooks?.Stop ?? []).flatMap((e: { hooks: { command: string }[] }) =>
    e.hooks.map((h) => h.command),
  )
  const hasVerifyGrounding = stopCmds.some((c: string) => c.includes('verify-grounding.sh'))
  if (hasVerifyGrounding) {
    throw new Error(`${label}: settings.json still wires verify-grounding.sh`)
  }
  process.stderr.write(`✓ ${label}: generated settings.json does NOT wire verify-grounding.sh\n`)
  process.stderr.write(`✓ ${label}: Stop hooks = ${JSON.stringify(stopCmds)}\n`)

  const status = spawnSync('grounded', ['status'], { encoding: 'utf8' })
  if (!status.stdout.includes('11 hooks active')) {
    throw new Error(
      `${label}: grounded status did not show 11 hooks active. Got: ${status.stdout}`,
    )
  }
  process.stderr.write(`✓ ${label}: grounded status reports 11 hooks active\n`)

  rmSync(dir, { recursive: true, force: true })
  process.stderr.write(`✓ ${label}: cleaned up\n`)
}

async function main(): Promise<void> {
  await runOne('ts-target', 'typescript')
  await runOne('rust-target', 'rust')
  process.stderr.write('\nALL VERIFICATIONS PASSED\n')
}

main().catch((err) => {
  process.stderr.write(`\n✗ VERIFICATION FAILED: ${err}\n`)
  process.exit(1)
})
