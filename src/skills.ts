/**
 * Skill registry — maps skill IDs to metadata.
 *
 * "Skills" here means two distinct things:
 * 1. Rule categories — markdown files shipped as `.claude/rules/<id>.md`.
 *    Source lives in `templates/rules/<id>.md`; this file just registers metadata.
 * 2. Existing Claude Code skills from ~/.agents/skills/ to copy project-local.
 */

export type SkillCategory = 'rule' | 'superpower'

export interface RuleSkill {
  id: string
  kind: 'rule'
  name: string
  description: string
  appliesTo: ReadonlyArray<ProjectVariant>
  /** Path (relative to package root) of the `.md` source for this rule. */
  sourceFile: string
}

export interface SuperpowerSkill {
  id: string
  kind: 'superpower'
  name: string
  description: string
  appliesTo: ReadonlyArray<ProjectVariant>
}

export type Skill = RuleSkill | SuperpowerSkill

export type ProjectVariant =
  | 'ts-frontend'
  | 'ts-backend'
  | 'ts-fullstack'
  | 'ts-library'
  | 'ts-monorepo'
  | 'rust-bin'
  | 'rust-lib'
  | 'rust-workspace'
  | 'go-bin'
  | 'go-lib'
  | 'go-workspace'
  | 'swift-app'
  | 'swift-lib'
  | 'swift-package'
  | 'other-app'

const ALL_VARIANTS: ReadonlyArray<ProjectVariant> = [
  'ts-frontend',
  'ts-backend',
  'ts-fullstack',
  'ts-library',
  'ts-monorepo',
  'rust-bin',
  'rust-lib',
  'rust-workspace',
  'go-bin',
  'go-lib',
  'go-workspace',
  'swift-app',
  'swift-lib',
  'swift-package',
  'other-app',
]

const TS_FRONTEND_VARIANTS: ReadonlyArray<ProjectVariant> = ['ts-frontend', 'ts-fullstack']

// Rule-category skills. Source markdown lives in templates/rules/<id>.md and is
// shipped to `.claude/rules/<id>.md` at install time. Frontmatter in the source
// file (paths, description) controls Claude Code's runtime scoping.
export const RULE_SKILLS: ReadonlyArray<RuleSkill> = [
  {
    id: 'code-quality',
    kind: 'rule',
    name: 'Code Quality & Strictness',
    description: 'Strict type systems, no hacks, meaningful names, early returns',
    appliesTo: ALL_VARIANTS,
    sourceFile: 'templates/rules/code-quality.md',
  },
  {
    id: 'architecture',
    kind: 'rule',
    name: 'Architecture (Deep Modules, File Limits)',
    description: 'Ousterhout deep modules, clean architecture layers, file size limits',
    appliesTo: ALL_VARIANTS,
    sourceFile: 'templates/rules/architecture.md',
  },
  {
    id: 'testing',
    kind: 'rule',
    name: 'Testing (TDD)',
    description: 'Test-driven development, co-located tests, property-based testing',
    appliesTo: ALL_VARIANTS,
    sourceFile: 'templates/rules/testing.md',
  },
  {
    id: 'ai-behavior',
    kind: 'rule',
    name: 'AI Behavior & Principles',
    description: 'Uncertainty, no follow-up questions, constraints as hard requirements',
    appliesTo: ALL_VARIANTS,
    sourceFile: 'templates/rules/ai-behavior.md',
  },
  {
    id: 'component-patterns',
    kind: 'rule',
    name: 'Component Patterns',
    description: 'Function components, Props interfaces, no prop drilling, controlled components',
    appliesTo: TS_FRONTEND_VARIANTS,
    sourceFile: 'templates/rules/component-patterns.md',
  },
  {
    id: 'state-management',
    kind: 'rule',
    name: 'State Management',
    description: 'Each component owns its state, framework-appropriate stores, no centralisation',
    appliesTo: TS_FRONTEND_VARIANTS,
    sourceFile: 'templates/rules/state-management.md',
  },
  {
    id: 'styling-ui',
    kind: 'rule',
    name: 'Styling & UI',
    description: 'Tailwind, shadcn primitives, design tokens',
    appliesTo: TS_FRONTEND_VARIANTS,
    sourceFile: 'templates/rules/styling-ui.md',
  },
  {
    id: 'performance',
    kind: 'rule',
    name: 'Performance',
    description: 'Fine-grained subscriptions, stable references, lazy loading',
    appliesTo: ALL_VARIANTS,
    sourceFile: 'templates/rules/performance.md',
  },
  {
    id: 'forms-data',
    kind: 'rule',
    name: 'Forms & Data',
    description: 'Schema validation, typed APIs, i18n-ready strings',
    appliesTo: TS_FRONTEND_VARIANTS,
    sourceFile: 'templates/rules/forms-data.md',
  },
]

// Superpower skills — existing skills in ~/.agents/skills/ to copy into .claude/skills/
export const SUPERPOWER_SKILLS: ReadonlyArray<SuperpowerSkill> = [
  {
    id: 'using-superpowers',
    kind: 'superpower',
    name: 'using-superpowers',
    description: 'Meta-skill that forces Claude to invoke relevant skills',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'debug',
    kind: 'superpower',
    name: 'debug',
    description: 'Structured debugging session',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'code-review',
    kind: 'superpower',
    name: 'code-review',
    description: 'Security, performance, correctness review',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'architecture',
    kind: 'superpower',
    name: 'architecture',
    description: 'Architecture decision records',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'system-design',
    kind: 'superpower',
    name: 'system-design',
    description: 'Services, APIs, data modeling',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'testing-strategy',
    kind: 'superpower',
    name: 'testing-strategy',
    description: 'Test plans and approaches',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'tech-debt',
    kind: 'superpower',
    name: 'tech-debt',
    description: 'Identify, categorize, prioritize tech debt',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'deploy-checklist',
    kind: 'superpower',
    name: 'deploy-checklist',
    description: 'Pre-deployment verification',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'documentation',
    kind: 'superpower',
    name: 'documentation',
    description: 'Technical documentation',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'write-spec',
    kind: 'superpower',
    name: 'write-spec',
    description: 'Feature specs and PRDs',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'product-brainstorming',
    kind: 'superpower',
    name: 'product-brainstorming',
    description: 'Product ideation',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'sprint-planning',
    kind: 'superpower',
    name: 'sprint-planning',
    description: 'Sprint scoping',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'incident-response',
    kind: 'superpower',
    name: 'incident-response',
    description: 'When things break',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'runbook',
    kind: 'superpower',
    name: 'runbook',
    description: 'Operational runbooks',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'find-skills',
    kind: 'superpower',
    name: 'find-skills',
    description: 'Discover more skills',
    appliesTo: ALL_VARIANTS,
  },
  {
    id: 'frontend-design',
    kind: 'superpower',
    name: 'frontend-design',
    description: 'Production-grade UI',
    appliesTo: TS_FRONTEND_VARIANTS,
  },
  {
    id: 'design-system',
    kind: 'superpower',
    name: 'design-system',
    description: 'Audit/extend design system',
    appliesTo: TS_FRONTEND_VARIANTS,
  },
  {
    id: 'design-critique',
    kind: 'superpower',
    name: 'design-critique',
    description: 'Usability feedback',
    appliesTo: TS_FRONTEND_VARIANTS,
  },
  {
    id: 'accessibility-review',
    kind: 'superpower',
    name: 'accessibility-review',
    description: 'WCAG audit',
    appliesTo: TS_FRONTEND_VARIANTS,
  },
  {
    id: 'ux-copy',
    kind: 'superpower',
    name: 'ux-copy',
    description: 'Microcopy and error messages',
    appliesTo: TS_FRONTEND_VARIANTS,
  },
  {
    id: 'vercel-react-best-practices',
    kind: 'superpower',
    name: 'vercel-react-best-practices',
    description: 'React/Next.js performance',
    appliesTo: TS_FRONTEND_VARIANTS,
  },
  {
    id: 'sql-queries',
    kind: 'superpower',
    name: 'sql-queries',
    description: 'SQL across warehouses',
    appliesTo: ['ts-backend', 'ts-fullstack', 'rust-bin', 'go-bin'],
  },
]

export const ALL_SKILLS: ReadonlyArray<Skill> = [...RULE_SKILLS, ...SUPERPOWER_SKILLS]

export function skillsForVariant(variant: ProjectVariant): ReadonlyArray<Skill> {
  return ALL_SKILLS.filter((skill) => skill.appliesTo.includes(variant))
}

export function ruleSkillsForVariant(variant: ProjectVariant): ReadonlyArray<RuleSkill> {
  return RULE_SKILLS.filter((skill) => skill.appliesTo.includes(variant))
}

export function superpowerSkillsForVariant(
  variant: ProjectVariant,
): ReadonlyArray<SuperpowerSkill> {
  return SUPERPOWER_SKILLS.filter((skill) => skill.appliesTo.includes(variant))
}
