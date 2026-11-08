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

import type { Dirent } from 'node:fs'
import { readdir, readFile, realpath, stat } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path'

/** One checkout discovered under a repository, registered in DSH or not. */
export interface RepositoryWorktree {
  /** Absolute checkout directory. */
  readonly path: string
  /** `main` or the checkout directory name. */
  readonly label: string
  /** Current branch, when Git records one. */
  readonly branch?: string
  /** Whether this checkout is the repository's main checkout. */
  readonly main: boolean
}

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
  /** Every checkout Git records for this repository, including unregistered ones. */
  readonly worktrees: readonly RepositoryWorktree[]
}

/** Identity fields before repository-level worktree discovery. */
type RepositoryBase = Omit<RepositoryIdentity, 'worktrees'>

/** Payload accepted by the `resolve` host method. */
export interface ResolveRepositoriesRequest {
  readonly paths: readonly string[]
}

/** A probe outcome; only confirmed non-repositories must disable path fallback. */
export interface RepositoryResolution extends RepositoryIdentity {
  readonly status: 'repository' | 'not-repository' | 'missing' | 'error'
}

/** Successful payload returned by the `resolve` host method. */
export interface ResolveRepositoriesResult {
  readonly repositories: readonly RepositoryResolution[]
}

/** Resolve only Git identities, preserving the original positive-only API. */
export async function resolveRepositories(paths: readonly string[]): Promise<RepositoryIdentity[]> {
  return (await resolveRepositoryResults(paths)).filter((entry) => entry.status === 'repository')
}

/**
 * Probe each workspace independently, retaining negative outcomes so the client
 * can distinguish a confirmed ordinary directory from unavailable metadata.
 * Missing paths and failed probes still permit the client's path fallback.
 */
export async function resolveRepositoryResults(
  paths: readonly string[],
): Promise<RepositoryResolution[]> {
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
  const worktreeCache = new Map<string, Promise<readonly RepositoryWorktree[]>>()
  return Promise.all(unique.map((path) => resolveOne(path, worktreeCache)))
}

/** Resolve one workspace without conflating a failed probe with a negative one. */
async function resolveOne(
  path: string,
  worktreeCache: Map<string, Promise<readonly RepositoryWorktree[]>>,
): Promise<RepositoryResolution> {
  const absolute = normalizeInput(path)
  const real = await safeRealpath(absolute)
  const unresolved = (status: RepositoryResolution['status']): RepositoryResolution => ({
    ...identity(absolute, path, absolute, true, 'main'),
    status,
    worktrees: [],
  })
  try {
    const directory = await stat(real)
    if (!directory.isDirectory()) return unresolved('not-repository')
  } catch (error) {
    return unresolved(isMissing(error) ? 'missing' : 'error')
  }
  try {
    const git = await stat(join(real, '.git'))
    const repository = git.isDirectory()
      ? identity(real, path, real, true, 'main')
      : git.isFile()
        ? await fromGitFile(real, path)
        : undefined
    if (!repository) return unresolved('error')
    return {
      ...repository,
      status: 'repository',
      worktrees: await discoverWorktrees(repository.root, worktreeCache),
    }
  } catch (error) {
    return unresolved(isMissing(error) ? 'not-repository' : 'error')
  }
}

/**
 * Enumerate the checkouts Git records for a repository by reading
 * `<root>/.git/worktrees/<id>/gitdir` and `HEAD`. This finds linked worktrees
 * even when DSH has never registered them as workspaces, and never invokes Git.
 *
 * @param root - canonical main checkout.
 * @param cache - per-batch promise memo keyed by root.
 * @returns the main checkout first, then each existing linked worktree.
 */
function discoverWorktrees(
  root: string,
  cache: Map<string, Promise<readonly RepositoryWorktree[]>>,
): Promise<readonly RepositoryWorktree[]> {
  const key = normalizePath(root)
  const cached = cache.get(key)
  if (cached) return cached
  const pending = readWorktrees(root)
  cache.set(key, pending)
  return pending
}

/** Read the worktree administrative directory of one main checkout. */
async function readWorktrees(root: string): Promise<readonly RepositoryWorktree[]> {
  const gitDir = join(root, '.git')
  const mainBranch = await readBranch(gitDir)
  const main: RepositoryWorktree = {
    path: root,
    label: 'main',
    main: true,
    ...(mainBranch === undefined ? {} : { branch: mainBranch }),
  }
  let entries: Dirent[]
  try {
    entries = await readdir(join(gitDir, 'worktrees'), { withFileTypes: true })
  } catch {
    return [main]
  }
  const worktrees = [main]
  const seen = new Set([normalizePath(root)])
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const adminDir = join(gitDir, 'worktrees', entry.name)
    let rawGitFile: string
    try {
      rawGitFile = (await readFile(join(adminDir, 'gitdir'), 'utf8')).trim()
    } catch {
      continue
    }
    if (!rawGitFile) continue
    const gitFile = await safeRealpath(
      isAbsolute(rawGitFile) ? rawGitFile : resolve(adminDir, rawGitFile),
    )
    const checkoutPath = dirname(gitFile)
    const checkout = normalizePath(checkoutPath)
    if (seen.has(checkout)) continue
    try {
      const info = await stat(checkout)
      if (!info.isDirectory()) continue
      // A stale admin record can outlive its checkout or point at a reused path.
      const marker = await readFile(join(checkout, '.git'), 'utf8')
      const match = /^\s*gitdir:\s*(.+?)\s*$/mu.exec(marker)
      if (!match?.[1]) continue
      const backlink = await safeRealpath(resolve(checkout, match[1]))
      if (backlink !== (await safeRealpath(adminDir))) continue
    } catch {
      continue
    }
    seen.add(checkout)
    const branch = await readBranch(adminDir)
    worktrees.push({
      path: checkout,
      label: basename(checkout) || entry.name,
      main: false,
      ...(branch === undefined ? {} : { branch }),
    })
  }
  return worktrees
}

/** Read a checkout's current branch name from its administrative `HEAD`. */
async function readBranch(dir: string): Promise<string | undefined> {
  try {
    const head = (await readFile(join(dir, 'HEAD'), 'utf8')).trim()
    const match = /^ref:\s*refs\/heads\/(.+)$/u.exec(head)
    if (match?.[1]) return match[1]
    if (/^[0-9a-f]{7,40}$/iu.test(head)) return head.slice(0, 8)
  } catch {
    // Detached, unborn, or unreadable HEADs keep an empty branch label.
  }
  return undefined
}

/** ENOENT/ENOTDIR distinguish absence from access and other probe failures. */
function isMissing(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | null)?.code
  return code === 'ENOENT' || code === 'ENOTDIR'
}

/**
 * Read a linked worktree's `.git` file and follow its `commondir` back to the
 * main checkout. Submodules point into `.git/modules/<name>` with no
 * `commondir`; they stay projects of their own instead of merging into the
 * enclosing repository.
 */
async function fromGitFile(real: string, requested: string): Promise<RepositoryBase | undefined> {
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
): RepositoryBase {
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
