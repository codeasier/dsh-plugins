import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import * as React from 'react'
import { describe, expect, it, vi } from 'vitest'

type Props = Record<string, unknown>
type Component = (props: Props) => React.ReactNode
// DSH 0.2.2-rc.1 StoredEntry keeps locale/inject outside its dispatch options.
interface Entry {
  options: {
    key?: string
    id?: string
    order?: number
    label?: string | (() => string)
    priority?: number
  }
  locale?: string
  inject?: () => Props
  component?: Component
}

type RegistrationOptions = Entry['options'] & {
  name: string
  locale?: string
  inject?: () => Props
}

function source<T>(initial: T) {
  let snapshot = initial
  const listeners = new Set<() => void>()
  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set(next: T) {
      snapshot = next
      for (const listener of [...listeners]) listener()
    },
    listeners,
  }
}

function findElement(
  node: React.ReactNode,
  match: (element: React.ReactElement<Props>) => boolean,
) {
  let found: React.ReactElement<Props> | undefined
  React.Children.forEach(node, (child) => {
    if (found || !React.isValidElement<Props>(child)) return
    if (match(child)) found = child
    else found = findElement(child.props.children as React.ReactNode, match)
  })
  return found
}

// Exercise the registered Sidebar's effects without adding a DOM/test-renderer dependency.
function hooks() {
  const values: unknown[] = []
  const dependencies: Array<readonly unknown[] | undefined> = []
  const cleanups = new Map<number, () => void>()
  let cursor = 0
  let dirty = true
  let effects: Array<() => void> = []
  const changed = (index: number, deps?: readonly unknown[]) =>
    deps === undefined ||
    dependencies[index] === undefined ||
    deps.length !== dependencies[index]?.length ||
    deps.some((value, i) => !Object.is(value, dependencies[index]?.[i]))
  const api = {
    ...React,
    useState<T>(initial: T | (() => T)) {
      const index = cursor++
      if (!(index in values))
        values[index] = typeof initial === 'function' ? (initial as () => T)() : initial
      return [
        values[index] as T,
        (next: T | ((previous: T) => T)) => {
          const value =
            typeof next === 'function' ? (next as (previous: T) => T)(values[index] as T) : next
          if (!Object.is(values[index], value)) {
            values[index] = value
            dirty = true
          }
        },
      ] as const
    },
    useMemo<T>(factory: () => T, deps: readonly unknown[]) {
      const index = cursor++
      if (changed(index, deps)) {
        values[index] = factory()
        dependencies[index] = deps
      }
      return values[index] as T
    },
    useCallback<T>(callback: T, deps: readonly unknown[]) {
      return api.useMemo(() => callback, deps)
    },
    useRef<T>(initial: T) {
      return api.useMemo(() => ({ current: initial }), [])
    },
    useEffect(effect: () => unknown, deps?: readonly unknown[]) {
      const index = cursor++
      if (!changed(index, deps)) return
      dependencies[index] = deps
      effects.push(() => {
        cleanups.get(index)?.()
        const cleanup = effect()
        if (typeof cleanup === 'function') cleanups.set(index, cleanup as () => void)
        else cleanups.delete(index)
      })
    },
    useSyncExternalStore(subscribe: (listener: () => void) => () => void, snapshot: () => unknown) {
      api.useEffect(
        () =>
          subscribe(() => {
            dirty = true
          }),
        [subscribe],
      )
      return snapshot()
    },
  }
  return {
    api,
    render(component: Component, props: Props, commit: (tree: React.ReactNode) => void) {
      dirty = true
      let iterations = 0
      while (dirty) {
        if (++iterations > 20) throw new Error('Sidebar effects did not settle')
        dirty = false
        cursor = 0
        effects = []
        commit(component(props))
        for (const effect of effects) effect()
      }
    },
    unmount() {
      for (const cleanup of cleanups.values()) cleanup()
      cleanups.clear()
    },
  }
}

function setup(wide = true) {
  const renderer = hooks()
  let registration:
    | { factory: (require: (id: string) => unknown) => { apply(ctx: unknown): void } }
    | undefined
  const document = {
    querySelector: () => null,
    createElement: () => ({ dataset: {}, textContent: '', parentNode: null as unknown }),
    head: {
      appendChild(node: { parentNode: unknown }) {
        node.parentNode = document.head
      },
      removeChild() {},
    },
  }
  runInNewContext(readFileSync(new URL('../client.js', import.meta.url), 'utf8'), {
    document,
    console,
    window: {
      __ModuleLoader__: {
        load(value: typeof registration) {
          registration = value
        },
      },
      localStorage: { getItem: () => null, setItem() {} },
      setTimeout,
      clearTimeout,
    },
  })
  if (!registration) throw new Error('Missing client registration')
  const client = registration.factory((id) => {
    if (id === 'react') return renderer.api
    throw new Error(`Unexpected module: ${id}`)
  })

  // DSH 0.2.2-rc.1 ui-workspace exposes these private controls through its raw
  // sidebar slot entry's inject(). session.search resolves to controls.search.
  const controls = source({ searchRequest: 0, addRequested: false })
  vi.spyOn(controls, 'subscribe')
  const search = () =>
    controls.set({
      ...controls.getSnapshot(),
      searchRequest: controls.getSnapshot().searchRequest + 1,
    })
  const shipped: Entry = {
    options: {},
    locale: 'workspace',
    inject: vi.fn(() => ({ requestSearch: search, hooks: { workspaceShortcuts: controls } })),
  }
  const entries: Entry[] = [shipped]
  const slotListeners = new Set<() => void>()
  const disposers: Array<() => void> = []
  let sidebar: Entry | undefined
  const list = source({ items: [], archivedSessionIds: [], pinnedSessionIds: [], phase: 'ready' })
  const sessions = source({ ids: [], byId: {} })
  const services: Props = {
    workspaces: { list },
    sessions: { list: sessions },
    uiWorkspace: {},
    uiSession: {},
  }
  const changed = () => {
    for (const listener of [...slotListeners]) listener()
  }
  client.apply({
    get: (name: string) => services[name],
    locale: { register: () => () => undefined },
    effect(factory: () => unknown) {
      const dispose = factory()
      if (typeof dispose === 'function') disposers.push(dispose as () => void)
      return dispose
    },
    slots: {
      entries: () => entries,
      subscribe(_name: string, listener: () => void) {
        slotListeners.add(listener)
        return () => slotListeners.delete(listener)
      },
      inject(_name: string, factory: () => () => void) {
        disposers.push(factory())
      },
      register(options: RegistrationOptions, component: Component) {
        const { key, id, order, label, priority, locale, inject } = options
        sidebar = {
          options: {
            ...(key !== undefined ? { key } : {}),
            ...(id !== undefined ? { id } : {}),
            ...(order !== undefined ? { order } : {}),
            ...(label !== undefined ? { label } : {}),
            ...(priority !== undefined ? { priority } : {}),
          },
          ...(locale !== undefined ? { locale } : {}),
          ...(inject !== undefined ? { inject } : {}),
          component,
        }
        entries.push(sidebar)
        changed()
        return () => {
          entries.splice(entries.indexOf(sidebar as Entry), 1)
          changed()
        }
      },
    },
  })
  if (!sidebar?.component || !sidebar.inject) throw new Error('Missing Sidebar registration')
  const props = { ...sidebar.inject(), wide, t: (key: string) => key, expandSidebar: vi.fn() }
  const focus = vi.fn()
  let header: Props = {}
  let lastRef: { current: unknown } | undefined
  let inert = false
  const closest = () => (inert ? {} : null)
  const root = {
    querySelector: () => (header.searchOpen ? { focus, closest } : null),
    closest,
  }
  const render = () =>
    renderer.render(sidebar?.component as Component, props, (tree) => {
      if (lastRef) lastRef.current = null
      const headerElement = findElement(
        tree,
        (element) => typeof element.type === 'function' && element.type.name === 'Header',
      )
      header = headerElement?.props ?? {}
      const rootElement = findElement(tree, (element) => element.props.className === 'orca-root')
      lastRef = (rootElement as (React.ReactElement & { ref?: { current: unknown } }) | undefined)
        ?.ref
      if (lastRef) lastRef.current = root
    })
  render()
  return {
    controls,
    shipped,
    entries,
    slotListeners,
    props,
    focus,
    render,
    header: () => header,
    setInert(value: boolean) {
      inert = value
    },
    changed,
    search,
    // The shipped command/default-binding boundary; no plugin-owned key listener.
    dispatch(runtime: 'desktop' | 'web', platform: 'macos' | 'windows', gesture: string) {
      const primary = platform === 'macos' ? 'meta' : 'control'
      const binding = `${primary}${runtime === 'web' ? '+alt' : ''}+KeyK`
      if (gesture !== binding) return 'pass'
      const resolved = { status: 'handled', run: search }
      resolved.run()
      return resolved.status
    },
    dispose() {
      renderer.unmount()
      for (const dispose of disposers.reverse()) dispose()
    },
  }
}

describe('PR #10 feedback 4506130648: stored slot entry contract', () => {
  it('injects and subscribes to the top-level workspace locale entry', () => {
    const test = setup()
    try {
      expect(test.shipped.locale).toBe('workspace')
      expect(test.shipped.options).not.toHaveProperty('locale')
      expect.soft(test.shipped.inject).toHaveBeenCalledTimes(1)
      expect.soft(test.controls.subscribe).toHaveBeenCalledTimes(1)
      expect(test.controls.listeners.size).toBe(1)
      test.changed()
      expect(test.shipped.inject).toHaveBeenCalledTimes(1)
      expect(test.controls.subscribe).toHaveBeenCalledTimes(1)
      test.search()
      test.render()
      expect(test.header().searchOpen).toBe(true)
      expect(test.focus).toHaveBeenCalledTimes(1)
    } finally {
      test.dispose()
    }
    expect(test.controls.listeners.size).toBe(0)
    expect(test.slotListeners.size).toBe(0)
  })
})

describe('PR #10 feedback 4506000337: shipped session.search bridge', () => {
  it.each([
    ['desktop', 'macos', 'meta+KeyK'],
    ['desktop', 'windows', 'control+KeyK'],
    ['web', 'macos', 'meta+alt+KeyK'],
    ['web', 'windows', 'control+alt+KeyK'],
  ] as const)(
    'opens and focuses Orca search for %s/%s default binding',
    (runtime, platform, gesture) => {
      const test = setup()
      try {
        expect(test.header().searchOpen).toBe(false)
        expect(test.dispatch(runtime, platform, gesture)).toBe('handled')
        test.render()
        expect(test.header().searchOpen).toBe(true)
        expect(test.focus).toHaveBeenCalled()
      } finally {
        test.dispose()
      }
    },
  )

  it('refocuses an already-open search without clearing the query, and opens again after Escape', () => {
    const test = setup()
    try {
      test.search()
      test.render()
      ;(test.header().onQuery as (value: string) => void)('retained query')
      test.render()
      test.focus.mockClear()
      test.search()
      test.render()
      expect(test.focus).toHaveBeenCalledTimes(1)
      expect(test.header().query).toBe('retained query')
      ;(test.header().onSearchToggle as (force: boolean) => void)(true)
      test.render()
      expect(test.header().searchOpen).toBe(false)
      test.search()
      test.render()
      expect(test.header().searchOpen).toBe(true)
      expect(test.header().query).toBe('')
    } finally {
      test.dispose()
    }
  })

  it('expands the owner sidebar and focuses only after wide content mounts', () => {
    const test = setup(false)
    try {
      test.search()
      test.render()
      expect(test.props.expandSidebar).toHaveBeenCalledTimes(1)
      expect(test.focus).not.toHaveBeenCalled()
      test.props.wide = true
      test.render()
      expect(test.header().searchOpen).toBe(true)
      expect(test.focus).toHaveBeenCalledTimes(1)
    } finally {
      test.dispose()
    }
  })

  it('focuses an already-open drawer search after inert is removed without a wide change', () => {
    const test = setup()
    try {
      test.search()
      test.render()
      test.focus.mockClear()
      test.setInert(true)
      test.search()
      test.render()
      expect(test.props.expandSidebar).toHaveBeenCalledTimes(1)
      expect(test.focus).not.toHaveBeenCalled()
      test.setInert(false)
      test.render()
      expect(test.props.wide).toBe(true)
      expect(test.focus).toHaveBeenCalledTimes(1)
    } finally {
      test.dispose()
    }
  })

  it('ignores non-search control changes and unrelated slot injectors', () => {
    const test = setup()
    try {
      const unrelated = vi.fn(() => {
        throw new Error('Unrelated slot injector must not run')
      })
      test.entries.push({ options: {}, locale: 'another-plugin', inject: unrelated })
      test.changed()
      test.controls.set({ ...test.controls.getSnapshot(), addRequested: true })
      test.render()
      expect(test.header().searchOpen).toBe(false)
      expect(test.focus).not.toHaveBeenCalled()
      expect(unrelated).not.toHaveBeenCalled()
      expect(test.shipped.inject).toHaveBeenCalledTimes(1)
    } finally {
      test.dispose()
    }
  })

  it('keeps pointer search usable when a shipped injector fails', () => {
    const test = setup()
    try {
      test.entries.splice(test.entries.indexOf(test.shipped), 1, {
        options: {},
        locale: 'workspace',
        inject: () => {
          throw new Error('Shipped controls unavailable')
        },
      })
      expect(() => test.changed()).not.toThrow()
      expect(test.controls.listeners.size).toBe(0)
      ;(test.header().onSearchToggle as () => void)()
      test.render()
      expect(test.header().searchOpen).toBe(true)
    } finally {
      test.dispose()
    }
  })

  it('does not intercept unrelated Web keys', () => {
    const test = setup()
    try {
      expect(test.dispatch('web', 'macos', 'meta+KeyK')).toBe('pass')
      expect(test.dispatch('web', 'windows', 'control+KeyK')).toBe('pass')
      test.render()
      expect(test.header().searchOpen).toBe(false)
      expect(test.focus).not.toHaveBeenCalled()
    } finally {
      test.dispose()
    }
  })

  it('rebinds a replaced shipped source without replaying its old requests and cleans up on unload', () => {
    const test = setup()
    const replacement = source({ searchRequest: 9 })
    try {
      expect(test.controls.listeners.size).toBe(1)
      const index = test.entries.indexOf(test.shipped)
      test.entries.splice(index, 1)
      test.changed()
      expect(test.controls.listeners.size).toBe(0)
      test.entries.push({
        options: {},
        locale: 'workspace',
        inject: () => ({ hooks: { workspaceShortcuts: replacement } }),
      })
      test.changed()
      test.render()
      expect(test.header().searchOpen).toBe(false)
      replacement.set({ searchRequest: 10 })
      test.render()
      expect(test.header().searchOpen).toBe(true)
      expect(replacement.listeners.size).toBe(1)
    } finally {
      test.dispose()
    }
    expect(replacement.listeners.size).toBe(0)
    expect(test.slotListeners.size).toBe(0)
  })
})
