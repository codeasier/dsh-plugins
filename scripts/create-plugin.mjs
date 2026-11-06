#!/usr/bin/env node
/**
 * Scaffold a new plugin package and register it in the catalog.
 *
 * Usage:
 *   pnpm new my-plugin
 *   pnpm new my-plugin --description "Does one useful thing in DSH."
 *   pnpm new my-plugin --ui          # add a Web client half
 *   pnpm new my-plugin --no-install
 *   pnpm new my-plugin --dry-run
 */

import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import {
  PLUGIN_PREFIX,
  REGISTRY_TARGETS,
  ROOT,
  readPackages,
  renderPluginTable,
  replaceRegistryRegion,
} from './lib/workspace.mjs'

const HELP = `Scaffold a DeepSeek Harness plugin in packages/

Usage:
  pnpm new <name> [options]

Arguments:
  name                 kebab-case plugin name, with or without the
                       "dsh-plugin-" prefix and @codeasier/ scope

Options:
  --description <text> package and display description (defaults to a generated one)
  --ui                 add a Web client half and the dsh.client manifest section
  --no-install         write files without running pnpm install
  --dry-run            print the files that would be created, write nothing
  -h, --help           show this help

The command refuses to overwrite an existing package. It updates the generated
catalog in README.md and docs/plugins.md.`

const TEMPLATE = join(ROOT, 'templates', 'plugin')
const ROOT_LICENSE = join(ROOT, 'LICENSE')
const SHORT_NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u
const RESERVED = new Set(['kit', 'plugin', 'plugins', 'template', 'test', 'tests', 'new', 'all'])
const ACRONYMS = new Map([
  ['dsh', 'DSH'],
  ['mcp', 'MCP'],
  ['ui', 'UI'],
  ['api', 'API'],
  ['cli', 'CLI'],
  ['llm', 'LLM'],
])

const parsed = parseArgs(process.argv.slice(2))
if (parsed.help) {
  console.log(HELP)
  process.exit(0)
}

const short = normalizeName(parsed.name)
const packageName = `${PLUGIN_PREFIX}${short}`
const rowId = short
const toolName = short.replaceAll('-', '_')
const title = toTitle(short)
const description = normalizeDescription(parsed.description, title)
const targetDir = join(ROOT, 'packages', `dsh-plugin-${short}`)

if (parsed.dryRun) {
  console.log(`Would create packages/dsh-plugin-${short}`)
  console.log(`  package  ${packageName}`)
  console.log(`  row id   ${rowId}`)
  console.log(`  tool     ${toolName}`)
  console.log(`  ui       ${parsed.ui ? 'yes' : 'no'}`)
  console.log('  files    package.json, LICENSE, README.md, CHANGELOG.md, tsconfig.json,')
  console.log('           tsdown.config.ts, vitest.config.ts, cordis.patch.yml, icon.svg,')
  console.log('           locale/{en,zh}.json,')
  console.log(`           src/index.ts, src/index.test.ts${parsed.ui ? ', client.js' : ''}`)
  process.exit(0)
}

if (existsSync(targetDir)) {
  fail(`packages/dsh-plugin-${short} already exists; choose another name or edit it directly`)
}

mkdirSync(join(targetDir, 'src'), { recursive: true })
mkdirSync(join(targetDir, 'locale'), { recursive: true })

cpSync(TEMPLATE, targetDir, {
  recursive: true,
  filter(source) {
    if (!parsed.ui && source.endsWith('client.js')) return false
    return true
  },
})

const PLACEHOLDER = /__(?:PACKAGE_NAME|ROW_ID|TOOL_NAME|TITLE|DESCRIPTION)__/gu

for (const file of walk(targetDir)) {
  if (!/\.(?:ts|js|json|yml|yaml|md|svg)$/u.test(file)) continue
  const before = readFileSync(file, 'utf8')
  const escapeFor = file.endsWith('.json')
    ? jsonEscape
    : file.endsWith('.ts') || file.endsWith('.js')
      ? tsEscape
      : (value) => value
  const after = before.replace(PLACEHOLDER, (token) => {
    if (token === '__PACKAGE_NAME__') return escapeFor(packageName)
    if (token === '__ROW_ID__') return escapeFor(rowId)
    if (token === '__TOOL_NAME__') return escapeFor(toolName)
    if (token === '__TITLE__') return escapeFor(title)
    return escapeFor(description)
  })
  if (after !== before) writeFileSync(file, after)
}

writeFileSync(join(targetDir, 'package.json'), `${JSON.stringify(manifest(), null, 2)}\n`)
writeFileSync(join(targetDir, 'LICENSE'), readFileSync(ROOT_LICENSE, 'utf8'))
writeFileSync(
  join(targetDir, 'CHANGELOG.md'),
  `# ${packageName}\n\nChanges to this package are documented here by Changesets. See the repository\n[CHANGELOG conventions](../../CONTRIBUTING.md#changesets).\n`,
)

updateRegistry()

if (!parsed.noInstall) {
  process.stdout.write('\nInstalling workspace dependencies...\n')
  try {
    execFileSync('pnpm', ['install'], { cwd: ROOT, stdio: 'inherit' })
  } catch {
    console.error(
      '\npnpm install failed. The plugin files were written; run `pnpm install` manually.',
    )
    process.exitCode = 1
  }
}

console.log(`
Created packages/dsh-plugin-${short} (${packageName})

Next:
  1. Implement src/index.ts and update locale/en.json and locale/zh.json.
  2. Run: pnpm --filter ${packageName} test
  3. Add a changeset: pnpm changeset
  4. Try it in a profile: pnpm install:local dsh-plugin-${short} --profile web
${
  parsed.ui
    ? '  5. The client half is hand-written loader code; read docs/client-ui.md before changing it.\n'
    : ''
}`)

/** Parse the command line. */
function parseArgs(argv) {
  const result = {
    name: undefined,
    description: undefined,
    ui: false,
    noInstall: false,
    dryRun: false,
    help: false,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '-h' || arg === '--help') result.help = true
    else if (arg === '--ui') result.ui = true
    else if (arg === '--no-install') result.noInstall = true
    else if (arg === '--dry-run') result.dryRun = true
    else if (arg === '--description') {
      const value = argv[index + 1]
      if (value === undefined) fail('--description needs a value')
      result.description = value
      index += 1
    } else if (arg.startsWith('--description=')) {
      result.description = arg.slice('--description='.length)
    } else if (arg.startsWith('-')) {
      fail(`unknown option: ${arg}\n\n${HELP}`)
    } else if (result.name === undefined) {
      result.name = arg
    } else {
      fail(`unexpected argument: ${arg}`)
    }
  }
  if (!result.help && result.name === undefined) fail(`missing plugin name\n\n${HELP}`)
  return result
}

/** Remove the optional scope and prefix, then validate. */
function normalizeName(value) {
  let name = value.trim()
  if (name.startsWith('@codeasier/')) name = name.slice('@codeasier/'.length)
  if (name.startsWith('dsh-plugin-')) name = name.slice('dsh-plugin-'.length)
  if (name.length < 2 || name.length > 40) fail('plugin name must be 2-40 characters long')
  if (!SHORT_NAME.test(name)) {
    fail(`plugin name "${name}" must be lowercase kebab-case (letters, digits, single hyphens)`)
  }
  if (RESERVED.has(name)) fail(`"${name}" is reserved by the repository`)
  return name
}

/** Human-facing title derived from the kebab-case name. */
function toTitle(name) {
  return name
    .split('-')
    .map((part) => ACRONYMS.get(part) ?? part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** Validate or synthesize the package description. */
function normalizeDescription(value, pluginTitle) {
  const text = (value?.trim() || `A DeepSeek Harness plugin for ${pluginTitle}.`).replace(
    /\s+/gu,
    ' ',
  )
  if (text.length < 20) fail('description must be at least 20 characters')
  if (text.length > 200) fail('description must be at most 200 characters')
  return /[.!?]$/u.test(text) ? text : `${text}.`
}

/** Escape text for a JSON string value, without surrounding quotes. */
function jsonEscape(value) {
  return JSON.stringify(value).slice(1, -1)
}

/** Escape text for a single-quoted TypeScript string literal. */
function tsEscape(value) {
  return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'").replace(/\r?\n/gu, ' ')
}

/** Build the package manifest. */
function manifest() {
  const directory = `packages/dsh-plugin-${short}`
  const exportsField = {
    '.': {
      types: './dist/index.d.ts',
      default: './dist/index.js',
    },
    './cordis.patch.yml': './cordis.patch.yml',
    './locale/*.json': './locale/*.json',
    './icon': './icon.svg',
    './package.json': './package.json',
  }
  const files = ['dist', 'cordis.patch.yml', 'locale/*.json', 'icon.svg', 'README.md', 'LICENSE']
  const dsh = { bundle: { patch: './cordis.patch.yml' } }

  if (parsed.ui) {
    exportsField['./client'] = './client.js'
    files.splice(1, 0, 'client.js')
    dsh.client = {
      platform: 'web',
      immediately: true,
      inject: ['@deepseek-ai/dsh-client-ui-conversation'],
    }
  }

  return {
    name: packageName,
    version: '0.1.0',
    description,
    keywords: ['dsh-plugin', 'deepseek-harness', 'dsh', 'cordis', short],
    license: 'MIT',
    type: 'module',
    main: './dist/index.js',
    types: './dist/index.d.ts',
    exports: exportsField,
    files,
    publishConfig: { access: 'public' },
    repository: {
      type: 'git',
      url: 'git+https://github.com/codeasier/dsh-plugins.git',
      directory,
    },
    homepage: `https://github.com/codeasier/dsh-plugins/tree/main/${directory}#readme`,
    bugs: { url: 'https://github.com/codeasier/dsh-plugins/issues' },
    engines: {
      node: '>=22.18.0',
      dsh: '>=0.2.1-rc.2 <0.3.0',
    },
    dsh,
    scripts: {
      build: 'tsdown',
      dev: 'tsdown --watch',
      typecheck: 'tsc -p tsconfig.json --noEmit',
      test: 'vitest run --config vitest.config.ts',
      'test:watch': 'vitest --config vitest.config.ts',
      'pack:check': 'node ../../scripts/check-pack.mjs .',
    },
    dependencies: {
      '@deepseek-ai/schemastery': '^3.18.5',
    },
    peerDependencies: {
      '@deepseek-ai/cordis': '>=4.0.5 <5',
      '@deepseek-ai/dsh-tools': '>=0.2.1-rc.2 <0.3.0',
    },
    devDependencies: {
      '@deepseek-ai/cordis': '4.0.5',
      '@deepseek-ai/dsh-tools': '0.2.1-rc.2',
    },
  }
}

/** Refresh the generated catalog after a successful scaffold. */
function updateRegistry() {
  const packages = readPackages()
  for (const target of REGISTRY_TARGETS) {
    const path = join(ROOT, target.file)
    if (!existsSync(path)) continue
    const before = readFileSync(path, 'utf8')
    try {
      const after = replaceRegistryRegion(
        before,
        renderPluginTable(packages, { linkBase: target.linkBase }),
        target.file,
      )
      if (after !== before) writeFileSync(path, after)
    } catch (error) {
      console.warn(`warning: ${error.message}`)
    }
  }
}

/** List files below a directory. */
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...walk(path))
    else out.push(path)
  }
  return out
}

/** Print an error and exit. */
function fail(message) {
  console.error(`error: ${message}`)
  process.exit(1)
}
