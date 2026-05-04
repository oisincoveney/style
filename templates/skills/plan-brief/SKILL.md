---
name: plan-brief
description: Stage-1 of planning gate. Files epic-alone in beads with user-facing brief in DSL form, flags `bd human <id>`, halts. User reviews via `bd show <id>` + runs /approve. Stage-2 (children fan-out) gated on dismiss + body-hash.
---

# Plan Brief (stage-1, two-stage approval)

Owns planner→user-review boundary. Drafts brief, files epic, flags review, halts. Stage-2 (child fan-out via `to-bd-issues`) runs only after `/approve`.

## When to invoke

After `grill-me` resolves OR user picks feature option from planning menu. Skip for trivial single-file work.

**Refuse if:**
- Conversation has unresolved `[NEEDS CLARIFICATION: ...]`.
- User still in chat/discussion mode, no structural pick.

## Steps

### 1. Draft DSL frontmatter

```yaml
---
type: epic
priority: <0..3>
domain: <single dotted path>          # auth.sso
artifact: <single demoable output>     # "Auth0 universal-login replaces password form"
out_of_scope:                          # ≥1 — declare what NOT doing
  - <thing>
ac:                                    # 5–7 user-facing criteria, plain English (NOT EARS)
  - "<criterion>"
estimated_tokens: <int>
estimated_wall_clock: "<range>"        # "25-35min fan-out (3 workers)"
parallel_safe: <true|false>
---
```

Body cap: epic ≤192 words (~250 tokens). Gate enforces.

### 2. Body — user-facing brief

```markdown
## Goal
<one sentence>

## Children sketch (created on /approve)
- a (tracer<, HITL>): <slice>
- b: <slice> (depends on a)
- ...

## Risks
- <risk>
```

User reads <60s. Per-child detail (files, verify, ac, deps) lives in children at stage 2 — NOT in brief.

### 3. File epic ALONE

```bash
bd create --type=epic --priority=<P> --title="<title>" --silent --body-file=- <<'EOF'
<frontmatter + body>
EOF
```

Capture id. `bd-create-gate.sh` validates against epic-alone rubric (domain, artifact, out_of_scope, token budget). Failure → fix brief, retry. Don't `--gate-bypass`.

### 4. Flag review

```bash
bd human <epic-id> --reason="plan-review"
```

Triggers user gate. Until `/approve` (or `/reject`/`/regrill`) dismisses, `plan-approval-guard.sh` blocks `bd create --graph --parent=<id>` + `bd swarm create <id>`.

### 5. Surface + HALT

Print:

```
Plan filed as epic <id>. Review:
  bd show <id>

Approve:
  /approve <id>          (locks brief, unlocks children)
  /reject <id> <reason>  (kill plan)
  /regrill <id> <topic>  (revise via grill-me)
```

**Stop.** Don't proceed stage-2. Don't call `to-bd-issues`. User's slash command unlocks next stage.

## Forbidden

- DON'T `bd create --graph --parent=<id>` from this skill — stage 2, gated separately.
- DON'T `bd update <id> --claim` on epic.
- DON'T draft children's full DSL (files, verify, ac, deps) yet. Only sketch in brief.
- DON'T write brief to `.claude/plans/` or any disk markdown. Brief lives in beads.
- DON'T set `tracer: true` on epic — child-only field.
- DON'T edit epic body post-flag without `/regrill`. Hash binding catches on next gate hit; conventionally wrong anyway.

## After /approve

User types `/approve <epic-id>`. Slash command:
1. Reads current epic body, sha256.
2. Writes `bd remember "plan-approved:<id>:<sha>"` (env-var marker; `bd-remember-protect.sh` allows).
3. Runs `bd human dismiss <id> --reason="approved by user"`.

Stage-2 unlocks: invoke `to-bd-issues` for child fan-out via `bd create --graph --parent=<id>`. `bd-create-gate.sh` validates children DSL against full rubric (tracer, files, verify, ac, domain coherence, token budgets).
