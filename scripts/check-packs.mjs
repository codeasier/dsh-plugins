#!/usr/bin/env node

/**
 * Validate the published tarball of every workspace package.
 *
 * Run after `pnpm build`: the check reads the real `npm pack --dry-run` file
 * list, so it catches a missing `dist`, a forgotten locale, a leaked test, and
 * an oversized package before a release does.
 */

import { checkPack, formatBytes } from './lib/pack.mjs'
import { failIfErrors, ROOT, readPackages } from './lib/workspace.mjs'

const errors = []
const rows = []

for (const pkg of readPackages()) {
  const result = checkPack(pkg, { root: ROOT })
  errors.push(...result.errors)
  rows.push({
    name: pkg.name,
    version: pkg.version,
    files: result.files.length,
    size: result.size,
  })
}

for (const row of rows) {
  console.log(
    `${row.name.padEnd(42)} ${row.version.padEnd(10)} ${String(row.files).padStart(3)} files  ${formatBytes(row.size)}`,
  )
}

failIfErrors(errors, 'package packs')
