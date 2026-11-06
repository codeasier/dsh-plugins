#!/usr/bin/env node
/**
 * Synchronize the generated plugin catalog in README.md and docs/plugins.md.
 *
 * Modes:
 *   node scripts/sync-registry.mjs          rewrite the catalog
 *   node scripts/sync-registry.mjs --check  fail when the catalog is stale
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  REGISTRY_TARGETS,
  ROOT,
  readPackages,
  renderPluginTable,
  replaceRegistryRegion,
} from './lib/workspace.mjs'

const check = process.argv.includes('--check')
const packages = readPackages()
const stale = []

for (const target of REGISTRY_TARGETS) {
  const path = join(ROOT, target.file)
  if (!existsSync(path)) {
    console.error(`missing registry target: ${target.file}`)
    process.exitCode = 1
    continue
  }

  const before = readFileSync(path, 'utf8')
  const after = replaceRegistryRegion(
    before,
    renderPluginTable(packages, { linkBase: target.linkBase }),
    target.file,
  )

  if (before === after) continue

  if (check) {
    stale.push(target.file)
  } else {
    writeFileSync(path, after)
    console.log(`updated ${target.file}`)
  }
}

if (check && stale.length > 0) {
  console.error(`plugin catalog is stale in: ${stale.join(', ')}`)
  console.error('run `pnpm sync:registry` and commit the result')
  process.exitCode = 1
} else if (check) {
  console.log('ok plugin catalog is up to date')
}
