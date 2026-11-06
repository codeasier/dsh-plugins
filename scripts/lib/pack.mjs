/**
 * Pack validation shared by `pnpm pack:check` and a single package's
 * `pack:check` script.
 *
 * The check runs `npm pack --dry-run --json` so it validates the real tarball
 * file list that npm computes from the `files` field, not a hand-maintained list.
 */

import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const MAX_UNPACKED_BYTES = 2 * 1024 * 1024
const FORBIDDEN = [
  /^src\//u,
  /\.test\.[cm]?[jt]sx?$/u,
  /^tsconfig/u,
  /^tsdown\.config/u,
  /^node_modules\//u,
]

/**
 * @param {{ name: string, version: string, dir: string, isPlugin: boolean, patchFiles: string[] }} pkg
 * @param {{ root: string }} options
 */
export function checkPack(pkg, { root }) {
  const errors = []
  const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: pkg.dir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      npm_config_cache: join(root, '.tmp', 'npm-cache'),
      npm_config_update_notifier: 'false',
      npm_config_fund: 'false',
      npm_config_audit: 'false',
    },
  })

  let result
  try {
    result = JSON.parse(raw)[0]
  } catch (error) {
    return {
      pkg,
      files: [],
      size: 0,
      errors: [`npm pack --json did not return JSON: ${error.message}`],
    }
  }

  const paths = new Set(result.files.map((file) => file.path))
  const required = ['package.json', 'README.md', 'LICENSE', 'dist/index.js', 'dist/index.d.ts']
  if (pkg.isPlugin) {
    required.push('cordis.patch.yml', 'locale/en.json', 'locale/zh.json', 'icon.svg')
    for (const patch of pkg.patchFiles) required.push(patch.replace(/^\.\//u, ''))
  }
  for (const file of required) {
    if (!paths.has(file)) errors.push(`${pkg.name}: tarball is missing ${file}`)
  }

  for (const path of paths) {
    if (FORBIDDEN.some((pattern) => pattern.test(path))) {
      errors.push(`${pkg.name}: tarball includes development file ${path}`)
    }
  }

  if (result.unpackedSize > MAX_UNPACKED_BYTES) {
    errors.push(
      `${pkg.name}: unpacked size ${result.unpackedSize} bytes exceeds ${MAX_UNPACKED_BYTES} bytes`,
    )
  }

  return {
    pkg,
    files: [...paths].sort(),
    size: result.unpackedSize,
    errors,
  }
}

/** Format a byte count for the summary table. */
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  return `${(bytes / 1024).toFixed(1)} KiB`
}
