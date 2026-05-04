---
name: dsl
description: Ticket DSL — YAML frontmatter contract for bd ticket bodies. Token-cheap, machine-readable, gate-validated. Replaces verbose EARS-prose templates.
---

# Ticket DSL

Tickets stored in beads with strict YAML frontmatter. Frontmatter = machine-readable contract. Body (below `---`) optional, capped ≤30 lines caveman prose.

## Schema

```yaml
---
id: <prefix>-<slug>            # set by bd on create
parent: <id> | null            # epic id for children
type: epic | task | bug | molecule | decision
priority: 0..3
tracer: true | false           # exactly one per epic graph; child-only
domain: <single dotted path>   # epics only — auth.sso, obs.sentry, ui.foundation
artifact: <single demoable>    # epics only — what "done" looks like
files:                         # tasks: ≥1 path glob
  - src/foo/bar.ts
  - src/foo/bar.test.ts
verify:                        # tasks: ≥1 cmd
  - bun run typecheck
  - bun test src/foo
deps:
  blocks: []
  blocked_by: []
  discovered_from: null
ac:                            # EARS, terse, ≤3
  - "WHEN <event> THE SYSTEM SHALL <response>"
  - "IF <precondition> THEN THE SYSTEM SHALL <response>"
out_of_scope:                  # epics: ≥1 — antidote to bundling
  - <explicit non-goal>
human: false                   # true → parallel-tickets skips, surfaces to user
wave:                          # molecules only — list of lists of child ids
  - [a, b]
  - [c, d]
coordinator: <name>            # molecules only — who/what coordinates
---
<optional caveman-prose body, ≤30 lines>
```

## Limits (gate-enforced)

| Field | Cap |
|-------|-----|
| Epic body | 192 words (~250 tokens) |
| Task body | 115 words (~150 tokens) |
| `ac[]` | ≤3 entries |
| `out_of_scope[]` (epic) | ≥1 entry |
| `tracer: true` per epic graph | exactly 1 |
| `wave[]` (molecule) | ≥1 list |

## Required by type

| Type | Required frontmatter |
|------|---------------------|
| epic (alone) | type, domain, artifact, out_of_scope |
| task | type, files, verify, ac |
| bug | type, files, verify, ac |
| molecule | type, wave, coordinator |

## Why frontmatter not prose

Frontmatter = deterministic parse, ~70% token reduction vs EARS-prose. Body optional. Spec-verifier reads expanded EARS via `expand.mjs` — no skill changes needed.

Sigil-DSL (`@id @ac`) denser but agents drift. JSON noisy with quotes/braces. Frontmatter wins: matches SKILL.md style, JSON Schema validates, body still skim-friendly.

## Token comparison

`tova-qys` epic — 440 tokens EARS-prose. DSL form ≈180 tokens with two children inlined. ~65–80% reduction. `out_of_scope` field forces author to name what's NOT in epic — structural antidote to bundling.

## Caveman ↔ DSL

Caveman = response-time prose compression. DSL = storage-time structured contract. Distinct. Don't conflate. Caveman applies to body prose if present; DSL applies to frontmatter.

## See also

- `tracer-bullet.md` — what counts as tracer
- `plan-brief-flow.md` — two-stage epic creation
- `.beads/ticket-rubric.json` — gate schema
- `templates/bd/dsl/parse.mjs` — frontmatter parser
- `templates/bd/dsl/expand.mjs` — frontmatter → EARS expander
