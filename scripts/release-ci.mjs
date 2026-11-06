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

if (!token) {
  console.log('Release skipped: NPM_TOKEN (or NODE_AUTH_TOKEN) is not configured.')
  console.log('Add the repository secret NPM_TOKEN to publish.')
  console.log('See docs/build-and-release.md#release-workflow.')
  process.exit(0)
}

const env = { ...process.env, NODE_AUTH_TOKEN: token }

execFileSync('pnpm', ['build'], { cwd: ROOT, stdio: 'inherit', env })
execFileSync('pnpm', ['exec', 'changeset', 'publish'], { cwd: ROOT, stdio: 'inherit', env })
