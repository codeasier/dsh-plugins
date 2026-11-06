#!/usr/bin/env node
/**
 * Check that relative links in user-facing Markdown resolve.
 *
 * Anchors and external URLs are out of scope: GitHub validates them, and a
 * network-dependent CI check would make unrelated failures.
 */

import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'

import { failIfErrors, ROOT, readText, relPath } from './lib/workspace.mjs'

const files = [
  'README.md',
  'README.zh.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'SUPPORT.md',
  'AGENTS.md',
  '.changeset/README.md',
  ...markdownUnder('docs'),
  ...markdownUnder('.github'),
  ...markdownUnder('packages'),
  ...markdownUnder('templates'),
].filter((file, index, all) => all.indexOf(file) === index)

const errors = []
let checked = 0

for (const file of files) {
  const absolute = join(ROOT, file)
  if (!existsSync(absolute)) {
    errors.push(`${file}: referenced by the docs check but does not exist`)
    continue
  }

  const text = stripFences(readText(absolute))
  for (const match of text.matchAll(/!?\[[^\]]*\]\(\s*(<[^>]+>|[^)\s]+)(?:\s+[^)]*)?\)/gu)) {
    const raw = match[1]
    if (raw === undefined) continue
    let target = raw.startsWith('<') ? raw.slice(1, -1) : raw
    target = target.trim()
    if (
      target === '' ||
      target.startsWith('#') ||
      target.startsWith('/') ||
      target.startsWith('//') ||
      /^(?:https?|mailto|tel|data):/iu.test(target)
    ) {
      continue
    }

    target = target.split('#')[0].split('?')[0]
    if (target === '') continue
    try {
      target = decodeURIComponent(target)
    } catch {
      errors.push(`${file}: invalid percent-encoding in link ${raw}`)
      continue
    }

    const path = resolve(dirname(absolute), target)
    checked += 1
    if (!existsSync(path)) {
      errors.push(`${file}: broken relative link ${raw} (resolved to ${relPath(path)})`)
      continue
    }
    if (statSync(path).isDirectory() && !existsSync(join(path, 'README.md'))) {
      errors.push(`${file}: link ${raw} points at a directory without README.md`)
    }
  }
}

failIfErrors(errors, `documentation links (${checked} checked)`)

/** List Markdown files below a repository-relative directory. */
function markdownUnder(dir) {
  const absolute = join(ROOT, dir)
  if (!existsSync(absolute)) return []
  const out = []
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const path = join(absolute, entry.name)
    if (entry.isDirectory()) out.push(...markdownUnder(relPath(path)))
    else if (extname(entry.name) === '.md') out.push(relPath(path))
  }
  return out
}

/** Remove fenced code blocks so examples do not count as links. */
function stripFences(text) {
  return text.replace(/^```[\s\S]*?^```/gmu, '')
}
