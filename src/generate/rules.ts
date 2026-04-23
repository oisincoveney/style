/**
 * Generates `.claude/rules/*.md` — the primary Claude Code context channel.
 *
 * Two kinds of rules:
 * 1. Static rules — copied verbatim from `templates/rules/<id>.md`.
 *    Frontmatter in the source controls Claude's runtime scoping (paths, description).
 * 2. Dynamic rules — built from `DevConfig` (commands, workflow, beads, contract-driven).
 */

import { readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import type { DevConfig, Language } from '../config.js'
import { RULE_SKILLS } from '../skills.js'

export interface RuleFile {
  filename: string
  content: string
}

/**
 * @param templatesDir — absolute path to the package's `templates/` directory.
 *   Passed in from install.ts (which resolves it correctly for both source and
 *   bundled execution). The `skill.sourceFile` is `templates/rules/<id>.md`;
 *   we rebase it onto the real templates dir.
 */
export function generateRules(config: DevConfig, templatesDir: string): RuleFile[] {
  const files: RuleFile[] = []

  // 1. Static rule files from templates/rules/ — filter by selected skills.
  for (const skill of RULE_SKILLS) {
    if (!config.skills.includes(skill.id)) continue
    const source = resolve(templatesDir, 'rules', basename(skill.sourceFile))
    const content = readFileSync(source, 'utf8')
    files.push({ filename: `${skill.id}.md`, content })
  }

  // 2. Dynamic rule files built from config.
  files.push({ filename: 'commands.md', content: commandsRule(config) })
  files.push({ filename: 'workflow.md', content: workflowRule(config) })

  if (config.tools.includes('beads')) {
    files.push({ filename: 'beads.md', content: beadsRule() })
  }
  if (config.contractDriven) {
    files.push({ filename: 'contract-driven.md', content: contractDrivenRule(config.language) })
  }

  return files
}

function commandsRule(config: DevConfig): string {
  const header = `---
name: commands
description: Canonical build/test/lint commands for this project
---

# Commands
`

  const entries: Array<[string, string | null | undefined]> = [
    ['dev', config.commands.dev],
    ['build', config.commands.build],
    ['test', config.commands.test],
    ['typecheck', config.commands.typecheck],
    ['lint', config.commands.lint],
    ['format', config.commands.format],
    ['e2e', config.commands.e2e],
  ]
  const rendered = entries
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([key, value]) => `${`${key}:`.padEnd(11)}${value as string}`)

  if (rendered.length === 0) {
    return `${header}
Commands are not set yet. Run \`oisin-dev set-commands\` once you know the dev/build/test commands for this project.
`
  }

  return `${header}
\`\`\`
${rendered.join('\n')}
\`\`\`

Use these exact commands. Do not guess alternatives like \`docker compose up\`, \`npm start\`, etc.
`
}

function workflowRule(config: DevConfig): string {
  const header = `---
name: workflow
description: Workflow methodology for this project
---

`
  if (config.workflow === 'idd') return header + iddBody()
  if (config.workflow === 'gsd') return header + gsdBody()
  return header + plainSpecBody()
}

function iddBody(): string {
  return `# Workflow: Intent-Driven Development (IDD)

**Core tagline:** Humans define WHAT and WHY. AI determines HOW and WHEN.

**The workflow:**
\`\`\`
Intent → Tests → Code → Sync
\`\`\`

1. **Intent**: Write a short, high-level intent doc in \`.claude/specs/YYYY-MM-DD-<slug>.md\`. Focus on WHAT and WHY, not implementation detail.
2. **Tests**: Write tests that verify the intent (behavior, not implementation).
3. **Code**: Implement the minimum needed to satisfy the tests. Trust the AI to resolve ambiguities.
4. **Sync**: If code drifts from intent, update the intent first. Intent is source of truth, code is output.

**When to write a spec:** Any task larger than a single-file change.
`
}

function gsdBody(): string {
  return `# Workflow: Get Shit Done (GSD)

**Core insight:** Context rot degrades AI output quality as the window fills. GSD forces clean context windows per phase.

**The 6-phase cycle:**
1. **New Project** — clean context window, state goal
2. **Discuss** — clarify requirements before planning
3. **Plan** — produce a structured plan doc in \`.claude/specs/\`
4. **Execute** — implement the plan in atomic commits
5. **Verify** — run tests, lint, build; verify the work matches the plan
6. **Complete Milestone** — commit, push, and clear context for next task

**Rules:**
- Start each major feature with a fresh context window
- Never skip the Discuss → Plan phases for non-trivial work
- Atomic commits per task in the plan
`
}

function plainSpecBody(): string {
  return `# Workflow: Lightweight Specs

For any task larger than a single-file change, create a spec in \`.claude/specs/YYYY-MM-DD-<slug>.md\` using the template. The spec must have explicit success criteria before implementation begins.

Reference the spec in commits: "Implements per specs/YYYY-MM-DD-<slug>.md".
`
}

function beadsRule(): string {
  return `---
name: beads
description: Task tracking via beads (bd) — required, TodoWrite is blocked
---

# Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run \`bd prime\` to see the full workflow.

\`\`\`bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
\`\`\`

**Rules:**
- Use \`bd\` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists (blocked by hook)
- Use \`bd remember\` for persistent knowledge — do NOT use MEMORY.md files
`
}

function contractDrivenRule(language: Language): string {
  const structureByLanguage: Record<string, string> = {
    typescript: `src/modules/trip/
  index.ts          # Public interface — the ONLY thing other modules import
  trip.ts           # Implementation (internal)
  trip.contract.ts  # Type contract: exported types, invariants, pre/postconditions
  trip.test.ts      # Tests that verify the contract`,
    rust: `src/trip/
  mod.rs            # Public interface with \`pub\` items
  internal.rs       # pub(crate) implementation details
  tests.rs          # Integration tests for the contract`,
    go: `internal/trip/
  trip.go           # Public types and interfaces (exported)
  internal.go       # unexported helpers
  trip_test.go      # Tests that verify the contract`,
    swift: `Sources/Trip/
  Trip.swift        # Public types + contract doc comments
  TripStore.swift   # internal implementation (not exported)
Tests/TripTests/
  TripTests.swift   # Tests that verify the contract`,
    other: `trip/
  interface         # Public surface — the only thing consumers use
  internal          # Implementation details (unexported/private)
  tests             # Tests that verify the contract`,
  }

  const pathsByLanguage: Record<string, string[]> = {
    typescript: ['src/**/*.ts', 'src/**/*.tsx'],
    rust: ['src/**/*.rs'],
    go: ['**/*.go'],
    swift: ['Sources/**/*.swift'],
    other: ['src/**/*'],
  }

  const paths = pathsByLanguage[language] ?? ['src/**/*']
  const pathsYaml = paths.map((p) => `  - "${p}"`).join('\n')

  return `---
name: contract-driven
description: Module contract pattern — public interface vs internals, breaking-change discipline
paths:
${pathsYaml}
---

# Contract-Driven Modules

Every module has an explicit contract file defining:
- Exported types (what callers see)
- Pre/postconditions (in docstrings)
- Invariants (what must always be true)
- Example usage (executable via test runner)

**Structure:**
\`\`\`
${structureByLanguage[language]}
\`\`\`

**Rules:**
- Never import from another module's internals. Only import from its public interface.
- Before adding behavior to a module, update its contract first.
- Changing a module's public contract is a breaking change — bump the version and document it.
`
}
