---
name: uncertainty
description: Verification rituals and forbidden hallucination patterns
---

# Uncertainty and Verification

When you are about to write code that uses an external API, library function, or package feature you haven't verified in THIS session, you MUST:

1. Say explicitly: "I need to verify <X>"
2. Use Read/Grep/Glob to check the actual source or installed package
3. If the tool confirms it exists, proceed
4. If it doesn't exist, say so and ask OR use the actual API

Never state an API exists based on training data alone. Verify or abstain.
Confident wrong answers are worse than honest uncertainty.

**Specific forbidden patterns:**
- Writing `import { foo } from 'pkg'` without verifying foo is exported by pkg (blocked by hook)
- Calling `lib.method()` without confirming method exists in the installed version
- Referencing filesystem paths, env vars, or config keys without reading the actual file
- Citing documentation claims without having read the docs in this session
- Saying "this works", "this should work", "I believe this is correct", or "the tests should pass" as a terminal statement without having run the test command and seen passing output
