#!/usr/bin/env node
/**
 * Repository-wide conventions check.
 *
 * The rules here are the machine-enforced half of docs/conventions.md. They are
 * intentionally strict: a plugin that passes this check can be packed and
 * installed without a manual manifest audit.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import {
  failIfErrors,
  PLUGIN_PREFIX,
  REGISTRY_TARGETS,
  ROOT,
  readPackages,
  readText,
  renderPluginTable,
  replaceRegistryRegion,
  shortName,
} from './lib/workspace.mjs'

const errors = []
const packages = readPackages()

const ROOT_FILES = [
  'README.md',
  'README.zh.md',
  'CONTRIBUTING.md',
  'CODE_OF_CONDUCT.md',
  'SECURITY.md',
  'SUPPORT.md',
  'LICENSE',
  'AGENTS.md',
  'docs/README.md',
  'docs/conventions.md',
]

const SEMVER =
  /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u
const PACKAGE_NAME = /^@codeasier\/dsh-plugin-[a-z0-9]+(?:-[a-z0-9]+)*$/u
const ROW_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const ICON_LIMIT = 256 * 1024

for (const file of ROOT_FILES) {
  if (!existsSync(join(ROOT, file))) errors.push(`missing required root file: ${file}`)
}

if (packages.length === 0) errors.push('packages/ contains no package')

const names = new Set()
const rowIds = new Map()

for (const pkg of packages) {
  const where = pkg.relDir
  const manifest = pkg.manifest

  if (names.has(pkg.name)) errors.push(`${where}: duplicate package name ${pkg.name}`)
  names.add(pkg.name)

  if (!PACKAGE_NAME.test(pkg.name)) {
    errors.push(`${where}: package name must match ${PACKAGE_NAME}`)
  }

  if (!SEMVER.test(String(pkg.version))) {
    errors.push(`${where}: version ${pkg.version} is not valid semver`)
  }

  if (manifest.private === true) {
    errors.push(`${where}: workspace packages are publishable; remove "private": true`)
  }

  if (manifest.license !== 'MIT') errors.push(`${where}: license must be MIT`)
  if (!existsSync(join(pkg.dir, 'LICENSE'))) errors.push(`${where}: missing LICENSE`)
  if (manifest.type !== 'module') errors.push(`${where}: "type" must be "module"`)

  if (
    typeof manifest.description !== 'string' ||
    manifest.description.length < 20 ||
    manifest.description.length > 200
  ) {
    errors.push(`${where}: description must be 20-200 characters`)
  }

  if (!Array.isArray(manifest.keywords) || !manifest.keywords.includes('dsh-plugin')) {
    errors.push(`${where}: keywords must include "dsh-plugin"`)
  }

  if (!existsSync(join(pkg.dir, 'README.md'))) errors.push(`${where}: missing README.md`)
  if (!existsSync(join(pkg.dir, 'CHANGELOG.md'))) errors.push(`${where}: missing CHANGELOG.md`)

  if (manifest.publishConfig?.access !== 'public') {
    errors.push(`${where}: publishConfig.access must be "public"`)
  }

  if (manifest.repository?.directory !== pkg.relDir) {
    errors.push(`${where}: repository.directory must be "${pkg.relDir}"`)
  }

  if (typeof manifest.homepage !== 'string' || !manifest.homepage.includes(pkg.relDir)) {
    errors.push(`${where}: homepage must point at ${pkg.relDir}`)
  }

  if (manifest.engines?.node !== '>=22.18.0') {
    errors.push(`${where}: engines.node must be ">=22.18.0"`)
  }

  const rootExport = manifest.exports?.['.']
  if (rootExport?.types !== './dist/index.d.ts' || rootExport?.default !== './dist/index.js') {
    errors.push(
      `${where}: exports["."] must map types to dist/index.d.ts and default to dist/index.js`,
    )
  }

  for (const file of ['dist', 'README.md', 'LICENSE']) {
    if (!Array.isArray(manifest.files) || !manifest.files.includes(file)) {
      errors.push(`${where}: "files" must include ${file}`)
    }
  }

  for (const script of ['build', 'typecheck', 'test']) {
    if (typeof manifest.scripts?.[script] !== 'string') {
      errors.push(`${where}: missing "${script}" script`)
    }
  }

  if (!existsSync(join(pkg.dir, 'src'))) {
    errors.push(`${where}: missing src/`)
  } else {
    const entries = readDirRecursive(join(pkg.dir, 'src'))
    if (!entries.some((entry) => entry.endsWith('.test.ts'))) {
      errors.push(`${where}: src/ must contain at least one *.test.ts`)
    }
  }

  if (!pkg.isPlugin) continue

  if (!existsSync(join(pkg.dir, 'vitest.config.ts'))) {
    errors.push(`${where}: missing vitest.config.ts (the kit alias needs it)`)
  }

  if (pkg.name === `${PLUGIN_PREFIX}kit`) {
    errors.push(`${where}: the shared kit is not a plugin; remove dsh.bundle.patch from it`)
  }

  if (typeof manifest.engines?.dsh !== 'string' || manifest.engines.dsh.trim() === '') {
    errors.push(`${where}: a plugin must declare a non-empty engines.dsh range`)
  } else if (manifest.engines.dsh.includes('workspace:')) {
    errors.push(`${where}: engines.dsh must not use the workspace: protocol`)
  }

  const expectedRowId = shortName(pkg.name)
  if (!ROW_ID.test(expectedRowId)) {
    errors.push(`${where}: row id "${expectedRowId}" must use lowercase kebab-case`)
  }
  if (pkg.rows.length !== 1) {
    errors.push(`${where}: bundle patch must insert exactly one row, found ${pkg.rows.length}`)
  }
  const [row] = pkg.rows
  if (row) {
    if (row.id !== expectedRowId) {
      errors.push(`${where}: row id "${row.id}" must equal "${expectedRowId}"`)
    }
    if (row.name !== pkg.name) {
      errors.push(`${where}: row name "${row.name}" must equal the package name`)
    }
    if (rowIds.has(row.id)) {
      errors.push(`${where}: row id "${row.id}" is already used by ${rowIds.get(row.id)}`)
    } else {
      rowIds.set(row.id, where)
    }
  }

  for (const file of pkg.patchFiles) {
    if (!existsSync(join(pkg.dir, file))) errors.push(`${where}: missing bundle patch ${file}`)
  }

  for (const locale of ['en', 'zh']) {
    const localePath = join(pkg.dir, 'locale', `${locale}.json`)
    if (!existsSync(localePath)) {
      errors.push(`${where}: missing locale/${locale}.json`)
      continue
    }
    try {
      const value = JSON.parse(readFileSync(localePath, 'utf8'))
      if (typeof value.meta?.title !== 'string' || value.meta.title.trim() === '') {
        errors.push(`${where}: locale/${locale}.json needs meta.title`)
      }
      if (typeof value.meta?.description !== 'string' || value.meta.description.trim() === '') {
        errors.push(`${where}: locale/${locale}.json needs meta.description`)
      }
    } catch (error) {
      errors.push(`${where}: locale/${locale}.json is not valid JSON (${error.message})`)
    }
  }

  const icon = join(pkg.dir, 'icon.svg')
  if (!existsSync(icon)) {
    errors.push(`${where}: missing icon.svg`)
  } else {
    const size = statSync(icon).size
    if (size > ICON_LIMIT) errors.push(`${where}: icon.svg exceeds ${ICON_LIMIT} bytes`)
    if (!readFileSync(icon, 'utf8').trimStart().startsWith('<svg')) {
      errors.push(`${where}: icon.svg must start with <svg`)
    }
  }

  for (const exported of ['./cordis.patch.yml', './locale/*.json', './icon', './package.json']) {
    if (manifest.exports?.[exported] === undefined) {
      errors.push(`${where}: exports must include "${exported}"`)
    }
  }

  for (const file of ['cordis.patch.yml', 'icon.svg', 'locale/*.json', 'dist']) {
    if (!manifest.files?.includes(file)) errors.push(`${where}: "files" must include "${file}"`)
  }

  for (const dependency of Object.keys(manifest.dependencies ?? {})) {
    if (dependency.startsWith('@deepseek-ai/dsh-')) {
      errors.push(
        `${where}: ${dependency} must be a peerDependency, not a bundled dependency, so the runtime shares one instance`,
      )
    }
  }
}

for (const target of REGISTRY_TARGETS) {
  const path = join(ROOT, target.file)
  if (!existsSync(path)) continue
  const before = readText(path)
  let after
  try {
    after = replaceRegistryRegion(
      before,
      renderPluginTable(packages, { linkBase: target.linkBase }),
      target.file,
    )
  } catch (error) {
    errors.push(error.message)
    continue
  }
  if (before !== after)
    errors.push(`${target.file}: plugin catalog is stale; run \`pnpm sync:registry\``)
}

failIfErrors(errors, 'conventions')

/** List files below a directory, relative to it. */
function readDirRecursive(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...readDirRecursive(path))
    else out.push(entry.name)
  }
  return out
}
