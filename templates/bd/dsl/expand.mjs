#!/usr/bin/env node
// Expand DSL frontmatter → EARS-prose markdown for spec-verifier consumption.
// Reads the full body (frontmatter + optional caveman-prose) from stdin,
// emits the equivalent EARS-section markdown on stdout.
//
// Sections produced (only those with corresponding frontmatter fields):
//   ## User story          (if title or summary set in body — passthrough)
//   ## Acceptance Criteria (from ac[])
//   ## Files Likely Touched (from files[])
//   ## Verification Commands (from verify[])
//   ## Out of Scope        (from out_of_scope[])
//   ## Epic Output         (from artifact, epics only)
//   ## Domain              (from domain, epics only)
//
// The original body (anything below the frontmatter) appended verbatim.

import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const parse = spawnSync('node', [join(here, 'parse.mjs')], {
  input: readFileSync(0, 'utf8'),
  encoding: 'utf8',
})
if (parse.status !== 0) {
  process.stderr.write(parse.stderr || 'parse.mjs failed')
  process.exit(parse.status ?? 1)
}
const { frontmatter, body, hasFrontmatter } = JSON.parse(parse.stdout)

if (!hasFrontmatter) {
  process.stdout.write(body)
  process.exit(0)
}

const out = []

if (frontmatter.type === 'epic') {
  if (frontmatter.domain) out.push(`## Domain\n\n${frontmatter.domain}\n`)
  if (frontmatter.artifact) out.push(`## Epic Output\n\n${frontmatter.artifact}\n`)
}

if (Array.isArray(frontmatter.ac) && frontmatter.ac.length > 0) {
  const lines = frontmatter.ac.map((c, i) => `${i + 1}. ${c}`)
  out.push(`## Acceptance Criteria\n\n${lines.join('\n')}\n`)
}

if (Array.isArray(frontmatter.files) && frontmatter.files.length > 0) {
  const lines = frontmatter.files.map((f) => `- ${f}`)
  out.push(`## Files Likely Touched\n\n${lines.join('\n')}\n`)
}

if (Array.isArray(frontmatter.verify) && frontmatter.verify.length > 0) {
  const lines = frontmatter.verify.map((v) => `- \`${v}\``)
  out.push(`## Verification Commands\n\n${lines.join('\n')}\n`)
}

if (Array.isArray(frontmatter.out_of_scope) && frontmatter.out_of_scope.length > 0) {
  const lines = frontmatter.out_of_scope.map((s) => `- ${s}`)
  out.push(`## Out of Scope\n\n${lines.join('\n')}\n`)
}

if (frontmatter.tracer === true) {
  out.push(`## Tracer\n\nThis ticket is the epic's tracer bullet — proves the integration end-to-end on a single happy path before fan-out.\n`)
}

if (body.trim().length > 0) {
  out.push(body.trimStart())
}

process.stdout.write(out.join('\n'))
