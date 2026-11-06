import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import * as React from 'react'
import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

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
  groups: Group[]
  assignments: Record<string, string>
  projectOrder: Record<string, string[]>
  sessionOrder: Record<string, string[]>
  collapsed: Record<string, boolean>
}

interface ProjectView {
  key: string
  workspaceId: string | null
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
    currentId?: string
    query?: string
  }): View
  createGroup(state: State, id: string, name: string): State
  assignProject(state: State, path: string, groupId: string | null): State
  deleteGroup(state: State, id: string): State
  moveProjectInOrder(
    state: State,
    path: string,
    groupId: string | null,
    orderedKeys: string[],
    anchorKey: string | null,
    position: 'before' | 'after',
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

function makeContext(): {
  ctx: UnknownRecord
  registrations: Array<{ options: UnknownRecord; component: unknown }>
  injected: string[]
  localeCalls: unknown[][]
} {
  const registrations: Array<{ options: UnknownRecord; component: unknown }> = []
  const injected: string[] = []
  const localeCalls: unknown[][] = []
  const { workspaceSnapshot, sessionSnapshot } = snapshots()
  const layoutSnapshot = { activePanelId: null }
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
      projectOrder: { 'g-client': ['/projects/one'] },
      sessionOrder: { '/projects/one': ['s-one'] },
      collapsed: {},
    }

    for (const mode of ['orca', 'workspace', 'workspace-tree', 'flat']) {
      storageValue = JSON.stringify({ ...baseState, mode })
      const html = renderToString(React.createElement(component, props))
      expect(html).toContain('orca-root')
    }
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
