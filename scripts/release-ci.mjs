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

import { ROOT } from './lib/workspace.mjs'

const token = process.env.NODE_AUTH_TOKEN || process.env.NPM_TOKEN
const trustedPublishing = process.env.RELEASE_PUBLISH === 'true'

if (!token && !trustedPublishing) {
  console.log('Release skipped: no npm credential or trusted-publishing switch.')
  console.log('Add the repository secret NPM_TOKEN, or set the repository variable')
  console.log('RELEASE_PUBLISH=true after configuring npm trusted publishing.')
  console.log('See docs/build-and-release.md#how-npm-publishing-works.')
  process.exit(0)
}

// Trusted publishing exchanges its OIDC token inside npm; a token, when
// present, still takes precedence and must be exported for npm. An empty
// NODE_AUTH_TOKEN inherited from an unset secret must not shadow OIDC.
const env = { ...process.env }
if (token === undefined) delete env.NODE_AUTH_TOKEN
else env.NODE_AUTH_TOKEN = token

execFileSync('pnpm', ['build'], { cwd: ROOT, stdio: 'inherit', env })
execFileSync('pnpm', ['exec', 'changeset', 'publish'], { cwd: ROOT, stdio: 'inherit', env })
