---
name: styling-ui
description: Tailwind, shadcn primitives, design tokens
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.svelte"
  - "**/*.vue"
  - "**/*.css"
---

# Styling & UI

- Use shadcn/ui primitives with defaults. Override only when required.
- No arbitrary Tailwind values (`w-[347px]`) — use theme tokens.
- No color-specific classes (`bg-blue-500`) — use design tokens (`bg-primary`).
- No inline styles (`style={{}}`) — use Tailwind.
- No className concatenation — use `cn()` or `clsx()`.
- No className soup: 1-3 utility classes/element, not 20+.
- No empty `<div>` or `<span>`.
- Semantic HTML everywhere.
