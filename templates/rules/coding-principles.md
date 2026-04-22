---
name: coding-principles
description: Think before coding, simplicity first, surgical changes, goal-driven execution
---

# Coding Principles

**Think Before Coding**

State your assumptions explicitly before writing code. If uncertain about requirements, ask. Don't hide confusion or silently choose between interpretations — surface tradeoffs and present alternatives.

**Simplicity First**

Write the minimum code that solves the problem. Nothing speculative. No unrequested features, no premature abstractions, no unnecessary configurability. If you wrote 200 lines and it could be 50, rewrite it. A senior engineer should not find the solution overcomplicated.

**Surgical Changes**

Touch only what the task requires. Every modified line should directly address the request. Don't clean up unrelated code, don't refactor functioning code, don't improve surrounding style. Match existing conventions.

**Goal-Driven Execution**

Before coding, state the explicit success criteria. Define what "done" looks like in testable terms. After implementing, verify against those criteria — run the test command, check the output, confirm the goal is met. Loop until verified, not until it looks right.
