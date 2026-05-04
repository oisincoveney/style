---
name: parallel-tickets
description: Orchestrate parallel sub-agents in isolated git worktrees, one per ready-front ticket in an active swarm. Use only when the user explicitly opts in (menu choice "fan out") AND the swarm has ≥2 ready fronts. Capped at 3 concurrent.
---

# Parallel Tickets (worktree fan-out)

Orchestrates **parallel sub-agents**, each scoped to a single bd ticket, each in own git worktree. Use only when:

1. User explicitly opted in via planning-menu choice ("fan out").
2. Active swarm has **≥2 ready fronts** (per `bd swarm validate <epic-id>`).
3. Tickets AFK-safe (no shared state, no port conflicts, no cross-ticket coordination).

Any false → serial work.

## Cap: 3 concurrent

Hard cap 3 parallel sub-agents. Token cost ~15× serial per [research](https://github.com/spillwavesolutions/parallel-worktrees). IDE / file watcher / dep-install overhead spikes past 3.

## Orchestration

### 1. Confirm swarm registered

```bash
bd swarm validate <epic-id>
```

Validation fails (cycles, orphans) → halt, surface to user. Don't fan out invalid graph.

### 2. Pick ready fronts

```bash
bd ready --json --mol <epic-id>
```

Up to 3 ticket IDs. Each unblocked AND not in_progress AND not claimed by another worker.

### 3. Spawn sub-agent per ticket

For each ticket ID, spawn `Agent` with:

- `subagent_type: "general-purpose"`
- `isolation: "worktree"` (creates `.claude/worktrees/<auto-name>/` branched from `origin/HEAD`)
- **Self-contained prompt** (sub-agent functions without orchestrator context)

Sub-agent prompt MUST include verbatim:

```
You are single-ticket worker. Re-read everything from bd. Don't trust any
context from caller.

═══════════════════════════════════════════════════════════════════════════
HARD CONSTRAINTS — enforced by harness hooks; can't bypass.
═══════════════════════════════════════════════════════════════════════════
- Running inside git worktree under .claude/worktrees/<name>/.
  worktree-write-guard.sh PreToolUse hook BLOCKS Write/Edit whose absolute
  path escapes worktree root. Use relative paths, or rebuild absolute paths
  against $WORKTREE_ROOT.
- worktree-stop-guard.sh Stop hook BLOCKS stop if uncommitted changes,
  unpushed commits, or in_progress bd ticket on this branch. Can't exit
  until steps 7-10 done.
- Verifier's "## Result: PASS" markdown NOT your return value. Steps 7-10
  still run after Skill returns.

Steps:
0. pwd → capture as $WORKTREE_ROOT. Assert contains "/.claude/worktrees/".
   If not, return "<id>: FAIL — not in worktree" and stop.
1. bd update <id> --claim          (claim ticket; idempotent)
2. bd show <id>                    (verify status==in_progress AND assignee
   matches; else return "<id>: FAIL — claim didn't stick" and stop.
   Extract EARS criteria + Files Likely Touched + Verification Commands.)
3. Implement end-to-end. TDD per project rules: failing test first. ALL
   writes stay under $WORKTREE_ROOT.
4. Run every command in ## Verification Commands. All must exit 0.
5. Skill({ skill: "spec-verifier", args: "<id> --worktree=$WORKTREE_ROOT" }).
   Pass exactly skill name "spec-verifier" — NOT code-review,
   security-review, sibling.
6. CRITICAL: Verifier returned "## Result: …" markdown block. NOT YOUR
   RETURN VALUE. Parse "## Result:" line, continue. Don't summarise. Don't
   stop. Four steps left.
7. Branch on verifier result:
   - PASS / PASS-WITH-FOLLOWUPS: bd close <id> --reason "verified by spec-verifier".
   - PARTIAL / FAIL: don't close, don't commit, jump to step 10 with failure summary.
8. Commit with `feat(<id>): <subject>` (or fix:/refactor:/etc.) — lefthook
   commit-msg enforces format. Commit inside $WORKTREE_ROOT.
9. git push -u origin HEAD. Branch is sandbox; pushing it = completing
   ticket.
10. Return one-line status: "<id>: PASS | FAIL | PARTIAL — <message>".
    This is ONLY return value.

Forbidden:
- Editing files outside Files Likely Touched (file discovered-from ticket).
- Editing files outside $WORKTREE_ROOT — worktree-write-guard.sh blocks.
- Closing ticket without verifier PASS / PASS-WITH-FOLLOWUPS.
- Treating verifier output as return value. It isn't.
- `git push --force` / `--force-with-lease` without explicit user auth on
  this branch.
- Pushing to `main` / `master` directly. Worker pushes only own ticket
  branch.
- Merging or opening PR. Merging is user's call.
```

### 4. Failure isolation

Sub-agent returns FAIL/PARTIAL → capture message, DON'T auto-abort siblings. Siblings finish independently. Report aggregate at end:

```
Fan-out summary (N tickets):
  ✓ <id>: PASS — <subject>
  ✓ <id>: PASS-WITH-FOLLOWUPS (filed M discovered-from)
  ✗ <id>: FAIL — <reason>
```

User decides on failures (re-claim, fix manually, escalate).

### 5. Worktree cleanup

`isolation: worktree` auto-cleans worktrees with no commits. Worktrees with commits stay until user manually `git worktree remove`s — intentional, work sits on branch waiting for review.

## When NOT to fan out

- Swarm has only 1 ready front. Serial.
- Tickets share state (database, config, generated files). Worktrees won't help; merge conflicts.
- Tests can't run in parallel (bind to fixed port). Serial.
- Orchestrator context already heavy. Each sub-agent needs own context budget; deep already → cost compounds.

## Integration with planning menu

User picks "fan out" in planning menu → trigger this skill. Skill picks up. User doesn't need to know worktree mechanics — agent handles spawn, isolate, verify, close, summarize.

## Forbidden

- DON'T spawn >3 sub-agents concurrently. >3 ready fronts → waves of 3.
- DON'T spawn recursively. Sub-agents can't spawn sub-agents.
- DON'T commit or push from orchestrator. Orchestrator sits on parent (often `main`); sub-agents commit + push own ticket branches from inside worktrees.
- DON'T auto-merge sub-agent branches. Merging is user's call.
