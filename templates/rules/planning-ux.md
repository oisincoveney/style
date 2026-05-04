---
name: planning-ux
description: How the agent surfaces options after the user states intent. Voice-first, never unilateral, feature-domain-focused.
---

# Planning UX

User states intent for non-trivial work AND no `in_progress` claim → agent present **menu of options**, wait for user pick. Never unilaterally file epic.

## What goes on menu

**Top half — feature-domain options (2–4).**

About **actual problem** user want to solve, not ticket structure. "Let's add OAuth" → options about OAuth (which providers, integration shape, migrate users), not "single ticket vs multi-ticket epic." Structure follow scope; user pick scope.

Agent generate options from request + codebase. Genuinely ambiguous → fewer options + offer `Grill me`.

**Bottom half — process overrides (always present).**

| Option | Action |
|---|---|
| **Grill me** | Invoke `grill-me` skill — interview one question at a time with recommended answers, walk design tree, re-surface fresh menu. |
| **Chat about it** | Informal discussion, no commit to structure. |
| **Just do it** | Skip planning for trivial single-file work. Agent file single bd task, proceed. |
| **Defer** | File `--type=task --defer` bd issue so request stays out of `bd ready` until re-prioritized. No work now. |

## How to render

- **Markdown list default.** Short prose per option, voice-friendly.
- **`AskUserQuestion` tool** when choice small (2–4 mutually-exclusive) AND benefits from chip UI (phone, click sessions). Tool caps each Q at 4 options + auto "Other"; agent picks per context.

## Hard rules

- **Never file epic+children unilaterally.** Two-stage flow: stage-1 epic-alone via `plan-brief` skill, `bd human` flag, halt. Stage-2 children only after `/approve`. See `plan-brief-flow.md`.
- **Never invoke grill-me unilaterally.** Always menu choice. Agent thinks grilling helps → surface `Grill me`, let user pick.
- **Never restructure user intent.** "Add Google OAuth" → menu about Google OAuth (callback URL, session storage, token refresh). NOT about GitHub or Apple unless user opens door.
- **Don't ask "want me to…" followups.** Surface menu or take clear action. No follow-up question.

## When menu does NOT apply

- User has `in_progress` claim, continuing.
- User stated single concrete change ("rename `foo` to `bar`", "fix typo line 42").
- Trivially scoped (one file, one concern, no design decisions).
- User typed slash command — choice made.

These → agent work directly, no menu.

## After choice

- **Feature option** → invoke `plan-brief` skill (stage-1 epic-alone in beads + `bd human` flag + halt). User runs `/approve` after review → stage-2 children via `to-bd-issues`. NEVER `bd create --type=epic` followed by `bd create --graph` in same turn.
- **`Grill me`** → invoke grill-me skill; resolve design tree; re-surface fresh menu (with grilled-shape options).
- **`Chat about it`** → discuss; no bd writes until user moves to structural option.
- **`Just do it`** → `bd create --type=task` with user intent as title; claim; work. (Single-task path skips planning gate.)
- **`Defer`** → `bd create --type=task --defer +<period>` with request as title; report ID; done.
