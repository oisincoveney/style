#!/usr/bin/env node
// Parse YAML frontmatter from stdin → JSON on stdout.
// Used by bd-create-gate.sh to validate ticket bodies without shelling
// YAML parsing into bash. Hand-rolled mini-parser (no js-yaml dep) — only
// the strict subset the DSL allows: scalars, lists, nested maps one level deep.
//
// Input: a markdown body that may begin with `---\n<yaml>\n---\n<rest>`.
// Output: { frontmatter: <object>, body: "<rest>", hasFrontmatter: bool }.
// Exit 0 always; the caller decides what to do with the parse.

import { readFileSync } from 'node:fs'

function readStdin() {
  return readFileSync(0, 'utf8')
}

function splitFrontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) {
    return { yaml: '', body: text, hasFrontmatter: false }
  }
  const after = text.slice(4)
  const end = after.search(/^---\s*$/m)
  if (end < 0) return { yaml: '', body: text, hasFrontmatter: false }
  const yaml = after.slice(0, end)
  const rest = after.slice(end).replace(/^---\s*\n?/, '')
  return { yaml, body: rest, hasFrontmatter: true }
}

function parseScalar(raw) {
  const t = raw.trim()
  if (t === '' || t === '~' || t === 'null') return null
  if (t === 'true') return true
  if (t === 'false') return false
  if (/^-?\d+$/.test(t)) return Number(t)
  if (/^-?\d+\.\d+$/.test(t)) return Number(t)
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1)
  }
  return t
}

// Strict mini-YAML: indentation-based, two-space indent, lists with `- `,
// scalar maps `key: value`, sublists/submaps one level deep. No anchors,
// no flow style, no multi-line strings. Fail-soft on unsupported shapes.
function parseYaml(yaml) {
  const lines = yaml.split('\n').filter((l) => l.length > 0 && !/^\s*#/.test(l))
  const root = {}
  let i = 0
  function indent(line) {
    const m = line.match(/^( *)/)
    return m ? m[1].length : 0
  }
  function parseMap(baseIndent) {
    const obj = {}
    while (i < lines.length) {
      const line = lines[i]
      const ind = indent(line)
      if (ind < baseIndent) break
      if (ind > baseIndent) {
        i += 1
        continue
      }
      const stripped = line.slice(baseIndent)
      const m = stripped.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/)
      if (!m) {
        i += 1
        continue
      }
      const key = m[1]
      const rest = m[2]
      i += 1
      if (rest === '') {
        const next = lines[i]
        if (next === undefined) {
          obj[key] = null
          continue
        }
        const nextIndent = indent(next)
        if (nextIndent <= baseIndent) {
          obj[key] = null
          continue
        }
        const trimmed = next.slice(nextIndent)
        if (trimmed.startsWith('- ')) {
          obj[key] = parseList(nextIndent)
        } else {
          obj[key] = parseMap(nextIndent)
        }
      } else {
        obj[key] = parseScalar(rest)
      }
    }
    return obj
  }
  function parseList(baseIndent) {
    const arr = []
    while (i < lines.length) {
      const line = lines[i]
      const ind = indent(line)
      if (ind < baseIndent) break
      if (ind > baseIndent) {
        i += 1
        continue
      }
      const stripped = line.slice(baseIndent)
      if (!stripped.startsWith('- ')) break
      const rest = stripped.slice(2)
      i += 1
      if (rest.includes(':') && !rest.startsWith('"') && !rest.startsWith("'")) {
        const m = rest.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/)
        if (m) {
          const inner = {}
          inner[m[1]] = parseScalar(m[2])
          while (i < lines.length) {
            const peek = lines[i]
            const peekIndent = indent(peek)
            if (peekIndent <= baseIndent) break
            const ps = peek.slice(peekIndent)
            const pm = ps.match(/^([A-Za-z_][A-Za-z0-9_-]*)\s*:\s*(.*)$/)
            if (!pm) {
              i += 1
              continue
            }
            inner[pm[1]] = parseScalar(pm[2])
            i += 1
          }
          arr.push(inner)
          continue
        }
      }
      arr.push(parseScalar(rest))
    }
    return arr
  }
  Object.assign(root, parseMap(0))
  return root
}

const text = readStdin()
const { yaml, body, hasFrontmatter } = splitFrontmatter(text)
const frontmatter = hasFrontmatter ? parseYaml(yaml) : {}
process.stdout.write(JSON.stringify({ frontmatter, body, hasFrontmatter }))
