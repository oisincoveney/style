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

### 6. Create epic + children atomically

`bd create --graph` to create entire DAG in one call:

```bash
bd create --graph /dev/stdin <<'EOF'
{
  "nodes": [
    {"key": "epic", "title": "<epic title>", "type": "epic", "priority": 0,
     "description": "<EARS epic body — template below>"},
    {"key": "a", "title": "<slice 1>", "type": "task", "parent": "epic",
     "description": "<EARS child body — template below>"},
    {"key": "b", "title": "<slice 2>", "type": "task", "parent": "epic", "depends_on": ["a"],
     "description": "..."},
    ...
  ]
}
EOF
```

Capture returned ID mappings (e.g., `epic -> bd-XYZ`, `a -> bd-XYZ.1`).

### 7. Validate

After creation:
- `bd lint <epic-id>` — zero warnings.
- `bd swarm validate <epic-id>` — confirms DAG acyclic, shows ready fronts.
- `bd swarm create <epic-id>` — register swarm so subsequent `require-swarm.sh` PreToolUse pass.

Report epic ID + child count to user.

## Templates

### Epic body

```markdown
## User story
As <role> I want <capability> so that <benefit>.

## Success Criteria
1. WHEN <event> THE SYSTEM SHALL <response>
2. IF <precondition> THEN THE SYSTEM SHALL <response>
3. WHILE <state>, WHEN <event> THE SYSTEM SHALL <response>

## Out of Scope
- <explicit non-goal>

## Constitution references
- <pinned bd decisions or rules this epic must respect>
```

### Child task body

```markdown
## User story
As <role> I want <capability> so that <benefit>.

## Acceptance Criteria
1. WHEN <event> THE SYSTEM SHALL <response>
2. IF <precondition> THEN THE SYSTEM SHALL <response>

## Files Likely Touched
- <path> — <reason>
- <path>.test.ts — <reason>

## Verification Commands
- <cmd> — <one-line summary>

## Out of Scope
- <explicit non-goal>
```

## Forbidden

- DON'T write markdown file outside bd's database — no `.claude/specs/`, no `docs/`, no temp drafts. Body lives in bd via stdin only.
- DON'T call `bd update <id> --claim`. Claim = user's explicit action via `/work-next` or follow-up.
- DON'T modify unrelated bd issue.
- DON'T close parent epic until all children close (handled by `bd swarm close-eligible`).

## When NOT to invoke

- Single-file, single-concern → file one `bd create --type=task` directly, no epic ceremony.
- Pure-research producing memory not implementation → `bd remember`.
- Bug fix contained in already-claimed ticket → use `discovered-from` on current ticket via `/discover` or its rule.
