import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'

import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { apply } from './index'
import type { RepositoryIdentity } from './repo'

type RepositoryResult = RepositoryIdentity & { status?: string }
type Worktree = { path: string; label: string; main: boolean }
type Session = { id: string; cwd?: string }
type Project = { path: string; key?: string; worktrees?: Worktree[]; workspaceIds?: string[] }

interface Client {
  apply(ctx: unknown): void
  __internals: {
    defaultState(): Record<string, unknown>
    buildView(input: Record<string, unknown>): {
      projects: Project[]
      workspaceBySession: Map<string, string>
    }
    workspaceRepo(
      workspace: { path: string },
      repoMap?: Map<string, RepositoryResult> | null,
    ): RepositoryIdentity
    worktreeForSession(
      session: Session,
      project: Project,
      workspaceBySession?: Map<string, string>,
    ): { label: string; main: boolean }
    sessionWorktree(session: Session, project: Project): { label: string; main: boolean }
  }
}

function loadClient(fetcher = vi.fn<typeof fetch>()): Client {
  let registration: { factory(require: (id: string) => unknown): Client } | undefined
  runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), {
    __ORCA_PROJECTS_TEST__: true,
    fetch: fetcher,
    window: {
      __ModuleLoader__: {
        load(value: typeof registration) {
          registration = value
        },
      },
    },
  })
  if (!registration) throw new Error('client registration missing')
  return registration.factory((id) => {
    if (id === 'react') return React
    throw new Error(`unexpected dependency: ${id}`)
  })
}

function browserResolver(client: Client) {
  let resolver: ((paths: string[], signal?: AbortSignal) => Promise<RepositoryResult[]>) | undefined
  client.apply({
    get: () => ({}),
    effect: () => undefined,
    slots: {
      inject(_name: string, callback: () => void) {
        callback()
      },
      register(options: { inject(): { resolveRepositories: typeof resolver } }) {
        resolver = options.inject().resolveRepositories
      },
    },
  })
  if (!resolver) throw new Error('browser resolver missing')
  return resolver
}

function hostResolver() {
  let handler: ((request: Request) => Promise<Response>) | undefined
  apply({
    inject(_deps: string[], callback: (scope: unknown) => void) {
      callback({
        get: () => ({
          fetch: {
            register(route: { fetch: typeof handler }) {
              handler = route.fetch
              return async () => undefined
            },
          },
        }),
      })
    },
  } as never)
  if (!handler) throw new Error('host resolver missing')
  const fetch = handler
  return async (paths: string[]): Promise<RepositoryResult[]> => {
    const response = await fetch(
      new Request('http://local/api/orca-projects/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths }),
      }),
    )
    expect(response.status).toBe(200)
    const payload = (await response.json()) as { repositories: RepositoryResult[] }
    return payload.repositories
  }
}

async function withDirectories(run: (base: string) => Promise<void>) {
  const base = await realpath(await mkdtemp(join(tmpdir(), 'orca-feedback-')))
  try {
    await run(base)
  } finally {
    await rm(base, { recursive: true, force: true })
  }
}

function workspace(workspaceId: string, path: string, sessionIds: string[] = []) {
  return { workspaceId, path, title: path.split('/').at(-1), sessionIds }
}

function viewFor(
  client: Client,
  items: ReturnType<typeof workspace>[],
  repositories: RepositoryResult[],
  sessions: Session[] = [],
  mode = 'orca',
) {
  return client.__internals.buildView({
    workspaceSnapshot: { items, archivedSessionIds: [], pinnedSessionIds: [], phase: 'ready' },
    sessionSnapshot: {
      ids: sessions.map((session) => session.id),
      byId: Object.fromEntries(
        sessions.map((session) => [
          session.id,
          { ...session, displayTitle: session.id, updatedAt: 1, running: false, blank: false },
        ]),
      ),
    },
    state: { ...client.__internals.defaultState(), mode },
    repoMap: new Map(repositories.map((entry) => [entry.path, entry])),
  })
}

function identity(path: string, main: boolean, worktree: string): RepositoryIdentity {
  return { path, key: '/repo', root: '/repo', title: 'repo', main, worktree }
}

describe('PR #10 repository identity feedback', () => {
  it('keeps an external linked checkout identity on its session chip and subdirectories', () => {
    const client = loadClient()
    const session = { id: 'feature', cwd: '/feature-elsewhere/src' }
    const view = viewFor(
      client,
      [workspace('main', '/repo'), workspace('feature', '/feature-elsewhere', [session.id])],
      [identity('/repo', true, 'main'), identity('/feature-elsewhere', false, 'feature-elsewhere')],
      [session],
    )
    const project = view.projects[0]
    if (!project) throw new Error('project missing')
    expect(project.worktrees).toContainEqual(
      expect.objectContaining({ label: 'feature-elsewhere' }),
    )
    expect(
      client.__internals.worktreeForSession(session, project, view.workspaceBySession),
    ).toEqual({ label: 'feature-elsewhere', main: false })
    expect(
      client.__internals.worktreeForSession({ id: session.id }, project, view.workspaceBySession),
    ).toEqual({ label: 'feature-elsewhere', main: false })
    expect(client.__internals.worktreeForSession(session, project)).toEqual({
      label: 'feature-elsewhere',
      main: false,
    })
  })

  it('inherits main for an ordinary checkout subdirectory even without host resolution', () => {
    expect(
      loadClient().__internals.sessionWorktree({ id: 'main', cwd: '/repo/src' }, { path: '/repo' }),
    ).toEqual({ label: 'main', main: true })
  })

  it('prefers host labels over misleading worktree folder names', () => {
    const client = loadClient()
    const session = { id: 'feature', cwd: '/repo/.worktrees/folder-name/src' }
    const feature = '/repo/.worktrees/folder-name'
    const view = viewFor(
      client,
      [workspace('main', '/repo'), workspace('feature', feature, [session.id])],
      [identity('/repo', true, 'main'), identity(feature, false, 'host-label')],
      [session],
    )
    const project = view.projects[0]
    if (!project) throw new Error('project missing')
    expect(
      client.__internals.worktreeForSession(session, project, view.workspaceBySession),
    ).toEqual({ label: 'host-label', main: false })
  })

  it('does not mistake a confirmed main checkout in a worktree-looking path for a worktree', () => {
    const client = loadClient()
    const path = '/repo/.worktrees/independent'
    const session = { id: 'main', cwd: `${path}/src` }
    const view = viewFor(
      client,
      [workspace('independent', path, [session.id])],
      [{ path, key: path, root: path, title: 'independent', main: true, worktree: 'main' }],
      [session],
    )
    const project = view.projects[0]
    if (!project) throw new Error('project missing')
    expect(
      client.__internals.worktreeForSession(session, project, view.workspaceBySession),
    ).toEqual({ label: 'main', main: true })
  })

  it.each(['workspace', 'workspace-tree', 'flat'])(
    'keeps named chips without consolidating directories in %s mode',
    (mode) => {
      const client = loadClient()
      const feature = '/repo/.worktrees/feature-a'
      const external = '/feature-elsewhere'
      const sessions = [
        { id: 'feature', cwd: `${feature}/src` },
        { id: 'external', cwd: `${external}/src` },
      ]
      const view = viewFor(
        client,
        [
          workspace('main', '/repo'),
          workspace('feature', feature, ['feature']),
          workspace('external', external, ['external']),
        ],
        [identity('/repo', true, 'main'), identity(external, false, 'host-external')],
        sessions,
        mode,
      )
      expect(view.projects.map((project) => project.key)).toEqual(['/repo', feature, external])
      for (const [index, label] of ['feature-a', 'host-external'].entries()) {
        const session = sessions[index]
        const project = view.projects[index + 1]
        if (!session || !project) throw new Error('checkout fixture missing')
        expect(
          client.__internals.worktreeForSession(session, project, view.workspaceBySession),
        ).toEqual({ label, main: false })
      }
    },
  )

  it('reports confirmed non-Git, missing paths and invalid Git metadata distinctly', async () => {
    await withDirectories(async (base) => {
      const ordinary = join(base, 'repo', '.worktrees', 'ordinary')
      const missing = join(base, 'repo', '.worktrees', 'missing')
      const broken = join(base, 'repo', '.worktrees', 'broken')
      await mkdir(ordinary, { recursive: true })
      await mkdir(broken)
      await writeFile(join(broken, '.git'), 'invalid gitdir metadata\n')
      const results = await hostResolver()([ordinary, missing, broken])
      expect(results.find((entry) => entry.path === ordinary)).toMatchObject({
        key: ordinary,
        status: 'not-repository',
      })
      expect(results.find((entry) => entry.path === missing)).toMatchObject({ status: 'missing' })
      expect(results.find((entry) => entry.path === broken)).toMatchObject({ status: 'error' })
    })
  })

  it('keeps a confirmed ordinary worktree-looking directory as a separate project', async () => {
    await withDirectories(async (base) => {
      const main = join(base, 'repo')
      const ordinary = join(main, '.worktrees', 'ordinary')
      await mkdir(join(main, '.git'), { recursive: true })
      await mkdir(ordinary, { recursive: true })
      const repositories = await hostResolver()([main, ordinary])
      const view = viewFor(
        loadClient(),
        [workspace('main', main), workspace('ordinary', ordinary)],
        repositories,
      )
      expect(view.projects.map((project) => project.key)).toEqual([main, ordinary])
      expect(view.projects.map((project) => project.workspaceIds)).toEqual([['main'], ['ordinary']])
    })
  })

  it('retains path fallback for missing/error outcomes and unavailable resolver entries', async () => {
    await withDirectories(async (base) => {
      const missing = join(base, 'repo', '.worktrees', 'missing')
      const broken = join(base, 'repo', '.worktrees', 'broken')
      await mkdir(broken, { recursive: true })
      await writeFile(join(broken, '.git'), 'invalid gitdir metadata\n')
      const repositories = await hostResolver()([missing, broken])
      const client = loadClient()
      for (const path of [missing, broken]) {
        const repoMap = new Map(repositories.map((entry) => [entry.path, entry]))
        expect(client.__internals.workspaceRepo({ path }, repoMap).key).toBe(join(base, 'repo'))
        expect(client.__internals.workspaceRepo({ path }, null).key).toBe(join(base, 'repo'))
        expect(client.__internals.workspaceRepo({ path }, new Map()).key).toBe(join(base, 'repo'))
      }
    })
  })

  it.each(['https://host/', 'https://host/tools/dsh/'])(
    'keeps the repository fetch under document base %s',
    async (base) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ repositories: [] }))
      const resolver = browserResolver(loadClient(fetcher))
      const signal = new AbortController().signal
      await resolver(['/repo'], signal)
      const [url, options] = fetcher.mock.calls[0] ?? []
      expect(new URL(String(url), base).pathname).toBe(
        `${new URL(base).pathname}api/orca-projects/resolve`,
      )
      expect(options).toMatchObject({ method: 'POST', body: '{"paths":["/repo"]}', signal })
    },
  )
})
