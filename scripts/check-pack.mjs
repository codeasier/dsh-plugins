#!/usr/bin/env node
/**
 * Validate one package's publishable tarball.
 *
 * Usage: node ../../scripts/check-pack.mjs .   (from the package directory)
 */

import { resolve } from 'node:path'
import { checkPack, formatBytes } from './lib/pack.mjs'
import { ROOT, readPackage } from './lib/workspace.mjs'

const target = resolve(process.argv[2] ?? '.')
const pkg = readPackage(target)
const result = checkPack(pkg, { root: ROOT })

console.log(
  `${pkg.name}@${pkg.version}: ${result.files.length} files, ${formatBytes(result.size)} unpacked`,
)
for (const file of result.files) console.log(`  ${file}`)

if (result.errors.length > 0) {
  console.error(`\n${result.errors.length} pack problem(s):`)
  for (const error of result.errors) console.error(`  - ${error}`)
  process.exitCode = 1
} else {
  console.log('ok package pack')
}
