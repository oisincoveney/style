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
    files.push({ filename: 'epic.md', content: epicCommand() })
    files.push({ filename: 'work-next.md', content: workNextCommand() })
    files.push({ filename: 'bd-hygiene.md', content: bdHygieneCommand() })
    files.push({ filename: 'discover.md', content: discoverCommand() })
    files.push({ filename: 'plan.md', content: planCommand() })
    files.push({ filename: 'research.md', content: researchCommand() })
    files.push({ filename: 'decision.md', content: decisionCommand() })
    files.push({ filename: 'verify-spec.md', content: verifySpecCommand() })
  }
  files.push({ filename: 'commit.md', content: commitCommand() })
  files.push({ filename: 'explore.md', content: exploreCommand() })
  return files
}

function verifySpecCommand(): string {
  return `---
description: Spawn a fresh-context subagent to verify a bd issue's acceptance criteria
disable-model-invocation: true
allowed-tools: Bash(bd *)
---

Verify bd issue \`$ARGUMENTS\` against its EARS acceptance criteria using a fresh-context verifier subagent. The main agent cannot self-certify completion.

If \`$ARGUMENTS\` is empty, ask for an issue ID and halt.

Steps:

1. Spawn an Agent with \`subagent_type=general-purpose\` and the following self-contained prompt (substitute the actual issue ID):

   ---
   You are an independent verifier. Do not trust any prior context. Re-read everything yourself.

   Verify bd issue \`<id>\` against its acceptance criteria.

   Steps:
   1. Run \`bd show <id>\` and read the body in full.
   2. For each numbered EARS criterion under \`## Acceptance Criteria\`, identify the relevant code paths via Grep / Glob / Read. Cite file:line.
   3. Run each command listed under \`## Verification Commands\` exactly as written. Capture stdout/stderr and exit code.
   4. For each criterion, mark PASS / FAIL / PARTIAL with concrete evidence (file:line, test names, exit codes). PARTIAL = behavior partially implemented or only some sub-clauses verified.
   5. If \`## Files Likely Touched\` is present, verify the diff stayed within that list. Edits outside it are a scope-creep flag.

   Output format (markdown):
   \`\`\`
   ## Result: PASS | FAIL | PARTIAL

   ### Per-criterion
   1. <criterion text> — PASS — <evidence>
   2. <criterion text> — FAIL — <evidence>
   ...

   ### Verification commands
   - \`<cmd>\` — exit <N> — <one-line summary>

   ### Scope
   - Edits stayed within Files Likely Touched: yes | no (list out-of-scope files)
   \`\`\`

   Aggregate: PASS only if every criterion is PASS AND every verification command exited 0 AND scope was respected. Otherwise FAIL or PARTIAL.

   Do NOT call \`bd close\` or \`bd update\`. Verification is read-only.
   ---

2. Append the verifier output as a bd note for audit trail:

   \`\`\`bash
   bd note $ARGUMENTS "<verifier output>"
   \`\`\`

3. Branch on the result:
   - **PASS** — main agent MAY proceed to \`bd close $ARGUMENTS --reason "verified by /verify-spec" --suggest-next\`.
   - **FAIL** or **PARTIAL** — DO NOT call \`bd close\`. Report the failing criteria to the user. Address them in this session or file follow-ups via /discover.

4. If the verifier could not run (subagent failed, timed out, etc.), report the failure and do NOT close. The default path is "verification did not complete → issue stays open".
`
}

function discoverCommand(): string {
  return `---
description: Create a discovered-from child issue when scope expands during work
disable-model-invocation: true
allowed-tools: Bash(bd *)
---

Create a child bd issue tagged as discovered-from the currently claimed work, so scope expansion is tracked instead of silently absorbed.

Steps:

1. Identify the currently claimed (in_progress) issue: \`bd list --status in_progress --json\`. If none, halt — \`/discover\` requires an in_progress claim.

2. Take the description from \`$ARGUMENTS\` (or ask for it). Use it as the new task title.

3. Create the child:

   \`\`\`bash
   bd create --type=task --deps "discovered-from:<current-id>" --priority=2 --title="<description>" --silent
   \`\`\`

4. Echo back the new ID and the parent (current) ID. Do NOT claim the new issue. Continue the current work.

Do NOT expand scope of the current ticket without filing this discovery first. The discovered-from edge is the audit trail for scope creep.
`
}

function planCommand(): string {
  return `---
description: Write a plan into a bd issue's design field (no markdown files on disk)
disable-model-invocation: true
allowed-tools: Bash(bd *)
---

Draft a plan for bd issue \`$ARGUMENTS\` and store it in the issue's design field. No file is written to \`.claude/plans/\` or anywhere else on disk.

Steps:

1. If \`$ARGUMENTS\` is empty, ask for an issue ID and halt.

2. Read the issue: \`bd show $ARGUMENTS\`.

3. Draft the plan in conversation. Required sections:
   - **Goal** — one sentence outcome.
   - **Root cause / requirement** — why, not symptoms.
   - **Files to change** — every file with a one-line reason.
   - **Order of operations** — which edit first, why.
   - **What you verified** — docs read (URLs), code traced (file:line), commands run.
   - **Risks** — what could go wrong, mitigation.

4. Write the plan into the issue:

   \`\`\`bash
   bd update $ARGUMENTS --design "<plan markdown>"
   \`\`\`

5. Print the bd show URL or \`bd show $ARGUMENTS --field design\` to confirm.

Do NOT create \`.claude/plans/\` or any markdown file in the working tree. The plan lives in bd's design field.
`
}

function researchCommand(): string {
  return `---
description: Research a topic and store the dossier in bd (memory or spike), never on disk
disable-model-invocation: true
allowed-tools: WebFetch WebSearch Read Grep Glob Bash(bd *)
---

Produce a cited research dossier for \`$ARGUMENTS\` and store it in bd. No file is written to \`docs/research/\` or anywhere on disk.

Steps:

1. If \`$ARGUMENTS\` is empty, ask for a topic and halt.

2. Ask the user: **memory** or **spike**?
   - **memory** — cross-session reusable knowledge (e.g., "how Context7 MCP works"). Stored via \`bd remember\`, retrievable across sessions.
   - **spike** — issue-bound research (e.g., "options for fixing bd-42"). Stored as a \`--type=spike\` issue linked via \`blocks:\` to the work it gates.

3. Produce the dossier with these sections:
   - Problem statement
   - External facts (each claim cited via WebFetch URL — no claims from training data)
   - Options with tradeoffs
   - Recommendation
   - Open questions

4. Store:
   - **memory**: \`bd remember "<dossier>" --tags=research,$ARGUMENTS\`
   - **spike**: \`bd create --type=spike --priority=2 --title="$ARGUMENTS" --silent --body-file=- <<'EOF' ...EOF\`. If user names a parent issue, add \`--deps "blocks:<parent-id>"\`.

5. Print the new memory ID or spike issue ID.

Do NOT create \`docs/research/\` or any markdown file. All research lives in bd.
`
}

function decisionCommand(): string {
  return `---
description: Record an architecture/process decision in bd as the source of truth
disable-model-invocation: true
allowed-tools: Bash(bd *)
---

Record a decision for \`$ARGUMENTS\` in bd. Replaces \`docs/adr/\` markdown files.

Steps:

1. If \`$ARGUMENTS\` is empty, ask for a decision title and halt.

2. Draft, then run:

   \`\`\`bash
   bd decision record --title="$ARGUMENTS" \\
     --rationale="<why this option>" \\
     --alternatives-considered="<other options + why rejected>"
   \`\`\`

3. If the decision is project-wide (constitution-level), pin it:

   \`\`\`bash
   bd decision pin <decision-id>
   \`\`\`

4. Print the decision ID. List with \`bd decision list\`.

Do NOT create \`docs/adr/\` or any markdown file. All decisions live in bd.
`
}

function bdHygieneCommand(): string {
  return `---
description: Run weekly bd database hygiene checks (doctor, stale, lint, open count)
disable-model-invocation: true
allowed-tools: Bash(bd *)
---

Run the bd hygiene checks in order. Report findings; do not auto-fix.

1. \`bd doctor\` — health check (db consistency, dolt status).
2. \`bd stale --days 14\` — issues not updated in 14 days.
3. \`bd orphans\` — issues with no parent that are not root epics (skip if subcommand is unavailable).
4. \`bd lint --status all\` — issues missing required EARS sections per type.
5. \`bd count --status open\` — total open issue count.

After step 5: if the open count exceeds **200**, warn per Yegge's guidance ("agent search degrades past ~25k tokens / ~500 issues; aim for ≤200 open"). Suggest \`bd cleanup\` to compact closed issues, or close completed work.

Output a one-line summary per check (PASS / N issues found / WARN), then a final aggregate.

Do NOT run \`bd cleanup\`, \`bd compact\`, \`bd close\`, or any mutation. This command is read-only triage.
`
}

function workNextCommand(): string {
  return `---
description: Pick the next unblocked bd issue, claim it, and read back the acceptance criteria
disable-model-invocation: true
allowed-tools: Bash(bd *)
---

Pick the highest-priority unblocked bd issue, claim it, and echo the acceptance criteria back. Halt before any source edit until the user confirms the criteria.

Steps:

1. Run \`bd ready --json\`. Pick the first issue (highest priority + earliest in queue).

2. If the queue is empty, run \`bd ready --explain\` to surface the reason (all in_progress / blocked / no open issues), report it, and halt without claiming.

3. Run \`bd show <id>\` and read the body in full.

4. **Validation gate:** If the issue body is missing an \`## Acceptance Criteria\` section OR a \`## Verification Commands\` section, do NOT claim. Report the missing sections and instruct the user to run \`bd update <id> --acceptance "..."\` or edit the body. Halt.

5. **Validation gate:** If the body contains any unresolved \`[NEEDS CLARIFICATION: ...]\` marker, do NOT claim. Report and halt.

6. Run \`bd update <id> --status in_progress\` to claim the issue.

7. Echo back, verbatim:
   - The full \`## Acceptance Criteria\` section
   - The full \`## Verification Commands\` section
   - The full \`## Files Likely Touched\` section (if present)
   - The full \`## Out of Scope\` section (if present)

8. Halt. Do not begin any source-file edit until the user confirms the read-back matches their intent.

The require-claim.sh PreToolUse hook (when enabled) blocks source edits without an in_progress claim — this command is the canonical path to satisfy that gate.
`
}

function epicCommand(): string {
  return `---
description: Draft an EARS-format epic and create it in bd as the source of truth
disable-model-invocation: true
allowed-tools: Bash(bd *) Bash(cat *)
---

Draft an EARS-format epic for \`$ARGUMENTS\` and create it in bd. No markdown file is written outside of bd's database.

If \`$ARGUMENTS\` is empty, ask for a kebab-case slug and halt.

Steps:

1. Draft the epic body in conversation using EARS Success Criteria. Required sections:

   \`\`\`markdown
   ## User story
   As a <role> I want <capability> so that <benefit>.

   ## Success Criteria
   1. WHEN <event> THE SYSTEM SHALL <response>
   2. IF <precondition> THEN THE SYSTEM SHALL <response>
   3. WHILE <state>, WHEN <event> THE SYSTEM SHALL <response>

   ## Out of Scope
   - <non-goal>

   ## [NEEDS CLARIFICATION: ...]
   <Block creation until resolved.>
   \`\`\`

2. If any \`[NEEDS CLARIFICATION: ...]\` markers remain, halt and ask the user. Do not create the epic until they are resolved.

3. Create the epic via stdin (no temp file on disk):

   \`\`\`bash
   bd create --type=epic --priority=1 --title="<title>" --silent --body-file=- <<'EOF'
   <body markdown>
   EOF
   \`\`\`

   Capture the returned issue ID (e.g. \`<prefix>-N\`).

4. Propose the child-task breakdown to the user — one task per unit of work. For each, draft a body with sections: User story, Acceptance Criteria (EARS), Files Likely Touched, Verification Commands, Out of Scope.

5. After the user confirms the breakdown, create each child via:

   \`\`\`bash
   bd create --type=task --parent=<epic-id> --priority=N --title="<title>" --silent --body-file=- <<'EOF'
   <body markdown>
   EOF
   \`\`\`

6. Add inter-ticket \`bd dep add <blocked> <blocker>\` for ordering dependencies between siblings.

7. Run \`bd lint\` on the epic and children — confirm zero template warnings.

Do NOT call \`bd update <id> --claim\`. Claiming is an explicit user action via /work-next.

Do NOT write the spec body to a file in the working tree. The body lives in bd via stdin only.
`
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

function commitCommand(): string {
  return `---
description: Split current working changes into logical, focused commits
disable-model-invocation: true
allowed-tools: Bash(git *)
---

Split the current working tree into logical commits. Never dump everything into a single commit.

1. Run \`git status\` and \`git diff\` (and \`git diff --cached\`) to review all changes.
2. Group related hunks into logical commits — one concern per commit:
   - feat: new behavior
   - fix: bug fix
   - refactor: structure without behavior change
   - test: tests only
   - docs: documentation
   - chore: tooling, config, formatting
3. For each group, \`git add -p\` or \`git add <specific files>\` — never \`git add -A\`/\`git add .\`.
4. Write a conventional commit message: \`<type>(<scope>): <subject>\` under 70 chars, body explaining WHY not WHAT.
5. Never add Co-Authored-By trailers (blocked by hook).
6. Run \`git log --oneline -10\` after each commit to confirm.

Stop before pushing. The user pushes when they're ready.

If the diff is trivially one concern, one commit is fine — do not invent splits.
`
}

function exploreCommand(): string {
  return `---
description: Explore and map the code path for a feature or bug — read-only, no edits
disable-model-invocation: true
allowed-tools: Read Grep Glob Bash(rg *) Bash(git log *) Bash(git blame *)
---

Map the code path for \`$ARGUMENTS\` without making any edits. Produce a short report only.

1. Identify entry points (routes, CLI args, public APIs, exported functions) relevant to \`$ARGUMENTS\`.
2. Trace the data flow end-to-end: input → validation → business logic → persistence → output.
3. List every file touched along the path, with a one-line note per file.
4. Note the tests that cover this path (and, honestly, the gaps).
5. Call out any surprises: god-objects, circular deps, silent fallbacks, generated code, TODOs.
6. End with: "Suggested next step: <one sentence>." — do not start implementing.

If \`$ARGUMENTS\` is empty, ask for the feature/bug subject and halt.

Do not edit any files during exploration. If the user tells you to start editing, switch modes explicitly.
`
}

