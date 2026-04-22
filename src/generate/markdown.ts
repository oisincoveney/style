/**
 * Generates the CLAUDE.md / AGENTS.md kernel.
 *
 * The kernel stays small (~30 lines) because `.claude/rules/*.md` carries the
 * real content and Claude Code auto-loads rules either always (no `paths:`) or
 * when matching files are read (with `paths:`). Inlining fragments via `@import`
 * would re-bloat the baseline.
 */

import type { DevConfig } from '../config.js'
import type { Answers } from '../prompts.js'

export interface ClaudeMdBundle {
  root: string
  fragments: Record<string, string>
}

/** Entry point for install.ts. Returns the kernel (no fragments). */
export function buildClaudeMdBundle(config: DevConfig, _answers: Answers): ClaudeMdBundle {
  return { root: buildClaudeKernel(config), fragments: {} }
}

/** Back-compat: flat markdown for callers that want a single string. */
export function generateClaudeMd(config: DevConfig, answers: Answers): string {
  return buildClaudeMdBundle(config, answers).root
}

export function buildClaudeKernel(config: DevConfig): string {
  const lines = [
    '# Project Instructions for AI Agents',
    '',
    'This project is configured with @oisincoveney/dev. Hooks enforce most rules mechanically. Detailed rules live in `.claude/rules/` — Claude Code loads them automatically (always for unscoped rules, when matching files are read for path-scoped rules).',
    '',
    '## Critical Rules (always active)',
    '',
  ]

  const criticalBullets: string[] = []

  if (config.tools.includes('beads')) {
    criticalBullets.push('Use `bd` for ALL task tracking — TodoWrite is blocked by hook.')
  }
  criticalBullets.push('Never run destructive commands without explicit user approval — blocked by hook.')
  criticalBullets.push('Read before editing; verify before claiming done.')
  criticalBullets.push(
    'Confident wrong answers are worse than honest uncertainty. Say "I need to verify" and check.',
  )
  criticalBullets.push('Treat user constraints as non-negotiable; do not reinterpret.')
  criticalBullets.push('No follow-up questions like "Want me to...". If done, stop.')
  criticalBullets.push(
    'Do not write "this works", "this should work", or "done" without having run the test command and seen passing output. The Stop hook enforces this.',
  )
  criticalBullets.push(
    'Ask one non-trivial question at a time — stacking multiple judgment-call questions is not OK.',
  )

  for (const b of criticalBullets) lines.push(`- ${b}`)
  lines.push('')
  lines.push('## Detailed Rules')
  lines.push('')
  lines.push(
    'See `.claude/rules/` for the full set. Topic files (`architecture.md`, `testing.md`, `ai-behavior.md`, etc.) load every session. Path-scoped files (`component-patterns.md`, `styling-ui.md`, `contract-driven.md`) load only when Claude reads matching files — editing a `.tsx` file pulls in the frontend rules automatically.',
  )
  lines.push('')

  return lines.join('\n')
}
