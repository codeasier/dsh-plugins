import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import { describe, expect, it } from 'vitest'

type Props = Record<string, unknown>
type Component = (props: Props) => Child
type Child = Element | string | number | boolean | null | undefined | Child[]
interface Element {
  type: string | Component
  props: Props
  children: Child[]
}
interface Hook {
  value?: unknown
  deps?: unknown[]
}
interface Op {
  op: 'set'
  path: string[]
  value: unknown
}
interface Section {
  active?: string
  providers: Record<string, unknown>[]
}
interface Config {
  search: Section
  fetch: Section
}

const source = readFileSync(new URL('../client.js', import.meta.url), 'utf8')
const initial = (): Config => ({
  search: { active: 'a', providers: [{ id: 'a', vendor: 'url', label: 'Original' }] },
  fetch: { active: 'plain', providers: [{ id: 'plain', vendor: 'http' }] },
})

type Routes = { searchProvider?: string; fetchProvider?: string }
interface WebSnapshot {
  status: 'ready' | 'loading' | 'unavailable'
  value: Routes
  revision: number | undefined
  writable: boolean
}

/** Model just the accepted web row and its revision fence, separately from the plugin form. */
function routeForm(value: Routes, overrides: Partial<Omit<WebSnapshot, 'value'>> = {}) {
  let view: WebSnapshot = { status: 'ready', value, revision: 10, writable: true, ...overrides }
  let host = view
  let reply: 'reject' | 'false' | 'superseded' | undefined
  let hold: Promise<void> | undefined
  const writes: Array<{ ops: Op[]; revision: number | undefined }> = []
  return {
    getSnapshot: () => view,
    subscribe: () => () => {},
    mutate: async (ops: Op[], revision?: number) => {
      writes.push({ ops: structuredClone(ops), revision })
      const sleeping = hold
      hold = undefined
      if (sleeping) await sleeping
      const answer = reply
      reply = undefined
      if (answer === 'reject') throw new Error('response lost')
      if (answer === 'false' || host.revision !== revision) {
        view = host
        return false
      }
      const next = { ...host.value }
      for (const op of ops) {
        if (op.path.length !== 1 || op.op !== 'set') throw new Error('unsupported web route write')
        next[op.path[0] as keyof Routes] = op.value as string
      }
      host = { ...host, value: next, revision: (host.revision ?? 0) + 1 }
      if (answer !== 'superseded') view = host
      return true
    },
    writes,
    host: () => host,
    reply: (answer: typeof reply) => {
      reply = answer
    },
    defer: () => {
      let release!: () => void
      hold = new Promise<void>((resolve) => {
        release = resolve
      })
      return release
    },
    external: (next: Routes, mirrored = true) => {
      host = { ...host, value: next, revision: (host.revision ?? 0) + 1 }
      if (mirrored) view = host
    },
  }
}

/** Execute the actual client bundle with deterministic hooks, not a rendered browser. */
function mount(
  value = initial(),
  {
    queued = false,
    webForm,
  }: { queued?: boolean; webForm?: ReturnType<typeof routeForm> | undefined } = {},
) {
  let snapshot = { status: 'ready', value: structuredClone(value), revision: 1 }
  let host = snapshot
  let generation = 0
  let tail = Promise.resolve()
  let pendingRevision: number | undefined
  let describeReads = 0
  const superseded: number[] = []
  let failure: 'reject' | 'false' | null = null
  let afterAccept: (() => void) | null = null
  let nextMutation: Promise<void> | null = null
  let nextDescribe: Promise<void> | null = null
  let describeStarted: (() => void) | null = null
  const writes: { ops: Op[]; revision: number | undefined; method: string }[] = []
  const mutate = (ops: Op[], revision?: number, method = 'mutate') => {
    const ownedOps = structuredClone(ops)
    const ownGeneration = ++generation
    writes.push({ ops: ownedOps, revision, method })
    const gate = nextMutation
    nextMutation = null
    const execute = async () => {
      if (gate) await gate
      if (failure === 'reject') throw new Error('transport disconnected')
      const current = queued ? host : snapshot
      const expected = revision ?? pendingRevision ?? snapshot.revision
      if (failure === 'false' || expected !== current.revision) {
        if (queued && ownGeneration === generation) {
          pendingRevision = undefined
          describeReads += 1
          describeStarted?.()
          describeStarted = null
          const recovery = nextDescribe
          nextDescribe = null
          if (recovery) await recovery
          snapshot = host
        }
        return false
      }
      const next = structuredClone(current.value)
      for (const op of ownedOps) {
        if (op.path.length === 1) {
          next[op.path[0] as keyof Config] = structuredClone(op.value) as Section
        } else {
          const section = next[op.path[0] as keyof Config]
          if (op.path[1] !== 'active') throw new Error('unsupported test operation')
          section.active = op.value as string
        }
      }
      host = { ...current, value: next, revision: current.revision + 1 }
      // DSH 0.2.2-rc.1 only folds the latest queued generation into the mirror.
      if (!queued || ownGeneration === generation) {
        pendingRevision = undefined
        snapshot = host
      } else {
        pendingRevision = host.revision
        superseded.push(host.revision)
      }
      const callback = afterAccept
      afterAccept = null
      callback?.()
      return true
    }
    if (!queued) return execute()
    const task = tail.then(execute)
    tail = task.then(
      () => {},
      () => {},
    )
    return task
  }
  const form = {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    set: (field: string, next: unknown) =>
      mutate([{ op: 'set', path: [field], value: next }], snapshot.revision, 'set'),
    mutate,
  }
  const instances = new Map<string, Hook[]>()
  let hooks: Hook[] = []
  let cursor = 0
  let pending = false
  let effects: (() => void)[] = []
  let root: Component | undefined
  let tree: Child
  const react = {
    createElement: (type: Element['type'], props: Props | null, ...children: Child[]): Element => ({
      type,
      props: props ?? {},
      children,
    }),
    useState: (initialValue: unknown) => {
      const index = cursor++
      const owner = hooks
      if (!owner[index])
        owner[index] = {
          value: typeof initialValue === 'function' ? initialValue() : initialValue,
        }
      const slot = owner[index] as Hook
      return [
        slot.value,
        (next: unknown) => {
          const value = typeof next === 'function' ? next(slot.value) : next
          if (!Object.is(value, slot.value)) {
            slot.value = value
            pending = true
          }
        },
      ]
    },
    useRef: (initialValue: unknown) => {
      const index = cursor++
      if (!hooks[index]) hooks[index] = { value: { current: initialValue } }
      return hooks[index]?.value
    },
    useEffect: (effect: () => void, deps: unknown[]) => {
      const index = cursor++
      const previous = hooks[index]
      if (!previous?.deps || deps.some((value, at) => !Object.is(value, previous.deps?.[at]))) {
        effects.push(effect)
        hooks[index] = { deps }
      }
    },
    useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown) => getSnapshot(),
  }
  runInNewContext(source, {
    window: {
      __ModuleLoader__: {
        load: ({ factory }: { factory: (require: (name: string) => unknown) => Props }) => {
          const exports = factory((name) => {
            if (name !== 'react') throw new Error(`unexpected client dependency: ${name}`)
            return react
          })
          root = exports.WebProvidersSection as Component
        },
      },
    },
  })
  const visit = (child: Child, path: string, seen: Set<string>): Child => {
    if (Array.isArray(child)) return child.map((next, at) => visit(next, `${path}.${at}`, seen))
    if (!child || typeof child !== 'object') return child
    const ownPath = `${path}:${child.props.key ?? ''}`
    if (typeof child.type === 'function') {
      seen.add(ownPath)
      hooks = instances.get(ownPath) ?? []
      instances.set(ownPath, hooks)
      cursor = 0
      return visit(
        child.type({ ...child.props, children: child.children }),
        `${ownPath}/${child.type.name}`,
        seen,
      )
    }
    return {
      ...child,
      children: child.children.map((next, at) => visit(next, `${ownPath}.${at}`, seen)),
    }
  }
  const render = () => {
    if (!root) throw new Error('client section was not exported')
    let rounds = 0
    do {
      if (++rounds > 25) throw new Error('hook render did not settle')
      pending = false
      effects = []
      const seen = new Set<string>()
      tree = visit({ type: root, props: { form, webForm }, children: [] }, 'root', seen)
      for (const path of instances.keys()) if (!seen.has(path)) instances.delete(path)
      for (const effect of effects) effect()
    } while (pending)
  }
  const all = (child: Child = tree): Element[] => {
    if (Array.isArray(child)) return child.flatMap((next) => all(next))
    if (!child || typeof child !== 'object') return []
    return [child, ...child.children.flatMap((next) => all(next))]
  }
  const text = (child: Child): string => {
    if (Array.isArray(child)) return child.map(text).join('')
    if (child && typeof child === 'object') return child.children.map(text).join('')
    return typeof child === 'string' || typeof child === 'number' ? String(child) : ''
  }
  const section = (kind = 'search') => {
    const found = all().find((node) => node.type === 'section' && node.props.key === kind)
    if (!found) throw new Error(`missing section ${kind}`)
    return found
  }
  const button = (label: string, kind = 'search') => {
    const found = all(section(kind)).find((node) => node.type === 'button' && text(node) === label)
    if (!found) throw new Error(`missing button ${label} in ${kind}`)
    return found
  }
  const routeButton = (kind: 'Search' | 'Fetch') =>
    all().find((node) => node.type === 'button' && text(node) === `Use this plugin for ${kind} now`)
  const field = (label: string, kind = 'search') => {
    const container = all(section(kind)).find(
      (node) => node.type === 'label' && text(node.children[0]) === label,
    )
    const control = container && all(container).find((node) => node.type === 'input')
    if (!control) throw new Error(`missing field ${label} in ${kind}`)
    return control
  }
  const select = (label: string) => {
    const found = all().find((node) => node.type === 'select' && node.props['aria-label'] === label)
    if (!found) throw new Error(`missing select ${label}`)
    return found
  }
  const json = (kind = 'search') => {
    const found = all(section(kind)).find(
      (node) => node.type === 'textarea' && String(node.props.placeholder).includes('x-tenant'),
    )
    if (!found) throw new Error('missing Other fields JSON')
    return found
  }
  const invoke = async (node: Element, event: string, value?: string) => {
    const handler = node.props[event] as (event?: unknown) => unknown
    const result = handler(value === undefined ? undefined : { target: { value } })
    render()
    try {
      return await result
    } finally {
      render()
    }
  }
  render()
  return {
    writes,
    mutate,
    superseded,
    describeReads: () => describeReads,
    invoke,
    afterAccept: (callback: () => void) => {
      afterAccept = callback
    },
    deferNext: () => {
      let release!: () => void
      nextMutation = new Promise<void>((resolve) => {
        release = resolve
      })
      return release
    },
    deferDescribe: () => {
      let release!: () => void
      const started = new Promise<void>((resolve) => {
        describeStarted = resolve
      })
      nextDescribe = new Promise<void>((resolve) => {
        release = resolve
      })
      return { release, started }
    },
    snapshot: () => snapshot,
    reject: (next: typeof failure) => {
      failure = next
    },
    refresh: (next: Config, revision = snapshot.revision + 1, repaint = true) => {
      snapshot = { ...snapshot, value: structuredClone(next), revision }
      host = snapshot
      if (repaint) render()
    },
    button,
    routeButton,
    clickRoute: (kind: 'Search' | 'Fetch') => {
      const node = routeButton(kind)
      if (!node) throw new Error(`missing route button for ${kind}`)
      return invoke(node, 'onClick')
    },
    field,
    select,
    json,
    text: () => text(tree),
    sectionText: (kind: string) => text(section(kind)),
    click: (label: string, kind = 'search') => invoke(button(label, kind), 'onClick'),
    change: (node: Element, value: string) => invoke(node, 'onChange', value),
    options: (node: Element) =>
      all(node)
        .filter((child) => child.type === 'option')
        .map((child) => child.props.value),
  }
}

describe('client draft revisions (4494843646)', () => {
  it('refreshes a pristine draft when another window adds a provider and rotates its key', async () => {
    const ui = mount()
    const remote = initial()
    remote.search.providers[0] = {
      ...remote.search.providers[0],
      label: 'Remote',
      apiKey: 'new-key',
    }
    remote.search.providers.push({ id: 'b', vendor: 'tavily' })
    ui.refresh(remote)
    await ui.click('Edit')
    expect(ui.field('Display namelabel').props.value).toBe('Remote')
    expect(ui.field('Key').props.value).toBe('new-key')
    expect(ui.text()).toContain('b')
  })

  it('fences a dirty save at its original revision and retains the draft on conflict', async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.field('Display namelabel'), 'Local')
    const remote = initial()
    remote.search.providers.push({ id: 'b', vendor: 'tavily' })
    remote.search.providers[0] = { ...remote.search.providers[0], apiKey: 'rotated-key' }
    ui.refresh(remote)
    await ui.click('Save')
    expect(ui.writes[0]).toMatchObject({ method: 'mutate', revision: 1 })
    expect(ui.snapshot().value).toEqual(remote)
    expect(ui.field('Display namelabel').props.value).toBe('Local')
    expect(ui.text()).toMatch(/rejected|changed|conflict/i)
  })

  it("refreshes the pristine kind without replacing another kind's local edits", async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.field('Display namelabel'), 'Local')
    const remote = initial()
    remote.fetch.providers[0] = { id: 'remote-fetch', vendor: 'http' }
    remote.fetch.active = 'remote-fetch'
    ui.refresh(remote)
    expect(ui.field('Display namelabel').props.value).toBe('Local')
    expect(ui.options(ui.select('Provider in use for Fetch'))).toContain('remote-fetch')
  })
})

describe('independent section revisions (4495421117)', () => {
  it.each([
    ['search', 'fetch'],
    ['fetch', 'search'],
  ])(
    'saves dirty %s and %s sections sequentially without losing either edit',
    async (first, second) => {
      const ui = mount()
      await ui.click('Edit', first)
      await ui.change(ui.field('Display namelabel', first), `${first} edit`)
      await ui.click('Edit', second)
      await ui.change(ui.field('Display namelabel', second), `${second} edit`)
      await ui.click('Save', first)
      await ui.click('Save', second)
      expect(ui.writes.map((write) => write.revision)).toEqual([1, 2])
      expect(ui.snapshot().value[first as keyof Config].providers[0]).toMatchObject({
        label: `${first} edit`,
      })
      expect(ui.snapshot().value[second as keyof Config].providers[0]).toMatchObject({
        label: `${second} edit`,
      })
    },
  )

  it('preserves invalid JSON and credential mode when only the other section changes', async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.select('Credential type'), 'apiKeyEnv')
    await ui.change(ui.json(), '{broken')
    const remote = initial()
    remote.fetch.providers[0] = { id: 'new-fetch', vendor: 'http' }
    ui.refresh(remote)
    expect(ui.select('Credential type').props.value).toBe('apiKeyEnv')
    expect(ui.json().props.value).toBe('{broken')
    expect(ui.button('Save').props.disabled).toBe(true)
    await ui.change(ui.json(), '{}')
    await ui.change(ui.field('Key'), 'SEARCH_KEY')
    await ui.click('Save')
    expect(ui.writes[0]).toMatchObject({ revision: 2 })
    expect(ui.snapshot().value.search.providers[0]).toMatchObject({ apiKeyEnv: 'SEARCH_KEY' })
    expect(ui.snapshot().value.fetch).toEqual(remote.fetch)
  })

  it('keeps editor-only credential mode and valid JSON text when only the other section changes', async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.select('Credential type'), 'apiKeyEnv')
    await ui.change(ui.json(), '{ }')
    const remote = initial()
    remote.fetch.providers[0] = { id: 'new-fetch', vendor: 'http' }
    ui.refresh(remote)
    expect(ui.select('Credential type').props.value).toBe('apiKeyEnv')
    expect(ui.json().props.value).toBe('{ }')
    await ui.change(ui.field('Key'), 'SEARCH_KEY')
    await ui.click('Save')
    expect(ui.writes[0]).toMatchObject({ revision: 2 })
    expect(ui.snapshot().value.search.providers[0]).toMatchObject({ apiKeyEnv: 'SEARCH_KEY' })
  })

  it('keeps a conflicting draft fenced when the other section is saved', async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.field('Display namelabel'), 'Local')
    await ui.click('Edit', 'fetch')
    await ui.change(ui.field('Display namelabel', 'fetch'), 'Fetch edit')
    ui.afterAccept(() => {
      const remote = structuredClone(ui.snapshot().value)
      remote.search.providers[0] = { ...remote.search.providers[0], apiKey: 'rotated-key' }
      ui.refresh(remote)
    })
    await ui.click('Save', 'fetch')
    await ui.click('Save')
    expect(ui.writes.map((write) => write.revision)).toEqual([1, 1])
    expect(ui.snapshot().value.search.providers[0]).toMatchObject({
      label: 'Original',
      apiKey: 'rotated-key',
    })
    await ui.click('Edit')
    expect(ui.field('Display namelabel').props.value).toBe('Local')
  })
})

describe('provider identity edits (4495421130)', () => {
  it('blocks switching to a renamed non-active provider until its draft is saved', async () => {
    const config = initial()
    config.search.providers.push({ id: 'b', vendor: 'tavily' })
    config.search.active = 'b'
    const ui = mount(config)
    await ui.click('Edit')
    await ui.change(ui.field('Nameid'), 'c')
    const active = ui.select('Provider in use for Search')
    expect(active.props.disabled).toBe(true)
    await ui.change(active, 'a')
    expect(ui.writes).toHaveLength(0)
    expect(ui.snapshot().value.search.active).toBe('b')
    await ui.click('Save')
    expect(ui.snapshot().value.search).toMatchObject({
      active: 'b',
      providers: [{ id: 'c' }, { id: 'b' }],
    })
    expect(ui.select('Provider in use for Search').props.disabled).toBe(false)
    await ui.change(ui.select('Provider in use for Search'), 'c')
    expect(ui.snapshot().value.search.active).toBe('c')
  })

  it.each(['Add provider', 'Delete'])(
    'blocks immediate switching after %s changes membership',
    async (action) => {
      const config = initial()
      config.search.providers.push({ id: 'b', vendor: 'tavily' })
      const ui = mount(config)
      await ui.click(action)
      expect(ui.select('Provider in use for Search').props.disabled).toBe(true)
      await ui.change(ui.select('Provider in use for Search'), 'b')
      expect(ui.writes).toHaveLength(0)
      expect(ui.snapshot().value.search.active).toBe('a')
    },
  )
})

describe('in-flight provider identity edits (4504537206)', () => {
  it.each([
    ['search', 'Name'],
    ['search', 'JSON'],
    ['fetch', 'Name'],
    ['fetch', 'JSON'],
  ] as const)(
    'locks %s identity changes through %s until a switch settles',
    async (kind, input) => {
      const config = initial()
      config[kind] = {
        active: 'b',
        providers: [
          { id: 'a', vendor: 'url' },
          { id: 'b', vendor: 'url' },
        ],
      }
      const ui = mount(config)
      await ui.click('Edit', kind)
      const release = ui.deferNext()
      const switching = ui.change(
        ui.select(`Provider in use for ${kind === 'search' ? 'Search' : 'Fetch'}`),
        'a',
      )
      const nameDisabled = ui.field('Nameid', kind).props.disabled
      const jsonDisabled = ui.json(kind).props.disabled
      try {
        if (input === 'Name') await ui.change(ui.field('Nameid', kind), 'c')
        else await ui.change(ui.json(kind), '{"id":"c"}')
        await ui.change(ui.field('Display namelabel', kind), 'Local')
      } finally {
        release()
        await switching
      }
      await ui.click('Save', kind)
      expect(ui.snapshot().value[kind]).toMatchObject({
        active: 'a',
        providers: [{ id: 'a', label: 'Local' }, { id: 'b' }],
      })
      expect(ui.writes.map((write) => write.revision)).toEqual([1, 2])
      expect(nameDisabled).toBe(true)
      expect(jsonDisabled).toBe(true)
      await ui.click('Edit', kind)
      expect(ui.field('Nameid', kind).props.disabled).toBe(false)
      expect(ui.json(kind).props.disabled).toBe(false)
      if (input === 'Name') await ui.change(ui.field('Nameid', kind), 'c')
      else await ui.change(ui.json(kind), '{"id":"c"}')
      await ui.click('Save', kind)
      expect(ui.snapshot().value[kind]).toMatchObject({
        active: 'c',
        providers: [{ id: 'c', label: 'Local' }, { id: 'b' }],
      })
    },
  )

  it.each([
    ['search', 'Name'],
    ['search', 'JSON'],
    ['fetch', 'Name'],
    ['fetch', 'JSON'],
  ] as const)(
    'keeps %s %s locked when the opposite section attempts a write',
    async (kind, input) => {
      const config = initial()
      for (const key of ['search', 'fetch'] as const) {
        config[key] = {
          active: 'b',
          providers: [
            { id: 'a', vendor: 'url' },
            { id: 'b', vendor: 'url' },
          ],
        }
      }
      const ui = mount(config)
      await ui.click('Edit', kind)
      await ui.change(ui.field('Display namelabel', kind), 'Local')
      const release = ui.deferNext()
      const switching = ui.change(
        ui.select(`Provider in use for ${kind === 'search' ? 'Search' : 'Fetch'}`),
        'a',
      )
      const otherSwitch = ui.change(
        ui.select(`Provider in use for ${kind === 'search' ? 'Fetch' : 'Search'}`),
        'a',
      )
      const lockedAfterStart =
        ui.field('Nameid', kind).props.disabled && ui.json(kind).props.disabled
      let lockedAfterSettlement: unknown
      try {
        if (input === 'Name') await ui.change(ui.field('Nameid', kind), 'c')
        else await ui.change(ui.json(kind), '{"id":"c"}')
        await otherSwitch
        expect(ui.writes).toHaveLength(1)
        lockedAfterSettlement =
          ui.field('Nameid', kind).props.disabled && ui.json(kind).props.disabled
        if (input === 'Name') await ui.change(ui.field('Nameid', kind), 'c')
        else await ui.change(ui.json(kind), '{"id":"c"}')
      } finally {
        release()
        await Promise.all([switching, otherSwitch])
      }
      await ui.click('Save', kind)
      expect(ui.snapshot().value[kind]).toMatchObject({
        active: 'a',
        providers: [{ id: 'a', label: 'Local' }, { id: 'b' }],
      })
      expect(lockedAfterStart).toBe(true)
      expect(lockedAfterSettlement).toBe(true)
    },
  )

  it.each(['reject', 'false'] as const)(
    'unlocks identity edits after a deferred %s',
    async (failure) => {
      const config = initial()
      config.search.providers.push({ id: 'b', vendor: 'url' })
      const ui = mount(config)
      await ui.click('Edit')
      ui.reject(failure)
      const release = ui.deferNext()
      const switching = ui.change(ui.select('Provider in use for Search'), 'b')
      release()
      await switching
      expect(ui.field('Nameid').props.disabled).toBe(false)
      expect(ui.json().props.disabled).toBe(false)
      expect(ui.snapshot().value.search.active).toBe('a')
      ui.reject(null)
      await ui.change(ui.field('Nameid'), 'c')
      await ui.click('Save')
      expect(ui.snapshot().value.search.active).toBe('c')
    },
  )
})

describe('shared namespace writes (4505996639)', () => {
  it('models superseded host responses and delayed conflict recovery', async () => {
    const ui = mount(initial(), { queued: true })
    const release = ui.deferNext()
    const describe = ui.deferDescribe()
    const first = ui.mutate([{ op: 'set', path: ['search', 'active'], value: '' }], 1)
    const second = ui.mutate([{ op: 'set', path: ['fetch', 'active'], value: '' }], 1)
    try {
      release()
      expect(await first).toBe(true)
      expect(ui.superseded).toEqual([2])
      await describe.started
      expect(ui.describeReads()).toBe(1)
      expect(ui.snapshot().revision).toBe(1)
    } finally {
      release()
      describe.release()
      await Promise.all([first, second])
    }
    expect(await second).toBe(false)
    expect(ui.describeReads()).toBe(1)
    expect(ui.snapshot().revision).toBe(2)
    expect(ui.snapshot().value).toMatchObject({
      search: { active: '' },
      fetch: { active: 'plain' },
    })
  })

  it.each([
    ['search', 'switch', 'switch'],
    ['search', 'switch', 'save'],
    ['search', 'save', 'switch'],
    ['search', 'save', 'save'],
    ['fetch', 'switch', 'switch'],
    ['fetch', 'switch', 'save'],
    ['fetch', 'save', 'switch'],
    ['fetch', 'save', 'save'],
  ] as const)(
    'fences a competing write during %s %s, then permits %s at the fresh revision',
    async (kind, firstAction, secondAction) => {
      const other = kind === 'search' ? 'fetch' : 'search'
      const config = initial()
      for (const key of ['search', 'fetch'] as const) {
        config[key] = {
          active: 'b',
          providers: [
            { id: 'a', vendor: 'url' },
            { id: 'b', vendor: 'url' },
          ],
        }
      }
      const ui = mount(config, { queued: true })
      await ui.click('Edit', other)
      await ui.change(ui.field('Display namelabel', other), 'Other edit')
      await ui.click('Edit', kind)
      await ui.change(ui.field('Display namelabel', kind), 'First edit')
      const active = (key: string) =>
        ui.select(`Provider in use for ${key === 'search' ? 'Search' : 'Fetch'}`)
      // Retain a pre-lock handler to exercise calls before React commits the busy state.
      const competingControl = secondAction === 'save' ? ui.button('Save', other) : active(other)
      const release = ui.deferNext()
      const describe = ui.deferDescribe()
      const first = firstAction === 'save' ? ui.click('Save', kind) : ui.change(active(kind), 'a')
      const disabled =
        secondAction === 'save'
          ? ui.button('Saving\u2026', other).props.disabled
          : active(other).props.disabled
      const competing = ui.invoke(
        competingControl,
        secondAction === 'save' ? 'onClick' : 'onChange',
        secondAction === 'save' ? undefined : 'a',
      )
      try {
        await ui.change(ui.field('Display namelabel', kind), 'In-flight edit')
      } finally {
        release()
        await first
        describe.release()
        await competing
      }
      if (firstAction === 'save') await ui.click('Edit', kind)
      expect(ui.field('Display namelabel', kind).props.value).toBe('In-flight edit')
      await ui.click('Save', kind)
      expect(ui.snapshot().value[kind].providers[0]).toMatchObject({ label: 'In-flight edit' })
      expect(ui.snapshot().value[kind].active).toBe(firstAction === 'switch' ? 'a' : 'b')
      expect(ui.writes.map((write) => write.revision)).toEqual([1, 2])
      expect(ui.superseded).toEqual([])
      expect(ui.describeReads()).toBe(0)
      expect(disabled).toBe(true)
      if (secondAction === 'save') await ui.click('Save', other)
      else await ui.change(active(other), 'a')
      expect(ui.writes[2]).toMatchObject({ revision: 3 })
      expect(ui.snapshot().value[other]).toMatchObject(
        secondAction === 'save'
          ? { active: 'b', providers: [{ label: 'Other edit' }, {}] }
          : { active: 'a' },
      )
    },
  )

  it.each([
    ['search', 'switch'],
    ['search', 'save'],
    ['fetch', 'switch'],
    ['fetch', 'save'],
  ] as const)('retains a real %s conflict after a queued %s settles', async (kind, action) => {
    const config = initial()
    config[kind].providers.push({ id: 'b', vendor: 'url' })
    const ui = mount(config, { queued: true })
    await ui.click('Edit', kind)
    await ui.change(ui.field('Display namelabel', kind), 'Local')
    ui.afterAccept(() => {
      void ui.change(ui.field('Display namelabel', kind), 'Newer local')
      const remote = structuredClone(ui.snapshot().value)
      remote[kind].providers[0] = { ...remote[kind].providers[0], apiKey: 'rotated-key' }
      ui.refresh(remote)
    })
    if (action === 'save') await ui.click('Save', kind)
    else
      await ui.change(
        ui.select(`Provider in use for ${kind === 'search' ? 'Search' : 'Fetch'}`),
        'b',
      )
    if (action === 'save') await ui.click('Edit', kind)
    await ui.click('Save', kind)
    expect(ui.writes.map((write) => write.revision)).toEqual([1, 1])
    expect(ui.snapshot().value[kind].providers[0]).toMatchObject({
      apiKey: 'rotated-key',
      ...(action === 'save' ? { label: 'Local' } : {}),
    })
    expect(ui.field('Display namelabel', kind).props.value).toBe('Newer local')
    expect(ui.text()).toMatch(/rejected/i)
  })
})

describe('persisted active switching (4494843659)', () => {
  it('shows a stale selection without marking the remaining provider active, then can repair it', async () => {
    const config = initial()
    config.search.active = 'missing'
    const ui = mount(config)
    const active = () => ui.select('Provider in use for Search')
    expect(active().props.value).toBe('missing')
    expect(active().props.disabled).toBe(false)
    expect(ui.options(active())).toEqual(['missing', '', 'a'])
    expect(ui.sectionText('search')).toContain('Unavailable selection')
    expect(ui.sectionText('search')).toContain('The saved provider no longer exists.')
    expect(ui.sectionText('search')).not.toContain('Active')
    expect(ui.writes).toHaveLength(0)

    await ui.change(active(), 'a')
    expect(active().props.value).toBe('a')
    expect(ui.snapshot().value.search.active).toBe('a')
    expect(ui.sectionText('search')).not.toContain('Unavailable selection')
    expect(ui.sectionText('search')).toContain('Active')
  })

  it('can clear a stale selection and keeps singleton automatic distinct from a named choice', async () => {
    const config = initial()
    config.search.active = 'missing'
    const ui = mount(config)
    const active = () => ui.select('Provider in use for Search')
    await ui.change(active(), '')
    expect(ui.snapshot().value.search.active).toBe('')
    expect(active().props.value).toBe('')
    expect(ui.sectionText('search')).toContain('Auto (only entry)')
    expect(ui.sectionText('search')).toContain('Active')
    expect(ui.sectionText('search')).not.toContain('Unavailable selection')
  })

  it('can clear an invalid selection after all providers have been removed', async () => {
    const config = initial()
    config.search = { active: 'missing', providers: [] }
    const ui = mount(config)
    const active = () => ui.select('Provider in use for Search')
    expect(active().props.value).toBe('missing')
    expect(active().props.disabled).toBe(false)
    await ui.change(active(), '')
    expect(ui.snapshot().value.search.active).toBe('')
    expect(active().props.value).toBe('')
    expect(active().props.disabled).toBe(true)
    expect(ui.sectionText('search')).not.toContain('Unavailable selection')
  })

  it('never offers or writes a draft-only provider id', async () => {
    const ui = mount()
    await ui.click('Add provider')
    const active = ui.select('Provider in use for Search')
    expect(ui.options(active)).toEqual(['', 'a'])
    await ui.change(active, 'search-2')
    expect(ui.writes).toHaveLength(0)
    expect(ui.snapshot().value.search.active).toBe('a')
  })

  it('keeps the persisted id in the dropdown while its draft is renamed', async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.field('Nameid'), 'renamed')
    expect(ui.options(ui.select('Provider in use for Search'))).toEqual(['', 'a'])
    expect(ui.select('Provider in use for Search').props.value).toBe('a')
  })
})

it('keeps a renamed draft active pointer valid after switching to its persisted id', async () => {
  const ui = mount()
  await ui.click('Edit')
  await ui.change(ui.field('Nameid'), 'renamed')
  await ui.change(ui.select('Provider in use for Search'), 'a')
  await ui.click('Save')
  expect(ui.snapshot().value.search).toMatchObject({
    active: 'renamed',
    providers: [{ id: 'renamed' }],
  })
})

it('does not reintroduce a deleted draft id into its active pointer', async () => {
  const config = initial()
  config.search.providers.push({ id: 'b', vendor: 'tavily' })
  const ui = mount(config)
  await ui.click('Edit')
  await ui.click('Delete')
  await ui.change(ui.select('Provider in use for Search'), 'a')
  await ui.click('Save')
  expect(ui.snapshot().value.search).toMatchObject({ active: '', providers: [{ id: 'b' }] })
})

describe('empty credential mode (4494843668)', () => {
  it('keeps Credential name selected before typing and writes only apiKeyEnv', async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.select('Credential type'), 'apiKeyEnv')
    expect(ui.select('Credential type').props.value).toBe('apiKeyEnv')
    expect(ui.field('Key').props.type).toBe('text')
    await ui.change(ui.field('Key'), 'MY_SEARCH_KEY')
    await ui.click('Save')
    expect(ui.snapshot().value.search.providers[0]).toMatchObject({ apiKeyEnv: 'MY_SEARCH_KEY' })
    expect(ui.snapshot().value.search.providers[0]).not.toHaveProperty('apiKey')
  })

  it('keeps reference mode after clearing, collapsing, and reopening the input', async () => {
    const config = initial()
    config.search.providers[0] = { ...config.search.providers[0], apiKeyEnv: 'OLD_KEY' }
    const ui = mount(config)
    await ui.click('Edit')
    await ui.change(ui.field('Key'), '')
    expect(ui.select('Credential type').props.value).toBe('apiKeyEnv')
    await ui.click('Collapse')
    await ui.click('Edit')
    expect(ui.select('Credential type').props.value).toBe('apiKeyEnv')
    await ui.change(ui.field('Key'), 'NEW_KEY')
    await ui.click('Save')
    expect(ui.snapshot().value.search.providers[0]).toMatchObject({ apiKeyEnv: 'NEW_KEY' })
  })
})

describe('rejected settings RPCs (4494843700)', () => {
  it('clears save busy state, retains edits, and permits retry after a rejection', async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.field('Display namelabel'), 'Local')
    ui.reject('reject')
    await expect(ui.click('Save')).resolves.toBeUndefined()
    expect(ui.button('Save').props.disabled).toBe(false)
    expect(ui.button('Cancel').props.disabled).toBe(false)
    expect(ui.field('Display namelabel').props.value).toBe('Local')
    expect(ui.text()).toMatch(/retry/i)
    ui.reject(null)
    await ui.click('Save')
    expect(ui.snapshot().value.search.providers[0]).toMatchObject({ label: 'Local' })
  })

  it('clears switch busy state and permits retry after a rejection', async () => {
    const config = initial()
    config.search.providers.push({ id: 'b', vendor: 'tavily' })
    const ui = mount(config)
    ui.reject('reject')
    await expect(ui.change(ui.select('Provider in use for Search'), 'b')).resolves.toBeUndefined()
    expect(ui.select('Provider in use for Search').props.disabled).toBe(false)
    expect(ui.button('Edit').props.disabled).toBe(false)
    expect(ui.text()).toMatch(/retry/i)
    expect(ui.snapshot().value.search.active).toBe('a')
    ui.reject(null)
    await ui.change(ui.select('Provider in use for Search'), 'b')
    expect(ui.snapshot().value.search.active).toBe('b')
  })
})

describe('Other fields JSON validation (4494843706)', () => {
  it('disables and guards the editor save while JSON is invalid', async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.json(), '{broken')
    expect(ui.button('Save').props.disabled).toBe(true)
    await ui.click('Save')
    expect(ui.writes).toHaveLength(0)
    expect(ui.json().props.value).toBe('{broken')
  })

  it('keeps collapsed invalid text and blocks the footer save until corrected', async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.field('Display namelabel'), 'Local')
    await ui.change(ui.json(), '{broken')
    await ui.click('Collapse')
    expect(ui.button('Save').props.disabled).toBe(true)
    await ui.click('Save')
    expect(ui.writes).toHaveLength(0)
    await ui.click('Edit')
    expect(ui.json().props.value).toBe('{broken')
    await ui.change(ui.json(), '{"headers":{"x-tenant":"team-a"}}')
    expect(ui.button('Save').props.disabled).toBe(false)
    await ui.click('Save')
    expect(ui.snapshot().value.search.providers[0]).toMatchObject({
      label: 'Local',
      headers: { 'x-tenant': 'team-a' },
    })
  })

  it('lets Revert explicitly discard a collapsed invalid edit even without valid field edits', async () => {
    const ui = mount()
    await ui.click('Edit')
    await ui.change(ui.json(), '[]')
    await ui.click('Collapse')
    expect(ui.button('Save').props.disabled).toBe(true)
    await ui.click('Revert')
    await ui.click('Edit')
    expect(ui.json().props.value).toBe('')
    expect(ui.button('Save').props.disabled).toBe(false)
  })
})

it('keeps local edits when switching to a persisted provider, then saves at the accepted revision', async () => {
  const config = initial()
  config.search.providers.push({ id: 'b', vendor: 'tavily' })
  const ui = mount(config)
  await ui.click('Edit')
  await ui.change(ui.field('Display namelabel'), 'Local')
  await ui.change(ui.select('Provider in use for Search'), 'b')
  expect(ui.field('Display namelabel').props.value).toBe('Local')
  expect(ui.snapshot().value.search.providers[0]).toMatchObject({ label: 'Original' })
  await ui.click('Save')
  expect(ui.writes[1]).toMatchObject({ method: 'mutate', revision: 2 })
  expect(ui.snapshot().value.search).toMatchObject({
    active: 'b',
    providers: [{ label: 'Local' }, {}],
  })
})

it('does not rebase stale provider edits when a persisted active switch succeeds', async () => {
  const config = initial()
  config.search.providers.push({ id: 'b', vendor: 'tavily' })
  const ui = mount(config)
  await ui.click('Edit')
  await ui.change(ui.field('Display namelabel'), 'Local')
  config.search.providers[0] = { ...config.search.providers[0], apiKey: 'rotated-key' }
  ui.refresh(config)
  await ui.change(ui.select('Provider in use for Search'), 'b')
  await ui.click('Save')
  expect(ui.writes[1]).toMatchObject({ method: 'mutate', revision: 1 })
  expect(ui.snapshot().value.search.providers[0]).toMatchObject({
    apiKey: 'rotated-key',
    label: 'Original',
  })
})

it('refreshes a successfully saved draft from later host snapshots', async () => {
  const ui = mount()
  await ui.click('Edit')
  await ui.change(ui.field('Display namelabel'), 'Local')
  await ui.click('Save')
  const remote = initial()
  remote.search.providers[0] = { ...remote.search.providers[0], label: 'Later remote' }
  ui.refresh(remote)
  await ui.click('Edit')
  expect(ui.field('Display namelabel').props.value).toBe('Later remote')
})

it('does not save empty credential fields', async () => {
  const ui = mount()
  await ui.click('Edit')
  await ui.change(ui.select('Credential type'), 'apiKeyEnv')
  await ui.click('Save')
  expect(ui.snapshot().value.search.providers[0]).not.toHaveProperty('apiKey')
  expect(ui.snapshot().value.search.providers[0]).not.toHaveProperty('apiKeyEnv')
})

it('retains edits and clears busy when the host resolves a write to false', async () => {
  const ui = mount()
  await ui.click('Edit')
  await ui.change(ui.field('Display namelabel'), 'Local')
  ui.reject('false')
  await ui.click('Save')
  expect(ui.field('Display namelabel').props.value).toBe('Local')
  expect(ui.button('Save').props.disabled).toBe(false)
  expect(ui.text()).toMatch(/rejected|changed|conflict/i)
})

it('discards invalid JSON when its provider is deleted', async () => {
  const ui = mount()
  await ui.click('Edit')
  await ui.change(ui.json(), '{broken')
  await ui.click('Delete')
  await ui.click('Add provider')
  expect(ui.button('Save').props.disabled).toBe(false)
  await ui.click('Save')
  expect(ui.snapshot().value.search.providers).toHaveLength(1)
})

describe('client loading states', () => {
  it('loads as a dependency-free client module', () => {
    expect(mount().text()).toContain('Web search / fetch')
  })
})

it('does not rebase dirty edits over a newer snapshot arriving as an active write settles', async () => {
  const config = initial()
  config.search.providers.push({ id: 'b', vendor: 'tavily' })
  const ui = mount(config)
  await ui.click('Edit')
  await ui.change(ui.field('Display namelabel'), 'Local')
  ui.afterAccept(() => {
    const remote = structuredClone(ui.snapshot().value)
    remote.search.providers[0] = { ...remote.search.providers[0], apiKey: 'rotated-key' }
    ui.refresh(remote)
  })
  await ui.change(ui.select('Provider in use for Search'), 'b')
  await ui.click('Save')
  expect(ui.writes[1]).toMatchObject({ method: 'mutate', revision: 1 })
  expect(ui.snapshot().value.search.providers[0]).toMatchObject({
    apiKey: 'rotated-key',
    label: 'Original',
  })
})

it('keeps newer local edits without adopting remote credential changes during save settlement', async () => {
  const ui = mount()
  await ui.click('Edit')
  await ui.change(ui.field('Display namelabel'), 'First edit')
  ui.afterAccept(() => {
    void ui.change(ui.field('Display namelabel'), 'Second edit')
    const remote = structuredClone(ui.snapshot().value)
    remote.search.providers[0] = { ...remote.search.providers[0], apiKey: 'rotated-key' }
    ui.refresh(remote)
  })
  await ui.click('Save')
  await ui.click('Edit')
  expect(ui.field('Display namelabel').props.value).toBe('Second edit')
  await ui.click('Save')
  expect(ui.writes[1]).toMatchObject({ method: 'mutate', revision: 1 })
  expect(ui.snapshot().value.search.providers[0]).toMatchObject({
    label: 'First edit',
    apiKey: 'rotated-key',
  })
})

describe('profile web routing', () => {
  it.each([
    ['Search', 'searchProvider', { searchProvider: 'custom', fetchProvider: 'http' }],
    ['Fetch', 'fetchProvider', { searchProvider: 'deepseek-official', fetchProvider: 'custom' }],
  ] as const)(
    'switches only %s and displays alternate IDs without claiming failure',
    async (kind, field, before) => {
      const webForm = routeForm(before)
      const ui = mount(initial(), { webForm })
      expect(ui.text()).toContain(`Search route: ${before.searchProvider}`)
      expect(ui.text()).toContain(`Fetch route: ${before.fetchProvider}`)
      expect(ui.text()).not.toContain('fail before')
      expect(ui.text()).toContain('does not save provider edits')
      await ui.clickRoute(kind)
      expect(webForm.writes).toEqual([
        { ops: [{ op: 'set', path: [field], value: 'web-providers' }], revision: 10 },
      ])
      expect(webForm.getSnapshot().value).toEqual({ ...before, [field]: 'web-providers' })
      expect(ui.routeButton(kind)).toBeUndefined()
      expect(ui.writes).toEqual([])
    },
  )

  it('lets both stale fields be corrected independently at their actual revisions', async () => {
    const webForm = routeForm({ searchProvider: 'custom', fetchProvider: 'custom' })
    const ui = mount(initial(), { webForm })
    await ui.clickRoute('Search')
    expect(webForm.getSnapshot().value).toEqual({
      searchProvider: 'web-providers',
      fetchProvider: 'custom',
    })
    await ui.clickRoute('Fetch')
    expect(webForm.writes.map((write) => [write.ops[0]?.path[0], write.revision])).toEqual([
      ['searchProvider', 10],
      ['fetchProvider', 11],
    ])
    expect(webForm.getSnapshot().value).toEqual({
      searchProvider: 'web-providers',
      fetchProvider: 'web-providers',
    })
  })

  it('shows an omitted field as Automatic without conflating it with an explicit empty ID', () => {
    const ui = mount(initial(), { webForm: routeForm({ fetchProvider: '' }) })
    expect(ui.text()).toContain('Search route: Automatic / not specified')
    expect(ui.text()).toContain('Fetch route: ""')
  })

  it('does not route to an empty, draft-only, stale, or ambiguous saved selection', async () => {
    const config = initial()
    config.fetch = { providers: [] }
    const webForm = routeForm({ searchProvider: 'custom', fetchProvider: 'http' })
    const ui = mount(config, { webForm })
    expect(ui.routeButton('Fetch')?.props.disabled).toBe(true)
    await ui.click('Add provider', 'fetch')
    expect(ui.routeButton('Fetch')?.props.disabled).toBe(true)
    expect(ui.text()).toContain('Save or discard the edits for this tool')
    // Guard the handler as well as the disabled button.
    await ui.clickRoute('Fetch')
    expect(webForm.writes).toEqual([])
    expect(ui.routeButton('Search')?.props.disabled).toBe(false)

    for (const next of [
      { active: 'removed', providers: [{ id: 'a', vendor: 'url' }] },
      {
        providers: [
          { id: 'a', vendor: 'url' },
          { id: 'b', vendor: 'jina' },
        ],
      },
    ]) {
      const clean = mount({ ...config, search: next }, { webForm })
      expect(clean.routeButton('Search')?.props.disabled).toBe(true)
    }
  })

  it('requires saving or discarding a relevant draft even when the saved list was usable', async () => {
    const webForm = routeForm({ searchProvider: 'custom', fetchProvider: 'http' })
    const ui = mount(initial(), { webForm })
    await ui.click('Edit')
    await ui.change(ui.field('Display namelabel'), 'Only in draft')
    expect(ui.routeButton('Search')?.props.disabled).toBe(true)
    expect(ui.routeButton('Fetch')?.props.disabled).toBe(false)
    await ui.clickRoute('Search')
    expect(webForm.writes).toEqual([])
    await ui.click('Cancel')
    expect(ui.routeButton('Search')?.props.disabled).toBe(false)
    await ui.clickRoute('Search')
    expect(ui.writes).toEqual([])
  })

  it('shares a synchronous lock across both actions and ignores repeated attempts in flight', async () => {
    const webForm = routeForm({})
    const ui = mount(initial(), { webForm })
    const search = ui.routeButton('Search')
    const fetch = ui.routeButton('Fetch')
    if (!search || !fetch) throw new Error('missing route button')
    const release = webForm.defer()
    const write = ui.invoke(search, 'onClick')
    expect(ui.routeButton('Search')?.props.disabled).toBe(true)
    expect(ui.routeButton('Fetch')?.props.disabled).toBe(true)
    await ui.invoke(search, 'onClick')
    await ui.invoke(fetch, 'onClick')
    expect(webForm.writes).toHaveLength(1)
    release()
    await write
    expect(ui.routeButton('Fetch')?.props.disabled).toBe(false)
  })

  it('does not apply an already stale rendered choice or rebase during an external edit', async () => {
    const webForm = routeForm({ searchProvider: 'custom', fetchProvider: 'http' })
    const ui = mount(initial(), { webForm })
    webForm.external({ searchProvider: 'custom', fetchProvider: 'other-fetch' })
    await ui.clickRoute('Search')
    expect(webForm.writes).toEqual([])
    expect(ui.text()).toContain('Settings changed.')

    const release = webForm.defer()
    const write = ui.clickRoute('Search')
    webForm.external({ searchProvider: 'other-search', fetchProvider: 'third-fetch' }, false)
    release()
    await write
    expect(webForm.writes[0]?.revision).toBe(11)
    expect(ui.text()).toContain('The host did not accept the switch.')
    expect(webForm.getSnapshot().value).toEqual({
      searchProvider: 'other-search',
      fetchProvider: 'third-fetch',
    })
    await ui.clickRoute('Search')
    expect(webForm.writes[1]?.revision).toBe(12)
    expect(webForm.getSnapshot().value.fetchProvider).toBe('third-fetch')
  })

  it('does not switch from a rendered provider that is no longer in the saved section', async () => {
    const webForm = routeForm({ searchProvider: 'custom', fetchProvider: 'http' })
    const ui = mount(initial(), { webForm })
    const next = initial()
    next.search = { providers: [] }
    ui.refresh(next, 2, false)
    // The real handler rechecks the accepted plugin settings before dispatching.
    await ui.clickRoute('Search')
    expect(webForm.writes).toEqual([])
    expect(ui.text()).toContain('Settings changed.')
    expect(ui.routeButton('Search')?.props.disabled).toBe(true)
  })

  it('enables a newly configured singleton only after the plugin save', async () => {
    const setup = initial()
    setup.fetch = { providers: [] }
    const webForm = routeForm({ searchProvider: 'custom', fetchProvider: 'http' })
    const ui = mount(setup, { webForm })
    await ui.click('Add provider', 'fetch')
    expect(ui.routeButton('Fetch')?.props.disabled).toBe(true)
    await ui.click('Save', 'fetch')
    expect(ui.routeButton('Fetch')?.props.disabled).toBe(false)
    await ui.clickRoute('Fetch')
    expect(webForm.getSnapshot().value).toEqual({
      searchProvider: 'custom',
      fetchProvider: 'web-providers',
    })
    expect(ui.writes).toHaveLength(1)
  })

  it('unlocks after a refusal, but does not blindly retry an uncertain transport result', async () => {
    const webForm = routeForm({ searchProvider: 'custom', fetchProvider: 'http' })
    const ui = mount(initial(), { webForm })
    webForm.reply('false')
    await ui.clickRoute('Search')
    expect(ui.routeButton('Search')?.props.disabled).toBe(false)
    const original = ui.routeButton('Search')
    if (!original) throw new Error('missing Search action')
    webForm.reply('reject')
    await ui.clickRoute('Search')
    expect(ui.text()).toContain('Could not confirm the switch.')
    expect(ui.routeButton('Search')?.props.disabled).toBe(true)
    expect(ui.routeButton('Fetch')?.props.disabled).toBe(true)
    await ui.invoke(original, 'onClick')
    expect(webForm.writes).toHaveLength(2)
    webForm.external({ searchProvider: 'custom', fetchProvider: 'http' })
    expect(ui.routeButton('Search')?.props.disabled).toBe(true)
    await ui.click('Edit') // Refresh the synthetic view after the authoritative update.
    expect(ui.routeButton('Search')?.props.disabled).toBe(false)
  })

  it('takes route labels from the mirror even if a write is accepted without publishing its view', async () => {
    const webForm = routeForm({ searchProvider: 'custom', fetchProvider: 'http' })
    const ui = mount(initial(), { webForm })
    webForm.reply('superseded')
    await ui.clickRoute('Search')
    expect(ui.text()).toContain('The host accepted the routing change.')
    expect(ui.text()).toContain('Search route: custom')
    expect(webForm.host().value.searchProvider).toBe('web-providers')
  })

  it.each([
    [undefined, 'This host does not expose the web row'],
    [routeForm({}, { status: 'unavailable' }), 'This host does not expose the web row'],
    [routeForm({}, { status: 'loading' }), 'Loading profile web routing'],
    [routeForm({}, { writable: false }), 'The host settings are read-only'],
    [routeForm({}, { revision: undefined }), 'No current routing revision'],
  ] as const)(
    'does not offer a write without a ready, writable revision (%s)',
    (webForm, message) => {
      const ui = mount(initial(), { webForm })
      expect(ui.text()).toContain(message)
      expect(ui.routeButton('Search')).toBeUndefined()
      expect(ui.routeButton('Fetch')).toBeUndefined()
    },
  )
})
