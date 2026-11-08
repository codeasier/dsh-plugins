/**
 * Repository identity for a DSH workspace directory.
 *
 * DSH registers one workspace per directory, so the main checkout and every
 * Git worktree show up as separate projects. The sidebar wants one project per
 * repository instead. This module resolves the small amount of Git metadata a
 * workspace root carries:
 *
 * - a normal checkout has a `.git` directory;
 * - a linked worktree, including Orca's `workspaces/<project>/<name>` layout,
 *   has a `.git` file that points at `<main>/.git/worktrees/<name>`, plus a
 *   `commondir` file whose parent is the main checkout.
 *
 * No Git executable is required and no directory is scanned recursively. A
 * workspace without a `.git` entry keeps its own path as identity, so a plain
 * subdirectory workspace is not silently merged into an enclosing repository.
 *
 * @module @codeasier/dsh-plugin-orca-projects
 */

import { readFile, realpath, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path'

/** One workspace's repository identity, as sent to the browser half. */
export interface RepositoryIdentity {
  /** Workspace path exactly as requested. */
  readonly path: string
  /** Stable project key: the canonical main checkout, or the workspace path. */
  readonly key: string
  /** Project directory shown in the sidebar. */
  readonly root: string
  /** Display title derived from the repository directory. */
  readonly title: string
  /** Whether this workspace is the repository's main checkout. */
  readonly main: boolean
  /** `main` or the worktree name Git records for this checkout. */
  readonly worktree: string
}

/** Payload accepted by the `resolve` host method. */
export interface ResolveRepositoriesRequest {
  readonly paths: readonly string[]
}

/** Successful payload returned by the `resolve` host method. */
export interface ResolveRepositoriesResult {
  readonly repositories: readonly RepositoryIdentity[]
}

/**
 * Resolve repository identities for a batch of workspace directories.
 *
 * A failed or missing `.git` probe never rejects the batch, and that path is
 * omitted so the browser can keep its own fallback (which still recognizes a
 * worktree directory that no longer exists). The other workspaces still
 * consolidate.
 *
 * @param paths - workspace directories, usually the registered workspace list.
 * @returns one identity per resolved path, in first-seen order.
 */
export async function resolveRepositories(paths: readonly string[]): Promise<RepositoryIdentity[]> {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const path of paths) {
    if (typeof path !== 'string') continue
    const trimmed = path.trim()
    if (!trimmed || seen.has(trimmed)) continue
    seen.add(trimmed)
    unique.push(trimmed)
    if (unique.length >= 500) break
  }
  const resolved = await Promise.all(
    unique.map(async (path) => ({ path, identity: await resolveOne(path) })),
  )
  return resolved.flatMap(({ identity }) => (identity === undefined ? [] : [identity]))
}

/** Resolve one workspace, or undefined when its root carries no `.git` marker. */
async function resolveOne(path: string): Promise<RepositoryIdentity | undefined> {
  const absolute = normalizeInput(path)
  const real = await safeRealpath(absolute)
  try {
    const git = await stat(join(real, '.git'))
    if (git.isDirectory()) {
      return identity(real, absolute, real, true, 'main')
    }
    if (git.isFile()) {
      return await fromGitFile(real, absolute)
    }
  } catch {
    // No repository marker at this workspace root.
  }
  return undefined
}

/**
 * Read a linked worktree's `.git` file and follow its `commondir` back to the
 * main checkout. Submodules point into `.git/modules/<name>` with no
 * `commondir`; they stay projects of their own instead of merging into the
 * enclosing repository.
 */
async function fromGitFile(
  real: string,
  requested: string,
): Promise<RepositoryIdentity | undefined> {
  let text: string
  try {
    text = await readFile(join(real, '.git'), 'utf8')
  } catch {
    return undefined
  }
  const match = /^\s*gitdir:\s*(.+?)\s*$/mu.exec(text)
  if (!match?.[1]) return undefined
  const rawGitDir = match[1]
  const gitDir = await safeRealpath(isAbsolute(rawGitDir) ? rawGitDir : resolve(real, rawGitDir))
  const posixGitDir = gitDir.split(sep).join('/')
  if (posixGitDir.includes('/.git/modules/')) {
    return identity(real, requested, real, true, 'main')
  }

  let commonDir: string | undefined
  try {
    const common = (await readFile(join(gitDir, 'commondir'), 'utf8')).trim()
    if (common) commonDir = await safeRealpath(resolve(gitDir, common))
  } catch {
    // A `.git` file without commondir is not a standard linked worktree.
  }

  const worktree = basename(real) || basename(gitDir) || 'worktree'
  if (commonDir !== undefined) {
    const main = basename(commonDir) === '.git'
    const root = main ? dirname(commonDir) : commonDir
    return identity(
      root,
      requested,
      root,
      normalizePath(real) === normalizePath(root),
      normalizePath(real) === normalizePath(root) ? 'main' : worktree,
    )
  }

  if (basename(gitDir) === '.git') {
    const root = dirname(gitDir)
    return identity(
      root,
      requested,
      root,
      normalizePath(real) === normalizePath(root),
      normalizePath(real) === normalizePath(root) ? 'main' : worktree,
    )
  }
  return undefined
}

/** Build one identity record with a normalized title. */
function identity(
  key: string,
  requested: string,
  root: string,
  main: boolean,
  worktree: string,
): RepositoryIdentity {
  const canonicalKey = normalizePath(key)
  const canonicalRoot = normalizePath(root)
  return {
    path: requested,
    key: canonicalKey,
    root: canonicalRoot,
    title: basename(canonicalRoot) || canonicalRoot,
    main,
    worktree: worktree || 'main',
  }
}

/** Keep comparison stable across trailing separators and Windows separators. */
function normalizePath(value: string): string {
  const normalized = String(value || '')
    .replace(/\\/gu, '/')
    .replace(/\/+$/u, '')
  return normalized === '' ? '/' : normalized
}

/** Canonicalize an existing path, or return its absolute form when it is gone. */
async function safeRealpath(path: string): Promise<string> {
  try {
    return normalizePath(await realpath(path))
  } catch {
    return normalizePath(path)
  }
}

/** Resolve a possibly relative request against the host process directory. */
function normalizeInput(path: string): string {
  const text = String(path || '').trim()
  return normalizePath(isAbsolute(text) ? text : resolve(text))
}
