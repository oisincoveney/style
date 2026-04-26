import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DevConfig } from '../config.js'
import { installAll } from '../install.js'
import type { Answers } from '../prompts.js'
import { RULE_SKILLS } from '../skills.js'

const fakeAnswers: Answers = {
  language: 'rust',
  variant: 'rust-bin',
  framework: null,
  packageManager: 'cargo',
  commands: {
    dev: 'cargo run',
    build: 'cargo build --release',
    test: 'cargo test',
    typecheck: 'cargo check',
    lint: 'cargo clippy --all-targets -- -D warnings',
    format: 'cargo fmt',
  },
  skills: ['code-quality', 'architecture', 'testing', 'ai-behavior', 'performance'],
  tools: ['beads', 'contract-driven'],
  workflow: 'idd',
  contractDriven: true,
  targets: ['claude', 'codex', 'opencode', 'cursor', 'lefthook'],
  mcpServers: ['memory', 'serena'],
  models: {
    default: 'claude-sonnet-4-6',
    planning: 'claude-opus-4-6',
    simple_edits: 'claude-haiku-4-5-20251001',
    review: 'claude-opus-4-6',
  },
}

const fakeConfig: DevConfig = {
  language: fakeAnswers.language,
  variant: fakeAnswers.variant,
  framework: fakeAnswers.framework,
  packageManager: fakeAnswers.packageManager,
  commands: fakeAnswers.commands,
  skills: fakeAnswers.skills,
  tools: fakeAnswers.tools,
  workflow: fakeAnswers.workflow,
  contractDriven: fakeAnswers.contractDriven,
  targets: fakeAnswers.targets,
}

describe('installAll', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dev-test-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('writes all expected files for a Rust project', async () => {
    await installAll(dir, fakeConfig, fakeAnswers, { skipSideEffects: true })

    // Hooks copied
    expect(existsSync(join(dir, '.claude/hooks/destructive-command-guard.sh'))).toBe(true)
    expect(existsSync(join(dir, '.claude/hooks/import-validator.sh'))).toBe(true)
    expect(existsSync(join(dir, '.claude/hooks/post-edit-check.sh'))).toBe(true)
    expect(existsSync(join(dir, '.claude/hooks/block-todowrite.sh'))).toBe(true)

    // Settings
    expect(existsSync(join(dir, '.claude/settings.json'))).toBe(true)
    expect(existsSync(join(dir, '.codex/hooks.json'))).toBe(true)
    expect(existsSync(join(dir, '.codex/hooks/destructive-command-guard.sh'))).toBe(true)

    // Cursor rules — one per selected skill
    for (const id of fakeConfig.skills) {
      if (RULE_SKILLS.some((s) => s.id === id)) {
        expect(existsSync(join(dir, `.cursor/rules/${id}.mdc`))).toBe(true)
      }
    }

    // OpenCode plugin
    expect(existsSync(join(dir, '.opencode/plugins/dev-enforcer.ts'))).toBe(true)

    // Lefthook
    expect(existsSync(join(dir, 'lefthook.yml'))).toBe(true)

    // Rust lint configs
    expect(existsSync(join(dir, 'clippy.toml'))).toBe(true)
    expect(existsSync(join(dir, 'rustfmt.toml'))).toBe(true)

    // Tool configs
    expect(existsSync(join(dir, '.semgrep.yml'))).toBe(true)
    expect(existsSync(join(dir, 'commitlint.config.cjs'))).toBe(false)
    expect(existsSync(join(dir, '.cargo-mutants.toml'))).toBe(true)

    // No project scaffolding — install never writes example code
    expect(existsSync(join(dir, 'src/example/mod.rs'))).toBe(false)
    expect(existsSync(join(dir, 'tests/property_example.rs'))).toBe(false)
    expect(existsSync(join(dir, 'src/logging.rs'))).toBe(false)

    // CLAUDE.md + AGENTS.md
    expect(existsSync(join(dir, 'CLAUDE.md'))).toBe(true)
    expect(existsSync(join(dir, 'AGENTS.md'))).toBe(true)
  })

  it('settings.json has valid JSON and correct structure', async () => {
    await installAll(dir, fakeConfig, fakeAnswers, { skipSideEffects: true })
    const raw = readFileSync(join(dir, '.claude/settings.json'), 'utf8')
    const parsed = JSON.parse(raw) as {
      hooks: Record<string, unknown>
      permissions: { rules: unknown[] }
    }
    expect(parsed.hooks.PreToolUse).toBeDefined()
    expect(parsed.permissions.rules.length).toBeGreaterThan(0)
  })

  it('commands are written to .claude/rules/commands.md; CLAUDE.md stays a kernel', async () => {
    await installAll(dir, fakeConfig, fakeAnswers, { skipSideEffects: true })
    const root = readFileSync(join(dir, 'CLAUDE.md'), 'utf8')
    expect(root).not.toContain('@.claude/docs/')
    expect(root).toContain('.claude/rules/')
    expect(root.split('\n').length).toBeLessThan(50)

    const commands = readFileSync(join(dir, '.claude/rules/commands.md'), 'utf8')
    expect(commands).toContain('cargo run')
    expect(commands).toContain('cargo clippy')
    expect(commands).toMatch(/^---\nname: commands/)
  })

  it('installs the policies skill and slash commands', async () => {
    await installAll(dir, fakeConfig, fakeAnswers, { skipSideEffects: true })

    // Owned skill copied regardless of superpower selection
    const policies = readFileSync(join(dir, '.claude/skills/policies/SKILL.md'), 'utf8')
    expect(policies).toContain('name: policies')
    expect(policies).toContain('user-invocable: false')
    expect(policies).toContain('Destructive Operations')

    // /verify command references the configured commands
    const verify = readFileSync(join(dir, '.claude/commands/verify.md'), 'utf8')
    expect(verify).toContain(fakeConfig.commands.typecheck)
    expect(verify).toContain(fakeConfig.commands.test)
    expect(verify).toContain('disable-model-invocation: true')

    // /ready and /epic commands exist when beads is enabled
    expect(existsSync(join(dir, '.claude/commands/ready.md'))).toBe(true)
    expect(existsSync(join(dir, '.claude/commands/epic.md'))).toBe(true)
    // /spec is the legacy command — replaced by /epic when beads is enabled
    expect(existsSync(join(dir, '.claude/commands/spec.md'))).toBe(false)

    // Hook file for statusLine copied
    expect(existsSync(join(dir, '.claude/hooks/statusline.sh'))).toBe(true)
  })

  it('rule files with paths frontmatter land in .claude/rules/ when the skill is selected', async () => {
    const frontendAnswers: Answers = {
      ...fakeAnswers,
      language: 'typescript',
      variant: 'ts-frontend',
      framework: 'react',
      packageManager: 'bun',
      skills: [
        'code-quality',
        'architecture',
        'testing',
        'ai-behavior',
        'component-patterns',
        'styling-ui',
      ],
    }
    const frontendConfig: DevConfig = {
      language: 'typescript',
      variant: 'ts-frontend',
      framework: 'react',
      packageManager: 'bun',
      commands: frontendAnswers.commands,
      skills: frontendAnswers.skills,
      tools: frontendAnswers.tools,
      workflow: frontendAnswers.workflow,
      contractDriven: frontendAnswers.contractDriven,
      targets: frontendAnswers.targets,
    }
    await installAll(dir, frontendConfig, frontendAnswers, { skipSideEffects: true })

    const componentRule = readFileSync(join(dir, '.claude/rules/component-patterns.md'), 'utf8')
    expect(componentRule).toContain('paths:')
    expect(componentRule).toContain('"**/*.tsx"')

    const codeQuality = readFileSync(join(dir, '.claude/rules/code-quality.md'), 'utf8')
    expect(codeQuality).not.toContain('paths:')
    expect(codeQuality).toContain('name: code-quality')
  })

  it('merges into existing CLAUDE.md without wiping user content', async () => {
    const { writeFileSync } = await import('node:fs')
    const existing = '# My existing notes\n\nSome important context I wrote.\n'
    writeFileSync(join(dir, 'CLAUDE.md'), existing)

    await installAll(dir, fakeConfig, fakeAnswers, { skipSideEffects: true })

    const merged = readFileSync(join(dir, 'CLAUDE.md'), 'utf8')
    expect(merged).toContain('My existing notes')
    expect(merged).toContain('Some important context')
    expect(merged).toContain('BEGIN @oisincoveney/dev managed block')
  })

  it('rewrites managed block on re-run without duplicating', async () => {
    const { writeFileSync } = await import('node:fs')
    // First install
    await installAll(dir, fakeConfig, fakeAnswers, { skipSideEffects: true })
    const first = readFileSync(join(dir, 'CLAUDE.md'), 'utf8')

    // Modify content outside managed block
    writeFileSync(
      join(dir, 'CLAUDE.md'),
      `${first}\n\n## My extra section\n\nUser-added content.`,
    )

    // Re-run
    await installAll(dir, fakeConfig, fakeAnswers, { skipSideEffects: true })
    const second = readFileSync(join(dir, 'CLAUDE.md'), 'utf8')

    // Managed block should appear exactly once
    const matches = second.match(/BEGIN @oisincoveney\/dev/g)
    expect(matches?.length).toBe(1)
    // User-added content preserved
    expect(second).toContain('My extra section')
  })

  it('backs up existing lint configs before overwriting', async () => {
    const { writeFileSync } = await import('node:fs')
    const customClippy = '# my custom clippy config\ncognitive-complexity-threshold = 999\n'
    writeFileSync(join(dir, 'clippy.toml'), customClippy)

    await installAll(dir, fakeConfig, fakeAnswers, { skipSideEffects: true })

    expect(existsSync(join(dir, 'clippy.toml.dev-backup'))).toBe(true)
    const backup = readFileSync(join(dir, 'clippy.toml.dev-backup'), 'utf8')
    expect(backup).toBe(customClippy)
  })

  it('writes correct files for a swift-app project (Pinny-style)', async () => {
    const swiftAnswers: Answers = {
      language: 'swift',
      variant: 'swift-app',
      framework: 'swiftui',
      packageManager: 'swift',
      commands: {
        dev: '',
        build: 'xcodebuild build',
        test: 'xcodebuild test',
        typecheck: 'xcodebuild build',
        lint: 'swiftlint lint',
        format: 'swiftformat .',
      },
      skills: ['code-quality', 'architecture', 'testing', 'ai-behavior', 'performance'],
      tools: ['beads'],
      workflow: 'idd',
      contractDriven: false,
      targets: ['claude', 'codex', 'opencode', 'cursor', 'lefthook'],
      mcpServers: [],
      models: {
        default: 'claude-sonnet-4-6',
        planning: 'claude-opus-4-6',
        simple_edits: 'claude-haiku-4-5-20251001',
        review: 'claude-opus-4-6',
      },
    }
    const swiftConfig: DevConfig = {
      language: swiftAnswers.language,
      variant: swiftAnswers.variant,
      framework: swiftAnswers.framework,
      packageManager: swiftAnswers.packageManager,
      commands: swiftAnswers.commands,
      skills: swiftAnswers.skills,
      tools: swiftAnswers.tools,
      workflow: swiftAnswers.workflow,
      contractDriven: swiftAnswers.contractDriven,
      targets: swiftAnswers.targets,
    }

    await installAll(dir, swiftConfig, swiftAnswers, { skipSideEffects: true })

    // Core hooks and settings present
    expect(existsSync(join(dir, '.claude/hooks/destructive-command-guard.sh'))).toBe(true)
    expect(existsSync(join(dir, '.claude/hooks/tdd-guard.sh'))).toBe(true)
    expect(existsSync(join(dir, '.claude/settings.json'))).toBe(true)

    // Lefthook generated with no ts-style-guard
    expect(existsSync(join(dir, 'lefthook.yml'))).toBe(true)
    const lefthook = readFileSync(join(dir, 'lefthook.yml'), 'utf8')
    expect(lefthook).not.toContain('ts-style-guard')
    expect(lefthook).toContain('xcodebuild test')
    expect(lefthook).toContain('swiftlint lint')

    // No TS-specific lint configs
    expect(existsSync(join(dir, 'tsconfig.strict.json'))).toBe(false)
    expect(existsSync(join(dir, 'clippy.toml'))).toBe(false)

    // Cursor rules use swift glob
    const codeQuality = readFileSync(join(dir, '.cursor/rules/code-quality.mdc'), 'utf8')
    expect(codeQuality).toContain('**/*.swift')

    // No scaffolding for swift-app — Xcode project structure is opaque
    expect(existsSync(join(dir, 'Sources/Example/Example.swift'))).toBe(false)
    expect(existsSync(join(dir, 'Tests/PropertyExampleTests/PropertyExampleTests.swift'))).toBe(false)
    expect(existsSync(join(dir, 'Sources/Logging/Logging.swift'))).toBe(false)

    // Commands written to the new rules dir
    const commands = readFileSync(join(dir, '.claude/rules/commands.md'), 'utf8')
    expect(commands).toContain('xcodebuild build')
    expect(commands).toContain('swiftlint lint')

    // CLAUDE.md is the new kernel — no @imports
    const claude = readFileSync(join(dir, 'CLAUDE.md'), 'utf8')
    expect(claude).not.toContain('@.claude/docs/')
    expect(claude).toContain('.claude/rules/')
  })

  it('does not create .cursor or .codex when not in targets', async () => {
    const minimal: DevConfig = {
      ...fakeConfig,
      targets: ['claude'],
    }
    await installAll(dir, minimal, fakeAnswers, { skipSideEffects: true })
    expect(existsSync(join(dir, '.cursor'))).toBe(false)
    expect(existsSync(join(dir, '.codex'))).toBe(false)
    expect(existsSync(join(dir, '.claude'))).toBe(true)
  })

  describe('with all commands null (other-app path)', () => {
    const otherConfig: DevConfig = {
      ...fakeConfig,
      language: 'other',
      variant: 'other-app',
      packageManager: 'other',
      commands: {
        dev: null,
        build: null,
        test: null,
        typecheck: null,
        lint: null,
        format: null,
      },
    }
    const otherAnswers: Answers = {
      ...fakeAnswers,
      language: 'other',
      variant: 'other-app',
      packageManager: 'other',
      commands: otherConfig.commands,
    }

    it('commands.md emits the "not set yet" stub', async () => {
      await installAll(dir, otherConfig, otherAnswers, { skipSideEffects: true })
      const commands = readFileSync(join(dir, '.claude/rules/commands.md'), 'utf8')
      expect(commands).toContain('Commands are not set yet')
      expect(commands).toContain('oisin-dev set-commands')
      expect(commands).not.toMatch(/^dev:\s*$/m)
      expect(commands).not.toMatch(/^test:\s*$/m)
    })

    it('lefthook.yml has no empty `run:` lines and omits command-dependent steps', async () => {
      await installAll(dir, otherConfig, otherAnswers, { skipSideEffects: true })
      const lefthook = readFileSync(join(dir, 'lefthook.yml'), 'utf8')
      expect(lefthook).not.toMatch(/^\s*run:\s*$/m)
      expect(lefthook).not.toContain('run: \n')
      expect(lefthook).not.toMatch(/typecheck:\s*\n\s*run:\s*\n/)
      expect(lefthook).not.toMatch(/lint:\s*\n\s*run:\s*\n/)
      expect(lefthook).not.toMatch(/^\s{4}test:\s*\n\s*run:\s*\n/m)
      expect(lefthook).toContain('tdd-guard')
      expect(lefthook).toContain('pr-size-check')
      expect(lefthook).toContain('conventional-commits')
    })

    it('claude settings Bash allow rule has no empty alternatives', async () => {
      await installAll(dir, otherConfig, otherAnswers, { skipSideEffects: true })
      const raw = readFileSync(join(dir, '.claude/settings.json'), 'utf8')
      const parsed = JSON.parse(raw) as {
        permissions: { rules: Array<{ tool: string; decision: string; if?: string }> }
      }
      const allowRules = parsed.permissions.rules.filter(
        (r) => r.tool === 'Bash' && r.decision === 'allow' && r.if !== undefined,
      )
      for (const rule of allowRules) {
        expect(rule.if).not.toMatch(/\|\|/)
        expect(rule.if).not.toMatch(/\(\|/)
        expect(rule.if).not.toMatch(/\|\)/)
      }
      const verificationRule = allowRules.find((r) => r.if?.includes('git status'))
      expect(verificationRule).toBeDefined()
      expect(verificationRule?.if).toBe('Bash(git status|git diff|git log|bd *)')
    })
  })
})
