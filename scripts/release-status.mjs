#!/usr/bin/env node
/**
 * Show which workspace package versions would be published.
 *
 * `changeset publish` publishes only versions that are not on the registry yet,
 * so this is the read-only equivalent of the publish decision. It is what
 * `pnpm release:dry` runs after building; it never uploads anything.
 */

import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

import { ROOT, readJson, readPackages } from './lib/workspace.mjs'

const packages = readPackages()
const ignored = new Set(readJson(join(ROOT, '.changeset', 'config.json')).ignore ?? [])
const rows = []
let failed = false

for (const pkg of packages) {
  if (ignored.has(pkg.name)) {
    rows.push({ pkg, ignored: true })
    continue
  }

  let published = false
  let problem
  try {
    const output = execFileSync(
      'npm',
      ['view', `${pkg.name}@${pkg.version}`, 'version', '--json'],
      { cwd: pkg.dir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    )
    published = output.trim() !== ''
  } catch (error) {
    const stderr = String(error.stderr ?? '')
    if (!isNotFound(stderr)) {
      problem = stderr.trim() || error.message
      failed = true
    }
  }
  rows.push({ pkg, published, problem })
}

for (const { pkg, published, problem, ignored: isIgnored } of rows) {
  if (isIgnored === true) {
    console.log(`${pkg.name}@${pkg.version}  ignored by Changesets (reference package)`)
  } else if (problem !== undefined) {
    console.log(`${pkg.name}@${pkg.version}  ERROR  ${problem.split('\n')[0]}`)
  } else if (published) {
    console.log(`${pkg.name}@${pkg.version}  already on npm, skipped`)
  } else {
    console.log(`${pkg.name}@${pkg.version}  would publish`)
  }
}

if (failed) {
  console.error('\nCould not determine every package version; fix the npm access above.')
  process.exitCode = 1
} else {
  console.log('\nNo upload happened. Run the Release workflow to publish the missing versions.')
}

/** npm returns 404 for a package/version that does not exist yet. */
function isNotFound(stderr) {
  return /E404|404 Not Found|is not in this registry|No match found/iu.test(stderr)
}
