---
name: plan-brief-flow
description: Two-stage epic creation flow. Stage 1 = epic-alone with `bd human` flag (user reviews). Stage 2 = children fan-out, gated on /approve. Mechanically enforced via plan-approval-guard.sh + bd-create-gate.sh.
---

# Plan Brief Flow

User-review gate between planning + execution. Mechanical. Unbypassable in normal path.

## State machine

```
INTENT (user message)
  → DESIGN (grill-me OR feature menu pick)
    → PLAN_DRAFT (plan-brief skill: stage-1 epic-alone in beads + bd human flag)
      → PLAN_REVIEW (user reads bd show <id>)
        → APPROVED (/approve: hash stored, flag dismissed)
          → SWARM_SPAWN (to-bd-issues: stage-2 bd create --graph --parent=<id>)
            → IN_FLIGHT (parallel-tickets workers)
              → DONE (epic auto-closes via bd swarm close-eligible)
```

Reject path: `/reject <id>` → epic closed, `plan-rejected:` memory written, grill-me re-enters with rejection.

Revise path: `/regrill <id> <topic>` → re-flag `bd human`, drop `plan-approved:` memory, optional grill-me on topic.

## Stage 1: epic-alone

Skill: `plan-brief`. Creates `bd create --type=epic` with DSL frontmatter brief body. NO children. Flags `bd human <id>`. Halts.

Gate: `bd-create-gate.sh` (epic-alone mode). Validates:
- `domain` non-empty
- `artifact` non-empty
- `out_of_scope[]` ≥1
- body ≤192 words

Failure → fix brief, retry. Don't `--gate-bypass`.

## Stage 2: children fan-out

Skill: `to-bd-issues`. Reads parent epic, validates approval state, runs `bd create --graph --parent=<epic-id>` with full child DSL.

Gates (in order):
1. `plan-approval-guard.sh` — checks epic `human:0` AND `plan-approved:<id>:<current-sha>` memory exists. Body drift since approval → deny.
2. `bd-create-gate.sh` (graph mode) — full rubric: tracer present, `files[]` + `verify[]` + `ac[]` for each child, domain coherence (children's `files[]` share ancestor matching epic `domain`), token budgets.

Both pass → children created atomically. `bd swarm create <epic-id>` registers swarm.

## Hard rules

- Stage-1 epic creation NEVER includes children. Always two-stage.
- Stage-2 NEVER runs without approval. `plan-approval-guard.sh` blocks.
- Approval namespace (`plan-approved:`) write-protected by `bd-remember-protect.sh`. Only slash commands set it.
- Never edit epic body post-flag without `/regrill`. Hash binding catches on next gate hit.
- Never call `bd create --graph` outside `to-bd-issues`.
- Plan brief lives in beads (epic description). Never write `.claude/plans/<slug>.md` or any disk markdown.

## Approval slash commands

- `/approve <id>` — sets `OISIN_DEV_PLAN_APPROVE=1`, hashes body, writes `bd remember "plan-approved:<id>:<sha>"`, dismisses `bd human`.
- `/reject <id> <reason>` — `bd close <id> --reason "<reason>"`, writes `bd remember "plan-rejected:<id>:<reason>"`.
- `/regrill <id> <topic>` — re-flags `bd human <id>`, drops prior `plan-approved:` entry, re-enters grill-me on topic.

## See also

- `dsl.md` — frontmatter contract
- `tracer-bullet.md` — what marks the tracer child
- `plan-brief/SKILL.md` — stage-1 owner
- `to-bd-issues/SKILL.md` — stage-2 owner
- `parallel-tickets/SKILL.md` — IN_FLIGHT executor
- `human-flag-discipline.md` — when workers ping vs file `bd human`
