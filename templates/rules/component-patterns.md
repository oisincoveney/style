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

- Function components only, no classes.
- Every component has explicit Props interface.
- Each component owns own state. No centralizing all state in parent + passing down.
- No prop drilling. Prop directly consumed by receiver, never relay.
- Layout shells use named snippets/slots (Svelte 5) or render props/children (React) — structure only, no data touch.
- Shared types in `types.ts`. Never redefine types already in codebase.
- No framework-internal stores (`$page.data`, context API) in shared `$lib` components — loosely typed.
- Error boundaries on every route.

**Before writing component, answer:**
1. What state owns? (None → say so explicitly)
2. What props consumed directly? (Pass-through prop → doesn't belong here)
3. Types already exist? (Use them, no redefine)
