import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative } from 'node:path'
import { runInNewContext } from 'node:vm'

import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { apply, REPOSITORY_ROUTE } from './index'
import { resolveRepositories } from './repo'

type UnknownRecord = Record<string, unknown>

interface Summary {
  id: string
  displayTitle: string
  title?: string
  cwd?: string
  updatedAt: number
  running: boolean
  blank: boolean
  origin?: 'subagent'
  retainedBy: { mainView?: number }
}

interface Workspace {
  workspaceId: string
  path: string
  title: string
  sessionIds: string[]
  createdAt: string
  updatedAt: string
}

interface WorkspaceSnapshot {
  items: Workspace[]
  archivedSessionIds: string[]
  pinnedSessionIds: string[]
  phase: 'pending' | 'ready'
  state: 'idle' | 'loading' | 'error'
  error: null
}

interface SessionSnapshot {
  ids: string[]
  byId: Record<string, Summary>
}

interface Group {
  id: string
  name: string
}

interface State {
  version: number
  mode: string
  orderBy: string
  archivedFilter: string
  activeOnly: boolean
  groups: Group[]
  assignments: Record<string, string>
  projectNames: Record<string, string>
  projectOrder: Record<string, string[]>
  sessionOrder: Record<string, string[]>
  collapsed: Record<string, boolean>
}

interface RepoEntry {
  path: string
  key: string
  root: string
  title: string
  main: boolean
  worktree: string
  worktrees?: Array<{
    path: string
    label: string
    branch?: string
    main: boolean
  }>
}

interface ProjectView {
  key: string
  workspaceId: string | null
  workspaceIds: string[]
  memberPaths: string[]
  worktrees: Array<{
    workspaceId: string | null
    path: string
    label: string
    branch?: string
    main: boolean
    title: string
    sessionCount: number
    registered?: boolean
  }>
  groupId: string | null
  title: string | null
  path: string | null
  sessions: Summary[]
  pinnedFirst: Summary[]
  updatedAt: number
  isUngrouped: boolean
}

interface View {
  projects: ProjectView[]
  groups: Array<{ id: string; name: string; projects: ProjectView[] }>
  ungroupedProjects: ProjectView[]
  pinned: Array<{ session: Summary; project: ProjectView | null }>
  flat: Array<{ session: Summary; project: ProjectView }>
  searchResults: Array<{ session: Summary; project: ProjectView }>
  tree: Array<{ project: ProjectView; children: unknown[] }>
  workspaceBySession: Map<string, string>
  counts: { projects: number; sessions: number; pinned: number }
  hasProjects: boolean
}

interface Internals {
  defaultState(): State
  sanitizeState(raw: unknown): State
  buildView(input: {
    workspaceSnapshot: WorkspaceSnapshot
    sessionSnapshot: SessionSnapshot
    state: State
    statusMap?: ReadonlyMap<string, { running?: boolean; pendingInteraction?: unknown }>
    currentId?: string
    query?: string
    repoMap?: ReadonlyMap<string, RepoEntry>
  }): View
  createGroup(state: State, id: string, name: string): State
  assignProject(state: State, path: string, groupId: string | null): State
  renameProject(state: State, key: string, name: string): State
  deleteGroup(state: State, id: string): State
  moveProjectInOrder(
    state: State,
    path: string,
    groupId: string | null,
    orderedKeys: string[],
    anchorKey: string | null,
    position: 'before' | 'after',
    memberPaths?: string[],
  ): State
  moveSessionInOrder(
    state: State,
    projectKey: string,
    sessionId: string,
    orderedIds: string[],
    anchorId: string | null,
    position: 'before' | 'after',
  ): State
  isCollapsed(state: State, key: string, defaultExpanded: boolean): boolean
  normalizePath(value: string): string
  isAncestor(parent: string, child: string): boolean
  isActiveSession(
    summary: Summary,
    statusMap?: ReadonlyMap<string, { running?: boolean; pendingInteraction?: unknown }>,
  ): boolean
  workspaceRepo(workspace: Workspace, repoMap?: ReadonlyMap<string, RepoEntry>): RepoEntry
  repoFromPathFallback(value: string): RepoEntry | null
  worktreeForSession(
    session: Pick<Summary, 'id' | 'cwd'>,
    project: Pick<ProjectView, 'path'> | null,
    workspaceBySession?: ReadonlyMap<string, string>,
  ): { label: string; main: boolean } | null
  worktreeFromPath(value: string): { label: string; main: boolean }
  sessionWorktree(
    session: Pick<Summary, 'cwd'>,
    project: Pick<ProjectView, 'path'> | null,
  ): { label: string; main: boolean } | null
}

interface ClientModule {
  inject: string[]
  apply(ctx: unknown): void
  __internals: Internals
}

interface Registration {
  id: string
  factory(require: (id: string) => unknown): ClientModule
}

const NOW = 1_700_000_000_000

function summary(
  id: string,
  displayTitle: string,
  updatedAt: number,
  cwd: string,
  overrides: Partial<Summary> = {},
): Summary {
  return {
    id,
    displayTitle,
    updatedAt,
    cwd,
    running: false,
    blank: false,
    retainedBy: {},
    ...overrides,
  }
}

function workspace(id: string, path: string, sessionIds: string[]): Workspace {
  return {
    workspaceId: id,
    path,
    title: path.split('/').at(-1) ?? path,
    sessionIds,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function snapshots(): { workspaceSnapshot: WorkspaceSnapshot; sessionSnapshot: SessionSnapshot } {
  const workspaceSnapshot: WorkspaceSnapshot = {
    items: [
      workspace('w-one', '/projects/one', ['s-one', 's-pinned', 's-blank']),
      workspace('w-two', '/projects/two', ['s-two', 's-archived']),
    ],
    archivedSessionIds: ['s-archived'],
    pinnedSessionIds: ['s-pinned'],
    phase: 'ready',
    state: 'idle',
    error: null,
  }
  const sessionSnapshot: SessionSnapshot = {
    ids: ['s-one', 's-pinned', 's-two', 's-archived', 's-blank', 's-loose'],
    byId: {
      's-one': summary('s-one', 'One', NOW - 1000, '/projects/one'),
      's-pinned': summary('s-pinned', 'Pinned', NOW - 500, '/projects/one'),
      's-two': summary('s-two', 'Two', NOW - 2000, '/projects/two'),
      's-archived': summary('s-archived', 'Archived', NOW - 3000, '/projects/two'),
      's-blank': summary('s-blank', 'New Session', NOW - 400, '/projects/one', {
        blank: true,
        retainedBy: { mainView: 1 },
      }),
      's-loose': summary('s-loose', 'Loose', NOW - 4000, '/elsewhere'),
    },
  }
  return { workspaceSnapshot, sessionSnapshot }
}

function consolidationSnapshots(): {
  workspaceSnapshot: WorkspaceSnapshot
  sessionSnapshot: SessionSnapshot
  repoMap: Map<string, RepoEntry>
  main: string
  feature: string
} {
  const main = '/projects/repo'
  const feature = '/projects/repo/.worktrees/feature-a'
  const workspaceSnapshot: WorkspaceSnapshot = {
    items: [
      workspace('w-main', main, ['s-main']),
      workspace('w-feature', feature, ['s-feature']),
      workspace('w-other', '/projects/other', ['s-other']),
    ],
    archivedSessionIds: [],
    pinnedSessionIds: [],
    phase: 'ready',
    state: 'idle',
    error: null,
  }
  const sessionSnapshot: SessionSnapshot = {
    ids: ['s-main', 's-feature', 's-other'],
    byId: {
      's-main': summary('s-main', 'Main', NOW - 1000, main),
      's-feature': summary('s-feature', 'Feature', NOW - 500, feature),
      's-other': summary('s-other', 'Other', NOW - 2000, '/projects/other'),
    },
  }
  const repoMap = new Map<string, RepoEntry>([
    [main, { path: main, key: main, root: main, title: 'repo', main: true, worktree: 'main' }],
    [
      feature,
      {
        path: feature,
        key: main,
        root: main,
        title: 'repo',
        main: false,
        worktree: 'feature-a',
      },
    ],
  ])
  return { workspaceSnapshot, sessionSnapshot, repoMap, main, feature }
}

let storageValue: string | null = null

function loadClient(): ClientModule {
  const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
  let registration: Registration | undefined
  const document = {
    querySelector: () => null,
    createElement: () => ({
      dataset: {} as Record<string, string>,
      textContent: '',
      parentNode: null as unknown,
    }),
    head: {
      appendChild(node: { parentNode: unknown }) {
        node.parentNode = document.head
        return node
      },
      removeChild() {
        return undefined
      },
    },
  }
  const sandbox: UnknownRecord = {
    __ORCA_PROJECTS_TEST__: true,
    console,
    setTimeout,
    clearTimeout,
    document,
    window: {
      __ModuleLoader__: {
        load(value: unknown) {
          registration = value as Registration
        },
      },
      localStorage: {
        getItem: () => storageValue,
        setItem: (value: string) => {
          storageValue = value
        },
      },
    },
  }
  runInNewContext(source, sandbox)
  if (registration === undefined)
    throw new Error('client bundle did not register with the module loader')
  return registration.factory((id) => {
    if (id === 'react') return React
    throw new Error(`unexpected client module request: ${id}`)
  })
}

function makeContext(data = snapshots()): {
  ctx: UnknownRecord
  registrations: Array<{ options: UnknownRecord; component: unknown }>
  injected: string[]
  localeCalls: unknown[][]
} {
  const registrations: Array<{ options: UnknownRecord; component: unknown }> = []
  const injected: string[] = []
  const localeCalls: unknown[][] = []
  const { workspaceSnapshot, sessionSnapshot } = data
  const layoutSnapshot = { activePanelId: null }
  const statusSnapshot = new Map([
    ['s-one', { running: true, pendingInteraction: null, completionUnread: false }],
    ['s-pinned', { running: true, pendingInteraction: {}, completionUnread: false }],
    ['s-two', { running: false, pendingInteraction: null, completionUnread: true }],
  ])
  const services: Record<string, unknown> = {
    workspaces: {
      list: {
        getSnapshot: () => workspaceSnapshot,
        subscribe: () => () => undefined,
      },
    },
    sessions: {
      list: {
        getSnapshot: () => sessionSnapshot,
        subscribe: () => () => undefined,
      },
    },
    uiWorkspace: {},
    uiSession: {
      sessionStatus: {
        getSnapshot: () => statusSnapshot,
        subscribe: () => () => undefined,
      },
    },
    layout: {
      panelInfo: {
        getSnapshot: () => layoutSnapshot,
        subscribe: () => () => undefined,
      },
    },
  }
  const ctx = {
    get: (key: string) => services[key],
    locale: {
      register(...args: unknown[]) {
        localeCalls.push(args)
        return () => undefined
      },
    },
    effect(factory: () => unknown) {
      const dispose = factory()
      return typeof dispose === 'function' ? dispose : () => undefined
    },
    slots: {
      inject(key: string, callback: () => unknown) {
        injected.push(key)
        return callback()
      },
      register(options: UnknownRecord, component: unknown) {
        registrations.push({ options, component })
        return () => undefined
      },
    },
  }
  return { ctx, registrations, injected, localeCalls }
}

function project(view: View, path: string): ProjectView {
  const found = view.projects.find((entry) => entry.key === path)
  if (found === undefined) throw new Error(`project ${path} missing from view`)
  return found
}

function renderSidebar(state: Partial<State>, data = snapshots()): string {
  const client = loadClient()
  const { ctx, registrations } = makeContext(data)
  client.apply(ctx)
  const registration = registrations[0]
  if (registration === undefined || typeof registration.options.inject !== 'function') {
    throw new Error('sidebar registration missing its inject face')
  }
  storageValue = JSON.stringify({ ...client.__internals.defaultState(), ...state })
  return renderToString(
    React.createElement(registration.component as React.ComponentType<UnknownRecord>, {
      ...(registration.options.inject as () => UnknownRecord)(),
      t: (key: string) => key,
      wide: true,
    }),
  )
}

describe('client bundle', () => {
  it('registers a loader id equal to the package name', () => {
    const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
    expect(source).toContain('window.__ModuleLoader__.load({')
    expect(source).toContain("id: '@codeasier/dsh-plugin-orca-projects'")
  })

  it('registers the browser with a negative priority and the plugin locale namespace', () => {
    const client = loadClient()
    const { ctx, registrations, injected, localeCalls } = makeContext()

    client.apply(ctx)

    expect(client.inject).toEqual(
      expect.arrayContaining(['slots', 'locale', 'workspaces', 'sessions', 'uiWorkspace']),
    )
    expect(injected).toContain('sidebar.workspaces')
    expect(registrations).toHaveLength(1)
    expect(registrations[0]?.options).toMatchObject({
      name: 'sidebar.workspaces',
      priority: -1,
      locale: 'orcaSidebar',
    })
    expect(typeof registrations[0]?.component).toBe('function')
    expect(localeCalls[0]?.[0]).toBe('orcaSidebar')
    expect(localeCalls[0]?.[1]).toHaveProperty('en')
    expect(localeCalls[0]?.[1]).toHaveProperty('zh')
  })

  it('renders every grouping mode without crashing', () => {
    const client = loadClient()
    const { ctx, registrations } = makeContext()
    client.apply(ctx)
    const registration = registrations[0]
    if (registration === undefined) throw new Error('plugin registered no sidebar')
    if (typeof registration.options.inject !== 'function') {
      throw new Error('sidebar registration did not declare its inject face')
    }
    const injected = (registration.options.inject as () => UnknownRecord)()
    const component = registration.component as React.ComponentType<UnknownRecord>
    const props: UnknownRecord = {
      ...injected,
      t: (key: string) => key,
      wide: true,
    }
    const baseState = {
      version: 1,
      orderBy: 'manual',
      archivedFilter: 'all',
      groups: [{ id: 'g-client', name: 'Client work' }],
      assignments: { '/projects/one': 'g-client' },
      projectNames: {},
      projectOrder: { 'g-client': ['/projects/one'] },
      sessionOrder: { '/projects/one': ['s-one'] },
      collapsed: {},
    }

    const rendered = new Map<string, string>()
    for (const mode of ['orca', 'workspace', 'workspace-tree', 'flat']) {
      storageValue = JSON.stringify({ ...baseState, mode })
      const html = renderToString(React.createElement(component, props))
      expect(html).toContain('orca-root')
      rendered.set(mode, html)
    }
    const flat = rendered.get('flat') ?? ''
    expect(flat).toContain('orca-spinner')
    expect(flat).toContain('is-completed')
    expect(flat).toContain('is-pending')
  })
})

describe('sidebar review regressions', () => {
  it('prioritizes a pending interaction over a simultaneously running session', () => {
    const html = renderSidebar({ mode: 'flat' })
    const pendingRow = html.split('data-session-id="s-pinned"')[1]?.split('data-session-id=')[0]
    expect(pendingRow).toContain('is-pending')
    expect(pendingRow).not.toContain('orca-spinner')
    expect(html).toContain('orca-spinner')
  })

  it.each(['orca', 'workspace-tree'])('keeps loose sessions accessible in %s', (mode) => {
    const html = renderSidebar({
      mode,
      groups: [{ id: 'g-empty', name: 'Empty group' }],
      collapsed: { loose: false },
    })
    expect(html).toContain('orca-group--loose')
    expect(html).not.toContain('data-project-key="__ungrouped__"')
    expect(html.match(/data-session-id="s-loose"/g)).toHaveLength(1)
  })

  it('sorts projects by recent sessions without requiring custom groups', () => {
    const data = snapshots()
    const latest = data.sessionSnapshot.byId['s-two']
    if (latest === undefined) throw new Error('missing second project session')
    latest.updatedAt = NOW
    const html = renderSidebar({ orderBy: 'updated' }, data)
    expect(html.indexOf('data-project-key="/projects/two"')).toBeLessThan(
      html.indexOf('data-project-key="/projects/one"'),
    )
  })

  it('uses manual project order and enables project and session dragging without groups', () => {
    const html = renderSidebar({
      orderBy: 'manual',
      projectOrder: { __ungrouped__: ['/projects/two', '/projects/one'] },
      collapsed: { 'p:/projects/one': false },
    })
    expect(html.indexOf('data-project-key="/projects/two"')).toBeLessThan(
      html.indexOf('data-project-key="/projects/one"'),
    )
    expect(html).toMatch(/class="orca-project-head"[^>]*draggable="true"/)
    expect(html).toMatch(/class="orca-session-main[^"]*"[^>]*draggable="true"/)
  })
})

describe('orca view model', () => {
  it('keeps a pinned session in its project and also lists it in the pinned shelf', () => {
    const client = loadClient()
    const internals = client.__internals
    const { workspaceSnapshot, sessionSnapshot } = snapshots()
    const view = internals.buildView({
      workspaceSnapshot,
      sessionSnapshot,
      state: internals.defaultState(),
    })

    expect(view.pinned.map((entry) => entry.session.id)).toEqual(['s-pinned'])
    expect(project(view, '/projects/one').sessions.map((entry) => entry.id)).toEqual([
      's-pinned',
      's-one',
    ])
    expect(view.counts).toEqual({ projects: 2, sessions: 4, pinned: 1 })
  })

  it('moves a project into a custom group and returns it to ungrouped when the group is deleted', () => {
    const client = loadClient()
    const internals = client.__internals
    const { workspaceSnapshot, sessionSnapshot } = snapshots()
    let state = internals.createGroup(internals.defaultState(), 'g-client', 'Client work')
    state = internals.assignProject(state, '/projects/one', 'g-client')

    const grouped = internals.buildView({ workspaceSnapshot, sessionSnapshot, state })
    expect(grouped.groups[0]?.name).toBe('Client work')
    expect(grouped.groups[0]?.projects.map((entry) => entry.key)).toEqual(['/projects/one'])
    expect(grouped.ungroupedProjects.map((entry) => entry.key)).toEqual(['/projects/two'])

    const removed = internals.deleteGroup(state, 'g-client')
    const ungrouped = internals.buildView({ workspaceSnapshot, sessionSnapshot, state: removed })
    expect(ungrouped.groups).toEqual([])
    expect(ungrouped.ungroupedProjects.map((entry) => entry.key)).toEqual([
      '/projects/one',
      '/projects/two',
    ])
  })

  it('moves a dragged project to the end of the target group order', () => {
    const client = loadClient()
    const internals = client.__internals
    let state = internals.createGroup(internals.defaultState(), 'g-client', 'Client work')
    state = internals.assignProject(state, '/projects/one', 'g-client')
    state = internals.moveProjectInOrder(
      state,
      '/projects/two',
      'g-client',
      ['/projects/one'],
      null,
      'after',
    )

    expect(state.assignments['/projects/two']).toBe('g-client')
    expect(state.projectOrder['g-client']).toEqual(['/projects/one', '/projects/two'])
  })

  it('filters archived sessions without losing the pinned shelf', () => {
    const client = loadClient()
    const internals = client.__internals
    const { workspaceSnapshot, sessionSnapshot } = snapshots()
    const state = { ...internals.defaultState(), archivedFilter: 'all' }
    const view = internals.buildView({ workspaceSnapshot, sessionSnapshot, state })
    expect(project(view, '/projects/two').sessions.map((entry) => entry.id)).toEqual([
      's-two',
      's-archived',
    ])

    const only = { ...state, archivedFilter: 'only' }
    const archived = internals.buildView({ workspaceSnapshot, sessionSnapshot, state: only })
    expect(archived.pinned).toEqual([])
    expect(project(archived, '/projects/two').sessions.map((entry) => entry.id)).toEqual([
      's-archived',
    ])
  })

  it('hides blank sessions except the current one', () => {
    const client = loadClient()
    const internals = client.__internals
    const { workspaceSnapshot, sessionSnapshot } = snapshots()
    const hidden = internals.buildView({
      workspaceSnapshot,
      sessionSnapshot,
      state: internals.defaultState(),
    })
    expect(project(hidden, '/projects/one').sessions.some((entry) => entry.id === 's-blank')).toBe(
      false,
    )

    const visible = internals.buildView({
      workspaceSnapshot,
      sessionSnapshot,
      state: internals.defaultState(),
      currentId: 's-blank',
    })
    expect(project(visible, '/projects/one').sessions.some((entry) => entry.id === 's-blank')).toBe(
      true,
    )
  })

  it('searches session titles and project paths', () => {
    const client = loadClient()
    const internals = client.__internals
    const { workspaceSnapshot, sessionSnapshot } = snapshots()
    const view = internals.buildView({
      workspaceSnapshot,
      sessionSnapshot,
      state: internals.defaultState(),
      query: 'two',
    })
    expect(view.searchResults.map((entry) => entry.session.id)).toEqual(['s-two'])
  })

  it('persists a manual session order and sorts the project by it', () => {
    const client = loadClient()
    const internals = client.__internals
    const { workspaceSnapshot, sessionSnapshot } = snapshots()
    let state = internals.defaultState()
    state = internals.moveSessionInOrder(
      state,
      '/projects/one',
      's-one',
      ['s-pinned', 's-one'],
      's-pinned',
      'before',
    )
    state = { ...state, orderBy: 'manual' }
    const view = internals.buildView({ workspaceSnapshot, sessionSnapshot, state })
    expect(project(view, '/projects/one').sessions.map((entry) => entry.id)).toEqual([
      's-one',
      's-pinned',
    ])
  })

  it('sanitizes persisted state and ignores unknown modes', () => {
    const client = loadClient()
    const internals = client.__internals
    const fallback = internals.sanitizeState({ version: 1, mode: 'unknown' })
    expect(fallback.mode).toBe('orca')

    const state = internals.sanitizeState({
      version: 1,
      mode: 'workspace',
      archivedFilter: 'only',
      activeOnly: true,
      groups: [
        { id: 'g1', name: 'Client' },
        { id: 'g1', name: 'duplicate' },
      ],
      assignments: { '/projects/one': 'g1', '/projects/two': 42 },
      projectOrder: { g1: ['/projects/one', 7] },
      sessionOrder: { '/projects/one': ['s-one'] },
      collapsed: { ['p:' + '/projects/one']: true },
    })
    expect(state.groups).toEqual([{ id: 'g1', name: 'Client' }])
    expect(state.assignments).toEqual({ '/projects/one': 'g1' })
    expect(state.projectOrder.g1).toEqual(['/projects/one'])
    expect(state.sessionOrder['/projects/one']).toEqual(['s-one'])
    expect(state.collapsed['p:/projects/one']).toBe(true)
    expect(state.activeOnly).toBe(true)
  })

  it('labels the main directory and named worktrees', () => {
    const client = loadClient()
    const internals = client.__internals
    expect(internals.worktreeFromPath('/projects/one')).toEqual({ label: 'main', main: true })
    expect(internals.worktreeFromPath('/projects/one/.worktrees/feature-a')).toEqual({
      label: 'feature-a',
      main: false,
    })
    expect(internals.worktreeFromPath('/Users/test1/orca/workspaces/msinsight/2.0-review')).toEqual(
      { label: '2.0-review', main: false },
    )

    const project = { path: '/projects/one' }
    expect(internals.sessionWorktree({ cwd: '/projects/one' }, project)).toEqual({
      label: 'main',
      main: true,
    })
    expect(
      internals.sessionWorktree({ cwd: '/projects/one/.worktrees/feature-a/src' }, project),
    ).toEqual({ label: 'feature-a', main: false })
    expect(internals.sessionWorktree({ cwd: '/projects/one' }, null)).toBeNull()
  })

  it('filters to active sessions in Orca mode', () => {
    const client = loadClient()
    const internals = client.__internals
    const { workspaceSnapshot, sessionSnapshot } = snapshots()
    const statusMap = new Map([
      ['s-one', { running: true }],
      ['s-pinned', { running: false }],
      ['s-two', { running: false }],
      ['s-loose', { running: true }],
    ])
    const state = { ...internals.defaultState(), activeOnly: true, mode: 'orca' }
    const view = internals.buildView({
      workspaceSnapshot,
      sessionSnapshot,
      statusMap,
      state,
    })

    expect(view.projects.map((entry) => entry.key)).toEqual(['/projects/one', '__ungrouped__'])
    expect(project(view, '/projects/one').sessions.map((entry) => entry.id)).toEqual(['s-one'])
    expect(view.pinned).toEqual([])
    expect(view.counts).toEqual({ projects: 1, sessions: 2, pinned: 0 })
  })

  it('treats a pending interaction as active even when the session is not running', () => {
    const client = loadClient()
    const internals = client.__internals
    const source = snapshots().sessionSnapshot.byId['s-two']
    if (source === undefined) throw new Error('s-two summary missing')
    const summary = { ...source, running: false }
    const statusMap = new Map([
      ['s-two', { running: false, pendingInteraction: { kind: 'approval' } }],
    ])
    expect(internals.isActiveSession(summary, statusMap)).toBe(true)
  })

  it('consolidates worktrees under one project using host repository identities', () => {
    const client = loadClient()
    const internals = client.__internals
    const { workspaceSnapshot, sessionSnapshot, repoMap, main, feature } = consolidationSnapshots()
    const view = internals.buildView({
      workspaceSnapshot,
      sessionSnapshot,
      repoMap,
      state: internals.defaultState(),
    })

    expect(view.projects.map((entry) => entry.key)).toEqual([main, '/projects/other'])
    const consolidated = project(view, main)
    expect(consolidated.title).toBe('repo')
    expect(consolidated.path).toBe(main)
    expect(consolidated.sessions.map((entry) => entry.id)).toEqual(['s-feature', 's-main'])
    expect(consolidated.workspaceIds).toEqual(['w-main', 'w-feature'])
    expect(consolidated.worktrees.map((entry) => entry.label)).toEqual(['main', 'feature-a'])
    expect(view.workspaceBySession.get('s-feature')).toBe(feature)
    const featureSession = sessionSnapshot.byId['s-feature']
    if (featureSession === undefined) throw new Error('s-feature summary missing')
    expect(
      internals.worktreeForSession(featureSession, consolidated, view.workspaceBySession),
    ).toEqual({ label: 'feature-a', main: false })
    expect(view.counts.projects).toBe(2)
  })

  it('shows Host-discovered worktrees when only the main workspace is registered', () => {
    const client = loadClient()
    const internals = client.__internals
    const main = '/projects/repo'
    const feature = '/projects/repo/.worktrees/feature-a'
    const workspaceSnapshot: WorkspaceSnapshot = {
      items: [workspace('w-main', main, ['s-main'])],
      archivedSessionIds: [],
      pinnedSessionIds: [],
      phase: 'ready',
      state: 'idle',
      error: null,
    }
    const sessionSnapshot: SessionSnapshot = {
      ids: ['s-main'],
      byId: { 's-main': summary('s-main', 'Main', NOW, main) },
    }
    const repoMap = new Map<string, RepoEntry>([
      [
        main,
        {
          path: main,
          key: main,
          root: main,
          title: 'repo',
          main: true,
          worktree: 'main',
          worktrees: [
            { path: main, label: 'main', branch: 'main', main: true },
            { path: feature, label: 'feature-a', branch: 'feature-a', main: false },
          ],
        },
      ],
    ])
    const view = internals.buildView({
      workspaceSnapshot,
      sessionSnapshot,
      repoMap,
      state: internals.defaultState(),
    })
    const consolidated = project(view, main)
    expect(consolidated.worktrees.map((entry) => entry.label)).toEqual(['main', 'feature-a'])
    expect(consolidated.worktrees.find((entry) => entry.label === 'feature-a')).toMatchObject({
      path: feature,
      workspaceId: null,
      registered: false,
      branch: 'feature-a',
      main: false,
    })
    expect(consolidated.sessions.map((entry) => entry.id)).toEqual(['s-main'])
  })

  it.each(['workspace', 'workspace-tree', 'flat'])(
    'keeps checkout labels without consolidating directory groups in %s',
    (mode) => {
      const internals = loadClient().__internals
      const { workspaceSnapshot, sessionSnapshot, repoMap, main, feature } =
        consolidationSnapshots()
      const view = internals.buildView({
        workspaceSnapshot,
        sessionSnapshot,
        repoMap,
        state: { ...internals.defaultState(), mode },
      })
      expect(view.projects.map((entry) => entry.key)).toEqual([main, feature, '/projects/other'])
      const checkout = project(view, feature)
      expect(checkout.path).toBe(feature)
      expect(checkout.worktrees[0]).toMatchObject({ label: 'feature-a', main: false })
      const session = sessionSnapshot.byId['s-feature']
      if (session === undefined) throw new Error('missing feature session')
      expect(internals.worktreeForSession(session, checkout, view.workspaceBySession)).toEqual({
        label: 'feature-a',
        main: false,
      })
    },
  )

  it('keeps every repository member and the main action target under the active filter', () => {
    const internals = loadClient().__internals
    const { workspaceSnapshot, sessionSnapshot, repoMap, main } = consolidationSnapshots()
    const state = internals.defaultState()
    const statusMap = new Map([['s-feature', { running: true }]])
    const full = internals.buildView({ workspaceSnapshot, sessionSnapshot, repoMap, state })
    const active = internals.buildView({
      workspaceSnapshot,
      sessionSnapshot,
      repoMap,
      statusMap,
      state: { ...state, activeOnly: true },
    })
    const original = project(full, main)
    const filtered = project(active, main)
    expect(filtered.sessions.map((entry) => entry.id)).toEqual(['s-feature'])
    expect(filtered.workspaceId).toBe(original.workspaceId)
    expect(filtered.workspaceIds).toEqual(original.workspaceIds)
    expect(filtered.memberPaths).toEqual(original.memberPaths)
    expect(
      filtered.worktrees.map(({ workspaceId, path, label, main }) => ({
        workspaceId,
        path,
        label,
        main,
      })),
    ).toEqual(
      original.worktrees.map(({ workspaceId, path, label, main }) => ({
        workspaceId,
        path,
        label,
        main,
      })),
    )
    expect(active.counts.projects).toBe(1)
  })

  it('applies a group assignment made on a worktree path to the whole project', () => {
    const client = loadClient()
    const internals = client.__internals
    const { workspaceSnapshot, sessionSnapshot, repoMap, main, feature } = consolidationSnapshots()
    let state = internals.createGroup(internals.defaultState(), 'g-repo', 'Repo work')
    state = internals.assignProject(state, feature, 'g-repo')

    const view = internals.buildView({ workspaceSnapshot, sessionSnapshot, repoMap, state })
    expect(view.groups[0]?.projects.map((entry) => entry.key)).toEqual([main])
    expect(project(view, main).groupId).toBe('g-repo')

    const moved = internals.moveProjectInOrder(
      state,
      main,
      'g-repo',
      [],
      null,
      'after',
      project(view, main).memberPaths,
    )
    expect(moved.assignments[main]).toBe('g-repo')
    expect(moved.assignments[feature]).toBeUndefined()
  })

  it('falls back to Orca workspace folders when the host resolver is unavailable', () => {
    const client = loadClient()
    const internals = client.__internals
    const base = '/Users/me/orca/workspaces/msinsight'
    const first = `${base}/2.0-review`
    const second = `${base}/rebase-2.0`
    const workspaceSnapshot: WorkspaceSnapshot = {
      items: [
        workspace('w-first', first, ['s-first']),
        workspace('w-second', second, ['s-second']),
      ],
      archivedSessionIds: [],
      pinnedSessionIds: [],
      phase: 'ready',
      state: 'idle',
      error: null,
    }
    const sessionSnapshot: SessionSnapshot = {
      ids: ['s-first', 's-second'],
      byId: {
        's-first': summary('s-first', 'First', NOW - 1000, first),
        's-second': summary('s-second', 'Second', NOW - 500, second),
      },
    }
    const view = internals.buildView({
      workspaceSnapshot,
      sessionSnapshot,
      state: internals.defaultState(),
    })

    expect(view.projects).toHaveLength(1)
    expect(view.projects[0]?.key).toBe(`orca:${base}`)
    expect(view.projects[0]?.title).toBe('msinsight')
    expect(view.projects[0]?.worktrees.map((entry) => entry.label)).toEqual([
      '2.0-review',
      'rebase-2.0',
    ])

    const firstWorkspace = workspaceSnapshot.items[0]
    const firstSession = sessionSnapshot.byId['s-first']
    if (firstWorkspace === undefined || firstSession === undefined) {
      throw new Error('first Orca workspace fixture missing')
    }
    const lone = internals.buildView({
      workspaceSnapshot: { ...workspaceSnapshot, items: [firstWorkspace] },
      sessionSnapshot: { ids: ['s-first'], byId: { 's-first': firstSession } },
      state: internals.defaultState(),
    })
    expect(lone.projects[0]?.title).toBe('msinsight')
  })

  it('applies a custom project name and persists it safely', () => {
    const client = loadClient()
    const internals = client.__internals
    const { workspaceSnapshot, sessionSnapshot, repoMap, main } = consolidationSnapshots()
    const renamed = internals.renameProject(internals.defaultState(), main, '  Platform  ')
    const view = internals.buildView({
      workspaceSnapshot,
      sessionSnapshot,
      repoMap,
      state: renamed,
    })
    expect(project(view, main).title).toBe('Platform')

    const sanitized = internals.sanitizeState({
      version: 1,
      projectNames: { [main]: '  Platform  ', '/projects/two': 42, '/empty': '   ' },
    })
    expect(sanitized.projectNames).toEqual({ [main]: 'Platform' })
  })

  it('explains ancestor paths without treating a sibling prefix as a child', () => {
    const client = loadClient()
    const internals = client.__internals
    expect(internals.isAncestor('/projects', '/projects/one')).toBe(true)
    expect(internals.isAncestor('/projects/one', '/projects/one')).toBe(false)
    expect(internals.isAncestor('/projects/one', '/projects/one-extra')).toBe(false)
    expect(internals.normalizePath('/projects/one/')).toBe('/projects/one')
    expect(internals.normalizePath('C:\\projects\\one\\')).toBe('C:/projects/one')
  })
})

describe('repository resolution', () => {
  async function withFixture(run: (base: string) => Promise<void>): Promise<void> {
    const temporary = await realpath(tmpdir())
    const base = await realpath(await mkdtemp(join(temporary, 'orca-repo-')))
    try {
      await run(base)
    } finally {
      expect(dirname(base)).toBe(temporary)
      expect(basename(base)).toMatch(/^orca-repo-/u)
      expect(await realpath(base)).toBe(base)
      await rm(base, { recursive: true, force: true })
    }
  }

  async function linkedCheckout(main: string, checkout: string): Promise<string> {
    const adminDir = join(main, '.git', 'worktrees', basename(checkout))
    await mkdir(adminDir, { recursive: true })
    await mkdir(checkout, { recursive: true })
    await writeFile(join(adminDir, 'commondir'), '../..\n')
    await writeFile(join(adminDir, 'HEAD'), `ref: refs/heads/${basename(checkout)}\n`)
    await writeFile(join(adminDir, 'gitdir'), `${join(checkout, '.git')}\n`)
    await writeFile(join(checkout, '.git'), `gitdir: ${adminDir}\n`)
    return adminDir
  }

  it.each([
    'ordinary directory',
    'another repository',
    'malformed marker',
    'foreign linked checkout',
  ])('does not discover a deleted checkout reused by %s', async (replacement) => {
    await withFixture(async (base) => {
      const main = join(base, 'repo')
      const valid = join(base, 'valid')
      const reused = join(base, 'reused')
      await linkedCheckout(main, valid)
      await linkedCheckout(main, reused)

      expect(dirname(reused)).toBe(base)
      expect(await realpath(reused)).toBe(reused)
      await rm(reused, { recursive: true })
      await mkdir(reused)
      if (replacement === 'another repository') {
        await mkdir(join(reused, '.git'))
        await writeFile(join(reused, '.git', 'HEAD'), 'ref: refs/heads/other\n')
      } else if (replacement === 'malformed marker') {
        await writeFile(join(reused, '.git'), 'not a gitdir pointer\n')
      } else if (replacement === 'foreign linked checkout') {
        await linkedCheckout(join(base, 'other-repo'), reused)
      }

      const [repository] = await resolveRepositories([main])
      expect(repository?.worktrees.map((entry) => entry.path)).toEqual([main, valid])
      expect(repository?.worktrees.find((entry) => entry.path === valid)).toMatchObject({
        label: 'valid',
        branch: 'valid',
        main: false,
      })
    })
  })

  it.each(['relative', 'symlink'])(
    'discovers a valid linked checkout with %s Git pointers',
    async (kind) => {
      await withFixture(async (base) => {
        const main = join(base, 'repo')
        const checkout = join(base, 'valid')
        const adminDir = await linkedCheckout(main, checkout)
        if (kind === 'relative') {
          await writeFile(
            join(adminDir, 'gitdir'),
            `${relative(adminDir, join(checkout, '.git'))}\n`,
          )
          await writeFile(join(checkout, '.git'), `gitdir: ${relative(checkout, adminDir)}\n`)
        } else {
          const mainAlias = join(base, 'repo-alias')
          const checkoutAlias = join(base, 'checkout-alias')
          await symlink(main, mainAlias, 'dir')
          await symlink(checkout, checkoutAlias, 'dir')
          await writeFile(join(adminDir, 'gitdir'), `${join(checkoutAlias, '.git')}\n`)
          await writeFile(
            join(checkout, '.git'),
            `gitdir: ${join(mainAlias, '.git', 'worktrees', 'valid')}\n`,
          )
        }

        const [repository] = await resolveRepositories([main])
        expect(repository?.worktrees.map((entry) => entry.path)).toEqual([main, checkout])
        expect(repository?.worktrees[1]).toMatchObject({ branch: 'valid', main: false })
      })
    },
  )

  it('maps a main checkout and linked worktrees to one repository', async () => {
    const base = await realpath(await mkdtemp(join(tmpdir(), 'orca-repo-')))
    try {
      const main = join(base, 'repo')
      const git = join(main, '.git')
      await mkdir(join(git, 'worktrees', 'feature-a'), { recursive: true })
      await writeFile(join(git, 'worktrees', 'feature-a', 'commondir'), '../..\n')

      const linked = join(main, '.worktrees', 'feature-a')
      await mkdir(linked, { recursive: true })
      await writeFile(join(linked, '.git'), `gitdir: ${join(git, 'worktrees', 'feature-a')}\n`)
      await writeFile(join(git, 'worktrees', 'feature-a', 'gitdir'), `${join(linked, '.git')}\n`)

      const orca = join(base, 'orca', 'workspaces', 'msinsight', '2.0-review')
      await mkdir(join(git, 'worktrees', '2.0-review'), { recursive: true })
      await writeFile(join(git, 'worktrees', '2.0-review', 'commondir'), '../..\n')
      await mkdir(orca, { recursive: true })
      await writeFile(join(orca, '.git'), `gitdir: ${join(git, 'worktrees', '2.0-review')}\n`)
      await writeFile(join(git, 'worktrees', '2.0-review', 'gitdir'), `${join(orca, '.git')}\n`)

      const plain = join(base, 'plain')
      await mkdir(plain)

      const identities = await resolveRepositories([main, linked, orca, plain])
      expect(identities.find((entry) => entry.path === main)).toMatchObject({
        key: main,
        root: main,
        title: 'repo',
        main: true,
        worktree: 'main',
      })
      expect(identities.find((entry) => entry.path === linked)).toMatchObject({
        key: main,
        root: main,
        main: false,
        worktree: 'feature-a',
      })
      expect(identities.find((entry) => entry.path === orca)).toMatchObject({
        key: main,
        root: main,
        main: false,
        worktree: '2.0-review',
      })
      expect(identities.find((entry) => entry.path === plain)).toBeUndefined()

      const mainIdentity = identities.find((entry) => entry.path === main)
      expect(mainIdentity?.worktrees.map((entry) => entry.label)).toEqual(
        expect.arrayContaining(['main', 'feature-a', '2.0-review']),
      )
      expect(mainIdentity?.worktrees.find((entry) => entry.label === 'feature-a')).toMatchObject({
        path: linked,
        main: false,
      })
      expect(mainIdentity?.worktrees.find((entry) => entry.label === '2.0-review')).toMatchObject({
        path: orca,
        main: false,
      })
    } finally {
      await rm(base, { recursive: true, force: true })
    }
  })
})

describe('repository fetch route', () => {
  it('registers one authenticated route and validates its payload', async () => {
    const routes: Array<{
      path: string
      fetch: (request: Request) => Promise<Response>
    }> = []
    const ctx = {
      inject(_deps: string[], callback: (scope: unknown) => void) {
        callback({
          get: () => ({
            fetch: {
              register(route: { path: string; fetch: (request: Request) => Promise<Response> }) {
                routes.push(route)
                return async () => undefined
              },
            },
          }),
        })
      },
    }
    apply(ctx as never)

    expect(routes).toHaveLength(1)
    expect(routes[0]?.path).toBe(REPOSITORY_ROUTE)

    const invalid = await routes[0]?.fetch(
      new Request('http://local/api/orca-projects/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{',
      }),
    )
    expect(invalid?.status).toBe(400)

    const malformed = await routes[0]?.fetch(
      new Request('http://local/api/orca-projects/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths: [42] }),
      }),
    )
    expect(malformed?.status).toBe(400)

    const empty = await routes[0]?.fetch(
      new Request('http://local/api/orca-projects/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths: [] }),
      }),
    )
    expect(empty?.status).toBe(200)
    expect(await empty?.json()).toEqual({ repositories: [] })
  })
})

describe('display metadata', () => {
  it('ships the Chinese detail document named by the zh locale', () => {
    const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
    const zh = JSON.parse(readFileSync(new URL('../locale/zh.json', import.meta.url), 'utf8'))
    expect(zh.meta.description).toContain('worktree')
    expect(zh.meta.detail).toBe('README.zh.md')
    expect(manifest.files).toContain('README.zh.md')
    expect(existsSync(new URL('../README.zh.md', import.meta.url))).toBe(true)
  })
})
