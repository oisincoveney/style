---
name: to-bd-issues
description: Break a plan, spec, or grilled conversation into independently-grabbable bd issues (epic + child tasks) using tracer-bullet vertical slices. Use when user has finished planning (often via grill-me) and wants to convert the design into bd tickets.
---

<!--
Forked from https://github.com/mattpocock/skills/tree/main/skills/to-issues
(MIT, Copyright (c) 2026 Matt Pocock). Adapted to write bd issues
via `bd create --graph` instead of GitHub issues via `gh`. See LICENSE
in this directory for full notice.
-->

# To bd Issues

Break plan into independently-grabbable **bd issues** using vertical slices (tracer bullets).

## Process

### 0. Verify approval gate (stage-2 entry point)

Stage-2 fan-out only. Stage-1 (epic-alone + `bd human` flag) is owned by `plan-brief` skill. This skill runs AFTER `/approve` — when user approval is recorded.

Required input: parent epic id (`<prefix>-<slug>`).

Pre-checks (refuse + halt if any fail):
- `bd show <epic-id> --json | jq .human` returns `false` (or matching `bd human list` shows no active flag for this id).
- `bd memories "plan-approved:<epic-id>:"` returns ≥1 entry. Note: hash check is enforced at `bd create --graph` time by `plan-approval-guard.sh`; the body-edit-since-approval case is caught there.

Failure → tell user "Plan not approved. Run /approve <epic-id> first." Halt.

### 1. Gather context

Work from conversation context — usually `grill-me` result or user-pasted draft. Don't make up requirements; design tree has gaps → halt, ask.

### 2. Refuse on unresolved clarifications

Conversation has any `[NEEDS CLARIFICATION: ...]` markers → **don't write to bd**. Surface markers, request resolution. Discipline: bd issues encode resolved decisions, not open questions.

### 3. Explore codebase (when relevant)

Slice shape depends on existing code (file paths, current APIs, conventions) → inspect codebase before writing issue body. Cite `file:line` in `## Files Likely Touched`.

### 4. Draft vertical slices

Break plan into **tracer bullet** issues. Each issue = thin vertical slice cutting through ALL integration layers end-to-end, NOT horizontal slice of one layer.

Slices: 'HITL' or 'AFK'. HITL = needs human interaction (architectural decision, design review, credential). AFK = implementable + verifiable without human interaction. Prefer AFK.

<vertical-slice-rules>
- Each slice delivers narrow but COMPLETE path through every layer (schema, business logic, surface, tests).
- Completed slice = demoable / verifiable alone.
- Many thin slices > few thick.
- Slice dependency edges so DAG has multiple ready fronts (parallel-friendly).
</vertical-slice-rules>

### 5. Show breakdown to user

Present proposed graph as numbered list. Per slice:

- **Title**: short descriptive (becomes issue title).
- **Type**: HITL / AFK.
- **Blocked by**: which slice keys must close first (temp keys `a`, `b`, `c` until bd assigns IDs).
- **EARS AC**: 1–3 numbered EARS criteria.
- **Files Likely Touched**: with one-line reasons.

Ask user:

- Granularity right? (too coarse / too fine)
- Dependency edges correct?
- Slices merge or split further?
- HITL vs AFK marked correctly?

Iterate until user approves.

### 6. Create children atomically (stage-2)

Parent epic already exists (stage-1 by `plan-brief`). Create only children, attach to existing parent:

```bash
bd create --graph --parent=<epic-id> /dev/stdin <<'EOF'
{
  "nodes": [
    {"key": "a", "title": "<slice 1>", "type": "task",
     "description": "<DSL child body — template below>"},
    {"key": "b", "title": "<slice 2>", "type": "task", "depends_on": ["a"],
     "description": "..."},
    ...
  ]
}
EOF
```

Each child body uses DSL frontmatter (see `dsl.md`). Exactly one child has `tracer: true` (see `tracer-bullet.md`).

Gate sequence on this call:
1. `plan-approval-guard.sh` — verifies `human:0` + `plan-approved:<id>:<current-sha>` memory matches current epic body.
2. `bd-create-gate.sh` (graph mode) — full rubric: tracer present, `files[]`/`verify[]`/`ac[]` non-empty per child, domain coherence, token budgets.

Failure → fix children DSL, retry. Don't `--gate-bypass`.

Capture returned ID mappings (e.g., `a -> <prefix>-<slug>.1`).

### 7. Validate

After creation:
- `bd lint <epic-id>` — zero warnings.
- `bd swarm validate <epic-id>` — confirms DAG acyclic, shows ready fronts.
- `bd swarm create <epic-id>` — register swarm so subsequent `require-swarm.sh` PreToolUse pass.

Report epic ID + child count to user.

## Templates

Children use DSL frontmatter — see `dsl.md` for full schema. Bodies optional (≤30 lines caveman).

### Child task body (DSL)

```yaml
---
type: task
priority: <0..3>
tracer: <true|false>      # exactly one child per graph: true
files:
  - <path>
  - <path>.test.ts
verify:
  - <cmd>
deps:
  blocked_by: []           # other child keys
ac:
  - "WHEN <event> THE SYSTEM SHALL <response>"
out_of_scope:
  - <non-goal>
---
<optional caveman body, ≤30 lines>
```

Token cap: task body ≤115 words. Gate enforces.

### Epic body — already exists

Epic was created at stage-1 by `plan-brief`. This skill never re-creates the epic. If user requests epic body change, route through `/regrill <id>`.

## Forbidden

- DON'T re-create the epic. Stage-1 done. Children only via `bd create --graph --parent=<id>`.
- DON'T write markdown file outside bd's database — no `.claude/specs/`, no `docs/`, no temp drafts. Body lives in bd via stdin only.
- DON'T call `bd update <id> --claim`. Claim = user's explicit action via `/work-next` or follow-up.
- DON'T modify unrelated bd issue.
- DON'T close parent epic until all children close (handled by `bd swarm close-eligible`).
- DON'T `--gate-bypass`. Fix the DSL, retry.

## When NOT to invoke

- Single-file, single-concern → file one `bd create --type=task` directly, no epic ceremony.
- Pure-research producing memory not implementation → `bd remember`.
- Bug fix contained in already-claimed ticket → use `discovered-from` on current ticket via `/discover` or its rule.
