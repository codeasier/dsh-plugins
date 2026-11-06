/**
 * Shared helpers for the repository's maintenance scripts.
 *
 * The repository deliberately has no script-time dependencies: these helpers
 * use only Node's standard library so that `pnpm new`, the conventions check,
 * and the pack check work before `pnpm install` has run.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
export const PACKAGES_DIR = join(ROOT, 'packages')
export const PLUGIN_PREFIX = '@codeasier/dsh-plugin-'
export const REPO_URL = 'https://github.com/codeasier/dsh-plugins'

export const REGISTRY_START = '<!-- plugins:start -->'
export const REGISTRY_END = '<!-- plugins:end -->'

/** Read and parse one JSON file. */
export function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'))
}

/** Read a UTF-8 text file. */
export function readText(path) {
  return readFileSync(path, 'utf8')
}

/** Repository-relative path with forward slashes, suitable for Markdown links. */
export function relPath(absolutePath) {
  return relative(ROOT, absolutePath).split('\\').join(posix.sep)
}

/** List package directories that contain a package.json, sorted by name. */
export function packageDirs() {
  if (!existsSync(PACKAGES_DIR)) return []
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter(
      (entry) => entry.isDirectory() && existsSync(join(PACKAGES_DIR, entry.name, 'package.json')),
    )
    .map((entry) => join(PACKAGES_DIR, entry.name))
    .sort()
}

/**
 * Read one package's manifest and the metadata this repository's checks need.
 * @param {string} dir - absolute package directory.
 */
export function readPackage(dir) {
  const manifest = readJson(join(dir, 'package.json'))
  const bundlePatch = manifest.dsh?.bundle?.patch
  const patchFiles = Array.isArray(bundlePatch) ? bundlePatch : bundlePatch ? [bundlePatch] : []
  const locale = readLocale(join(dir, 'locale', 'en.json'))
  return {
    dir,
    relDir: relPath(dir),
    manifest,
    name: manifest.name,
    version: manifest.version,
    description: manifest.description ?? '',
    isPlugin: patchFiles.length > 0,
    patchFiles,
    rows: patchFiles.flatMap((file) => readPatchRows(join(dir, file))),
    title: locale?.meta?.title,
    localizedDescription: locale?.meta?.description,
  }
}

/** Read every package in the workspace. */
export function readPackages() {
  return packageDirs().map(readPackage)
}

/** Parse a locale file, returning undefined when it is absent or malformed. */
function readLocale(path) {
  if (!existsSync(path)) return undefined
  try {
    return readJson(path)
  } catch {
    return undefined
  }
}

/**
 * Extract inserted row ids and names from a bundle patch.
 *
 * This intentionally understands only the row shape this repository uses:
 * `- insert:` with `id` and `name` fields. A richer patch belongs in docs, not
 * in a dependency-free checker.
 * @param {string} path - absolute patch path.
 * @returns {{ id: string, name?: string }[]}
 */
export function readPatchRows(path) {
  if (!existsSync(path)) return []
  const text = readText(path)
  const rows = []
  let current
  for (const line of text.split(/\r?\n/u)) {
    const id = /^\s*-\s+id:\s*['"]?([^'"\s#]+)['"]?\s*(?:#.*)?$/u.exec(line)
    if (id) {
      current = { id: id[1] }
      rows.push(current)
      continue
    }
    const name = /^\s+name:\s*['"]?([^'"\s#]+)['"]?\s*(?:#.*)?$/u.exec(line)
    if (name && current && current.name === undefined) current.name = name[1]
  }
  return rows
}

/** Convert a package name to the short repo name, e.g. `hello`. */
export function shortName(packageName) {
  return packageName.startsWith(PLUGIN_PREFIX)
    ? packageName.slice(PLUGIN_PREFIX.length)
    : packageName
}

/** Escape a Markdown table cell. */
export function escapeCell(value) {
  return String(value).replaceAll('|', '\\|').replaceAll('\n', ' ')
}

/**
 * Render the plugin catalog table.
 * @param {ReturnType<typeof readPackages>} packages
 * @param {{ linkBase: string }} options - prefix for package source links.
 */
export function renderPluginTable(packages, { linkBase }) {
  const plugins = packages
    .filter((pkg) => pkg.isPlugin)
    .sort((a, b) => a.name.localeCompare(b.name))

  const lines = [
    '| Plugin | What it adds | Version |',
    '|---|---|---|',
    ...plugins.map(
      (pkg) =>
        `| [\`${pkg.name}\`](${linkBase}${pkg.relDir}) | ${escapeCell(pkg.description)} | \`${pkg.version}\` |`,
    ),
  ]
  return lines.join('\n')
}

/** Replace the content between the registry markers, preserving the markers. */
export function replaceRegistryRegion(text, content, file = 'document') {
  const start = text.indexOf(REGISTRY_START)
  const end = text.indexOf(REGISTRY_END)
  if (start === -1 || end === -1 || end < start) {
    throw new Error(
      `${file}: expected ${REGISTRY_START} and ${REGISTRY_END} on their own lines, in that order`,
    )
  }
  return `${text.slice(0, start + REGISTRY_START.length)}\n${content}\n${text.slice(end)}`
}

/** Targets that contain a generated plugin catalog. */
export const REGISTRY_TARGETS = [
  { file: 'README.md', linkBase: './' },
  { file: 'docs/plugins.md', linkBase: '../' },
]

/** Run a command with inherited output and a helpful failure. */
export function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      stdio: 'inherit',
      cwd: ROOT,
      ...options,
    })
  } catch (error) {
    const rendered = [command, ...args].join(' ')
    throw new Error(`command failed: ${rendered}\n${error.message}`)
  }
}

/** Report a list of errors and exit nonzero when any exist. */
export function failIfErrors(errors, label) {
  if (errors.length === 0) {
    console.log(`ok ${label}`)
    return
  }
  console.error(`\n${errors.length} ${label} problem(s):\n`)
  for (const error of errors) console.error(`  - ${error}`)
  console.error('')
  process.exitCode = 1
}
