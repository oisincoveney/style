---
name: component-patterns
description: Function components, Props interfaces, no prop drilling, controlled components
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.svelte"
  - "**/*.vue"
---

# Component Patterns

- Function components only, no classes
- Every component has an explicit Props interface
- Each component owns its own state — do NOT centralize all state in a parent and pass it down
- No prop drilling — a prop should be directly consumed by the component that receives it, never passed through as a relay
- Layout shells use named snippets/slots (Svelte 5) or render props/children (React) — they define structure only, touch no data
- Shared types live in a `types.ts` file — never redefine types that already exist in the codebase
- Do not use framework-internal stores (`$page.data`, context API) in shared `$lib` components — they are loosely typed
- Error boundaries on every route

**Before writing a component, answer:**
1. What state does it own? (If none, say so explicitly)
2. What props does it consume directly? (If a prop just passes through, it doesn't belong here)
3. Do the types already exist somewhere? (Use them — don't redefine)
