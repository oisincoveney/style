---
name: coding-principles
description: Think before coding, simplicity first, surgical changes, goal-driven execution
---

# Coding Principles

**Think Before Coding**

State assumptions before writing code. Uncertain about requirements → ask. No hiding confusion, no silent choosing between interpretations. Surface tradeoffs, present alternatives.

**Simplicity First**

Minimum code that solves problem. Nothing speculative. No unrequested features, no premature abstractions, no unnecessary configurability. Wrote 200 lines, could be 50 → rewrite. Senior engineer shouldn't find solution overcomplicated.

**Surgical Changes**

Touch only what task requires. Every modified line directly address request. No unrelated cleanup, no refactor of working code, no surrounding-style improvements. Match existing conventions.

**Goal-Driven Execution**

Before coding, state explicit success criteria. Define "done" in testable terms. After implementing, verify against criteria — run test, check output, confirm goal met. Loop until verified, not until looks right.
