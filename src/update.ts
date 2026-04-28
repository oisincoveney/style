/**
 * `oisin-dev update`
 *
 * Re-syncs generated files (hook scripts, .claude/docs/ fragments, settings)
 * from the existing .dev.config.json without running prompts and without
 * touching user-customised files (lefthook.yml, lint configs).
 */

import { execSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as p from '@clack/prompts'
import { readConfig } from './config.js'
import {
  installAll,
  removeLegacyRetiredPaths,
  seedConstitutionDecisions,
  stripLegacyConfigFields,
  trimBeadsIntegrationOnAgentDocs,
} from './install.js'
import type { DriftCandidate, DriftDecision } from './manifest.js'

export async function runUpdate(): Promise<void> {
  p.intro('@oisincoveney/dev update')

  const cwd = process.cwd()
  const config = readConfig(cwd)

  if (!config) {
    p.log.error('No .dev.config.json found. Run `init` first.')
    process.exit(1)
  }

  if (existsSync(join(cwd, '.claude', 'docs'))) {
    p.log.warn(
      'Detected legacy `.claude/docs/` directory. Instructions now live in `.claude/rules/` — review any custom edits, then delete `.claude/docs/`.',
    )
  }

  p.log.info(`Re-syncing ${config.variant} project from .dev.config.json`)

  const legacy = removeLegacyRetiredPaths(cwd)
  for (const path of legacy.removed) p.log.info(`removed orphan: ${path}`)
  for (const warning of legacy.warnings) p.log.warn(warning)

  const trimmed = trimBeadsIntegrationOnAgentDocs(cwd)
  for (const file of trimmed) p.log.info(`trimmed BEADS INTEGRATION block: ${file}`)

  const stripped = stripLegacyConfigFields(cwd)
  for (const field of stripped) p.log.info(`stripped removed config field: ${field}`)

  if (config.tools.includes('beads') && config.workflow === 'bd' && existsSync(join(cwd, '.beads'))) {
    const seed = seedConstitutionDecisions(cwd, config)
    if (seed.ok && seed.created > 0) {
      p.log.info(`seeded ${seed.created} constitution decision(s)`)
    }
  }

  const acceptLefthook = process.argv.includes('--accept-lefthook-overwrite')
  const isInteractive = process.stdout.isTTY === true && process.stdin.isTTY === true

  const result = await installAll(cwd, config, {} as never, {
    skipSideEffects: true,
    isUpdate: true,
    acceptLefthookOverwrite: acceptLefthook,
    onDrift: isInteractive ? promptDrift : undefined,
  })

  if (result.manifest) {
    if (result.manifest.lefthookDrift && !acceptLefthook) {
      p.log.error(
        'lefthook.yml has drifted from what we shipped. Halting update.\n' +
          '  - To accept the new lefthook.yml (overwrite yours): re-run with --accept-lefthook-overwrite\n' +
          '  - To keep your version and update the manifest to match: run `oisin-dev accept-lefthook`\n' +
          '  - Otherwise diff and reconcile manually before re-running update.',
      )
      process.exit(1)
    }

    if (result.manifest.promptKept.length > 0) {
      p.log.info(
        `Kept your version of ${result.manifest.promptKept.length} file(s): ${result.manifest.promptKept.join(', ')}`,
      )
    }

    if (result.manifest.devNew.length > 0) {
      p.log.warn(
        `Drifted files written as .dev-new sidecars (non-interactive run): ${result.manifest.devNew.join(', ')}. Diff and reconcile.`,
      )
    }

    if (result.manifest.removed.length > 0) {
      p.log.info(`Removed retired files: ${result.manifest.removed.join(', ')}.`)
    }
  }

  p.outro('Commit the updated files.')
}

async function promptDrift(candidate: DriftCandidate): Promise<DriftDecision> {
  while (true) {
    const choice = await p.select<'keep' | 'take' | 'diff' | 'abort'>({
      message: `${candidate.relPath} differs from what 0.x ships. ${candidate.severity === 'super' ? 'Heavily modified.' : 'Mildly modified.'} What do you want to do?`,
      options: [
        { value: 'take', label: 'Take new version (overwrite mine)' },
        { value: 'keep', label: 'Keep my version (manifest hash will match mine)' },
        { value: 'diff', label: 'Show diff first' },
        { value: 'abort', label: 'Abort update' },
      ],
    })

    if (p.isCancel(choice) || choice === 'abort') return 'abort'
    if (choice === 'keep') return 'keep'
    if (choice === 'take') return 'take'

    showDiff(candidate)
  }
}

function showDiff(candidate: DriftCandidate): void {
  const tmp = mkdtempSync(join(tmpdir(), 'oisin-dev-diff-'))
  const currentPath = join(tmp, 'current')
  const newPath = join(tmp, 'new')
  try {
    writeFileSync(currentPath, candidate.currentContent)
    writeFileSync(newPath, candidate.newContent)
    try {
      execSync(`git --no-pager diff --no-index --color=always "${currentPath}" "${newPath}"`, {
        stdio: 'inherit',
      })
    } catch {
      // git diff --no-index exits 1 when files differ — that's expected.
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
}
