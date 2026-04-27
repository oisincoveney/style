import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { DevConfig } from '../config.js'
import { readConfig, writeConfig } from '../config.js'

const baseConfig: DevConfig = {
  language: 'typescript',
  variant: 'ts-library',
  framework: null,
  packageManager: 'bun',
  commands: {
    dev: 'bun run test:watch',
    build: 'bun run build',
    test: 'bun test',
    typecheck: 'tsc --noEmit',
    lint: 'echo "no lint configured"',
    format: 'echo "no format configured"',
  },
  skills: ['code-quality'],
  tools: [],
  workflow: 'none',
  contractDriven: false,
  targets: ['claude'],
}

describe('readConfig — workflow deprecation coercion', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'config-test-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  it('coerces legacy workflow="idd" to "none" with a deprecation warning', () => {
    writeFileSync(
      join(dir, '.dev.config.json'),
      JSON.stringify({ ...baseConfig, workflow: 'idd' }, null, 2),
    )
    const warnings: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
    try {
      const loaded = readConfig(dir)
      expect(loaded?.workflow).toBe('none')
      expect(warnings.some((w) => w.includes('Deprecation') && w.includes('idd'))).toBe(true)
    } finally {
      console.warn = orig
    }
  })

  it('coerces legacy workflow="gsd" to "none" with a deprecation warning', () => {
    writeFileSync(
      join(dir, '.dev.config.json'),
      JSON.stringify({ ...baseConfig, workflow: 'gsd' }, null, 2),
    )
    const warnings: string[] = []
    const orig = console.warn
    console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '))
    try {
      const loaded = readConfig(dir)
      expect(loaded?.workflow).toBe('none')
      expect(warnings.some((w) => w.includes('Deprecation') && w.includes('gsd'))).toBe(true)
    } finally {
      console.warn = orig
    }
  })

  it('passes "bd" workflow through unchanged', () => {
    const cfg: DevConfig = { ...baseConfig, workflow: 'bd' }
    writeConfig(dir, cfg)
    const loaded = readConfig(dir)
    expect(loaded?.workflow).toBe('bd')
  })

  it('does not contain enforcement, beadsWorkflow, or mcp fields on DevConfig', () => {
    const cfg = baseConfig
    expect('enforcement' in cfg).toBe(false)
    expect('beadsWorkflow' in cfg).toBe(false)
    expect('mcp' in cfg).toBe(false)
  })
})
