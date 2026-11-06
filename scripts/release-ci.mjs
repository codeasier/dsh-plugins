#!/usr/bin/env node
/**
 * CI publish entry point.
 *
 * Publishing needs an npm credential. A fork, a first push, or a repository
 * without the `NPM_TOKEN` secret must not turn a green `main` red, so this
 * command reports the missing configuration and exits successfully. The
 * Changesets action then reports `published: false`.
 */

import { execFileSync } from 'node:child_process'

import { ROOT, readPackages } from './lib/workspace.mjs'

const token = process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN
const trustedPublishing = process.env.RELEASE_PUBLISH === 'true'
const bootstrap = process.env.RELEASE_BOOTSTRAP === 'true'

if (bootstrap && !token) {
  console.error('Bootstrap requested, but NPM_TOKEN is not configured.')
  console.error('Add the repository secret NPM_TOKEN, or run without bootstrap after')
  console.error('configuring npm trusted publishing.')
  process.exit(1)
}

if (!token && !trustedPublishing) {
  console.log('Release skipped: no npm credential or trusted-publishing switch.')
  console.log('Add the repository secret NPM_TOKEN, or set the repository variable')
  console.log('RELEASE_PUBLISH=true after configuring npm trusted publishing.')
  console.log('See docs/build-and-release.md#how-npm-publishing-works.')
  process.exit(0)
}

// OIDC cannot publish a package that has no trusted publisher yet. Detect a
// pending first publish (the package name itself is absent) before npm fails
// halfway through the batch.
if (!token && trustedPublishing) {
  const unconfigured = newPackagesPending()
  if (unconfigured.length > 0) {
    console.log('Publishing skipped: these packages do not exist on npm yet:')
    for (const name of unconfigured) console.log(`  ${name}`)
    console.log('')
    console.log('Publish their first version with the bootstrap token:')
    console.log('  gh workflow run release.yml -f bootstrap=true --repo codeasier/dsh-plugins')
    console.log('Then configure each package for trusted publishing:')
    console.log(
      '  npx npm@12.2.2 trust github <package> --file release.yml --repo codeasier/dsh-plugins --allow-publish',
    )
    console.log('See docs/build-and-release.md#configure-trusted-publishing.')
    process.exit(0)
  }
}

// Trusted publishing exchanges its OIDC token inside npm; a token, when
// present, still takes precedence and must be exported for npm. An empty
// NODE_AUTH_TOKEN inherited from an unset secret must not shadow OIDC.
const env = { ...process.env }
if (token === undefined) delete env.NODE_AUTH_TOKEN
else env.NODE_AUTH_TOKEN = token

execFileSync('pnpm', ['build'], { cwd: ROOT, stdio: 'inherit', env })
execFileSync('pnpm', ['exec', 'changeset', 'publish'], { cwd: ROOT, stdio: 'inherit', env })

/** Query one npm spec; undefined means the registry returned 404. */
function npmView(spec) {
  try {
    const output = execFileSync('npm', ['view', spec, 'version', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return output.trim()
  } catch (error) {
    const stderr = String(error.stderr ?? '')
    if (/E404|404 Not Found|is not in this registry|No match found/iu.test(stderr)) {
      return undefined
    }
    throw new Error(`npm view ${spec} failed: ${stderr.trim() || error.message}`)
  }
}

/**
 * Local versions that are unpublished and whose package name is also absent.
 * Only a first publish needs the bootstrap token; a new version of a package
 * that already has a trusted publisher can use OIDC.
 */
function newPackagesPending() {
  const names = []
  for (const pkg of readPackages()) {
    if (npmView(`${pkg.name}@${pkg.version}`) !== undefined) continue
    if (npmView(pkg.name) === undefined) names.push(pkg.name)
  }
  return names
}
