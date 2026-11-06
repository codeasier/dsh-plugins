#!/usr/bin/env node
/**
 * Build, pack, and install one plugin into a DSH profile.
 *
 * Usage:
 *   pnpm install:local dsh-plugin-hello --profile web
 *   pnpm install:local @codeasier/dsh-plugin-hello --profile web --no-build
 *   pnpm install:local dsh-plugin-hello --desktop
 *   pnpm install:local dsh-plugin-hello --profile web --dsh ./custom-dsh
 *
 * The tarball is produced with `pnpm pack`, so the installed artifact has the
 * same file list and manifest a published release would.
 */

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'

import { ROOT, readPackages, run, shortName } from './lib/workspace.mjs'

const MACOS_DESKTOP_DSH =
  '/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh'
const PACK_DIR = join(ROOT, '.pack')

const parsed = parseArgs(process.argv.slice(2))
const pkg = resolvePackage(parsed.target)
if (!pkg.isPlugin) fail(`${pkg.name} is not a plugin bundle (it declares no dsh.bundle.patch)`)

const profile = parsed.desktop ? 'desktop' : parsed.profile
const dsh = parsed.desktop ? resolveDesktopDsh() : (parsed.dsh ?? 'dsh')

if (!parsed.noBuild) {
  console.log('\nBuilding workspace packages...')
  run('pnpm', ['build'])
}

mkdirSync(PACK_DIR, { recursive: true })
console.log(`\nPacking ${pkg.name}...`)
execFileSync('pnpm', ['pack', '--pack-destination', PACK_DIR], {
  cwd: pkg.dir,
  stdio: 'inherit',
})

const tarball = newestTarball(PACK_DIR, shortName(pkg.name))
if (tarball === undefined) fail(`no tarball for ${pkg.name} found in .pack/`)

console.log(`\nInstalling ${tarball} into profile "${profile}"...`)
run(dsh, ['plugin', '--profile', profile, 'add', tarball])

console.log(`
Installed ${pkg.name} into profile "${profile}".

${
  profile === 'desktop'
    ? 'Restart DeepSeek Harness Desktop, then confirm the bundle in Plugins.'
    : `Restart the app if profile "${profile}" does not run with HMR, then check the plugin in the Plugins page.`
}
Inspect the composed tree with:
  ${dsh} --profile ${profile} --dump-config
`)

/** Parse command-line options. */
function parseArgs(argv) {
  const result = {
    target: undefined,
    profile: 'web',
    desktop: false,
    dsh: undefined,
    noBuild: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--profile') {
      const value = argv[index + 1]
      if (value === undefined) fail('--profile needs a value')
      result.profile = value
      index += 1
    } else if (arg === '--desktop') result.desktop = true
    else if (arg === '--dsh') {
      const value = argv[index + 1]
      if (value === undefined) fail('--dsh needs a path')
      result.dsh = value
      index += 1
    } else if (arg === '--no-build') result.noBuild = true
    else if (arg === '-h' || arg === '--help') {
      console.log(
        'Usage: pnpm install:local <package> [--profile <name>] [--desktop] [--dsh <path>] [--no-build]',
      )
      process.exit(0)
    } else if (arg.startsWith('-')) fail(`unknown option: ${arg}`)
    else if (result.target === undefined) result.target = arg
    else fail(`unexpected argument: ${arg}`)
  }
  if (result.target === undefined) fail('missing package name')
  if (result.desktop && argv.includes('--profile')) {
    fail('--desktop and --profile are mutually exclusive')
  }
  return result
}

/** Find a workspace package by package name, directory name, or short name. */
function resolvePackage(target) {
  const packages = readPackages()
  const found = packages.find(
    (pkg) =>
      pkg.name === target ||
      basename(pkg.dir) === target ||
      shortName(pkg.name) === target ||
      pkg.name.endsWith(`/${target}`),
  )
  if (found === undefined) {
    fail(`unknown package "${target}". Available: ${packages.map((pkg) => pkg.name).join(', ')}`)
  }
  return found
}

/** Locate the command runtime bundled with a macOS Desktop installation. */
function resolveDesktopDsh() {
  if (process.platform !== 'darwin') {
    fail(
      'automatic Desktop path detection is macOS-only; pass --dsh <path> to the Desktop-installed command runtime',
    )
  }
  if (!existsSync(MACOS_DESKTOP_DSH)) {
    fail(
      `Desktop command runtime not found at ${MACOS_DESKTOP_DSH}; pass --dsh <path>, or install through the Desktop Plugins page`,
    )
  }
  return MACOS_DESKTOP_DSH
}

/** Return the most recently written tarball for one package. */
function newestTarball(dir, name) {
  const candidates = readdirSync(dir)
    .filter((file) => file.endsWith('.tgz') && file.includes(name))
    .map((file) => ({ file, mtime: statSync(join(dir, file)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime)
  return candidates[0] === undefined ? undefined : join(dir, candidates[0].file)
}

function fail(message) {
  console.error(`error: ${message}`)
  process.exit(1)
}
