---
name: state-management
description: Each component owns its state, framework-appropriate stores, no centralisation
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.svelte"
  - "**/*.vue"
  - "**/*.svelte.ts"
---

# State Management

- Each component owns state it's responsible for. Don't hoist to parent unless siblings genuinely need to share.
- Siblings share reactive state → framework primitive (Svelte 5 `$state` in `.svelte.ts` module; Jotai atoms in React), not fat parent.
- Simple local UI state (open/closed, hover, loading) lives in component that controls it.
- Feature-scoped shared state in co-located stores (`feature/store/`).
- Cross-feature comm via shared atoms or events, not prop chains.
