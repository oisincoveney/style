/**
 * Generates `.claude/commands/*.md` — single-purpose slash commands.
 *
 * Commands are cheaper than skills for one-shot workflows: no description
 * in the skill budget, they only load when the user types `/<name>`.
 */

import type { DevConfig } from '../config.js'

export interface CommandFile {
  filename: string
  content: string
}

export function generateCommands(config: DevConfig): CommandFile[] {
  const files: CommandFile[] = []
  files.push({ filename: 'verify.md', content: verifyCommand(config) })
  if (config.tools.includes('beads')) {
    files.push({ filename: 'ready.md', content: readyCommand() })
  }
  files.push({ filename: 'spec.md', content: specCommand() })
  return files
}

function verifyCommand(config: DevConfig): string {
  const { typecheck, lint, test } = config.commands
  return `---
description: Run typecheck, lint, and tests; report pass/fail per step
disable-model-invocation: true
allowed-tools: Bash
---

Run the project's verification chain in order. Stop and report the first failure.

1. Typecheck: \`${typecheck}\`
2. Lint: \`${lint}\`
3. Test: \`${test}\`

After all three pass, state "Verified: typecheck + lint + test green." with the tail of the test output included. If any step fails, show the failing output verbatim and stop — do not attempt a fix unless the user asks.
`
}

function readyCommand(): string {
  return `---
description: Show the top beads ready task with full detail
disable-model-invocation: true
allowed-tools: Bash(bd *)
---

Run \`bd ready\` to list available work, then \`bd show\` on the highest-priority item. Summarize the issue, its dependencies, and the acceptance criteria in under 150 words. Do not claim the task — the user will run \`bd update <id> --claim\` themselves if they want to proceed.
`
}

function specCommand(): string {
  return `---
description: Create a new spec file in .claude/specs/ for the current task
disable-model-invocation: true
allowed-tools: Bash(date *) Write Read
---

Create a new spec at \`.claude/specs/YYYY-MM-DD-$ARGUMENTS.md\` using the TEMPLATE.md in the same directory. Use today's date (from \`date +%Y-%m-%d\`) and the slug passed as \`$ARGUMENTS\`. Fill in the Overview and Success Criteria sections with your best inference from recent conversation, then stop — the user fills in the rest.

If \`$ARGUMENTS\` is empty, ask for a slug (kebab-case) and halt.
`
}
