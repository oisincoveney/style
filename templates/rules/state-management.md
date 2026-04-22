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

- Each component owns the state it is responsible for — do not hoist state to a parent unless two siblings genuinely need to share it
- When siblings must share reactive state, use the framework's appropriate primitive (Svelte 5 `$state` in a `.svelte.ts` module; Jotai atoms in React) — not a fat parent component
- Simple local UI state (open/closed, hover, loading) lives in the component that controls it
- Feature-scoped shared state lives in co-located store files (`feature/store/`)
- Cross-feature communication via shared atoms or events, not prop chains
