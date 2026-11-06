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

/** Execute the actual client bundle with deterministic hooks, not a rendered browser. */
function mount(value = initial()) {
  let snapshot = { status: 'ready', value: structuredClone(value), revision: 1 }
  let failure: 'reject' | 'false' | null = null
  let afterAccept: (() => void) | null = null
  const writes: { ops: Op[]; revision: number | undefined; method: string }[] = []
  const mutate = async (ops: Op[], revision?: number, method = 'mutate') => {
    writes.push({ ops: structuredClone(ops), revision, method })
    if (failure === 'reject') throw new Error('transport disconnected')
    if (failure === 'false' || (revision !== undefined && revision !== snapshot.revision))
      return false
    const next = structuredClone(snapshot.value)
    for (const op of ops) {
      if (op.path.length === 1) {
        next[op.path[0] as keyof Config] = structuredClone(op.value) as Section
      } else {
        const section = next[op.path[0] as keyof Config]
        if (op.path[1] !== 'active') throw new Error('unsupported test operation')
        section.active = op.value as string
      }
    }
    snapshot = { ...snapshot, value: next, revision: snapshot.revision + 1 }
    const callback = afterAccept
    afterAccept = null
    callback?.()
    return true
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
      tree = visit({ type: root, props: { form }, children: [] }, 'root', seen)
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
  const json = () => {
    const found = all(section()).find(
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
    afterAccept: (callback: () => void) => {
      afterAccept = callback
    },
    snapshot: () => snapshot,
    reject: (next: typeof failure) => {
      failure = next
    },
    refresh: (next: Config, revision = snapshot.revision + 1) => {
      snapshot = { ...snapshot, value: structuredClone(next), revision }
      render()
    },
    button,
    field,
    select,
    json,
    text: () => text(tree),
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

describe('persisted active switching (4494843659)', () => {
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
