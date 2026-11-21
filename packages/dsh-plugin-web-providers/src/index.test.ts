import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import type { Context } from '@deepseek-ai/cordis'
import type { WebFetchProvider, WebSearchProvider } from '@deepseek-ai/dsh-web'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { apply, type Config, name, PROVIDER_ID, resolveSelection } from './index.js'

interface Mounted {
  search: WebSearchProvider
  fetch: WebFetchProvider
}

/** Mount the plugin against the two seam registries it declares. */
function mount(config: Config, credentials: Record<string, string> = {}): Mounted {
  const registered: { search?: WebSearchProvider; fetch?: WebFetchProvider } = {}
  const ctx = {
    web: {
      registerSearchProvider(provider: WebSearchProvider): () => void {
        registered.search = provider
        return () => {}
      },
      registerFetchProvider(provider: WebFetchProvider): () => void {
        registered.fetch = provider
        return () => {}
      },
    },
    // The plugin reads credentials through `ctx.get('credentials')`.
    get(service: string): unknown {
      if (service !== 'credentials') return undefined
      return { resolve: async (ref: string) => ({ value: credentials[ref] }) }
    },
  } as unknown as Context

  apply(ctx, config)

  if (registered.search === undefined) throw new Error('plugin registered no search provider')
  if (registered.fetch === undefined) throw new Error('plugin registered no fetch provider')
  return { search: registered.search, fetch: registered.fetch }
}

const SEARCH_ONE: Config = {
  search: {
    active: 'main',
    providers: [{ id: 'main', vendor: 'url', url: 'https://example.test/search?q={query}' }],
  },
  fetch: { active: 'plain', providers: [{ id: 'plain', vendor: 'http' }] },
}

describe('mounting', () => {
  it('keeps the Loader identity equal to the patch row id', () => {
    expect(name).toBe('web-providers')
    expect(PROVIDER_ID).toBe(name)
  })

  it('registers exactly one provider per capability, under the plugin id', () => {
    const { search, fetch } = mount(SEARCH_ONE)
    expect(search.id).toBe(PROVIDER_ID)
    expect(fetch.id).toBe(PROVIDER_ID)
  })

  it('reports an empty list as unavailable without touching the network', () => {
    const { search, fetch } = mount({})
    expect(search.available()).toBe(false)
    expect(fetch.available()).toBe(false)
  })

  it('reports a configured list as available even when the key is missing', () => {
    const { search } = mount({ search: { providers: [{ id: 'main', vendor: 'tavily' }] } })
    expect(search.available()).toBe(true)
  })
})

describe('entry selection', () => {
  it('uses the only entry when active is blank', () => {
    const selection = resolveSelection({ search: { providers: [{ id: 'solo' }] } }, 'search')
    expect(selection.entry?.id).toBe('solo')
  })

  it('prefers the named entry', () => {
    const selection = resolveSelection(
      { search: { active: 'b', providers: [{ id: 'a' }, { id: 'b' }] } },
      'search',
    )
    expect(selection.entry?.id).toBe('b')
  })
})

describe('failure messages', () => {
  it('names the missing configuration when nothing is set', async () => {
    const { search } = mount({})
    await expect(search.search({ query: 'x' })).rejects.toThrow(/no search provider is configured/u)
  })

  it('names the entries when active points at nothing', async () => {
    const { search } = mount({
      search: {
        active: 'ghost',
        providers: [{ id: 'real', vendor: 'url', url: 'https://x.test/' }],
      },
    })
    await expect(search.search({ query: 'x' })).rejects.toThrow(
      /"ghost", which matches none of real/u,
    )
  })

  it('never echoes a pasted key back through the error', async () => {
    const { search } = mount({
      search: { providers: [{ id: 'main', vendor: 'tavily', apiKeyEnv: 'sk-live-abcdef123456' }] },
    })
    await expect(search.search({ query: 'x' })).rejects.toThrow(
      /a value that is not a credential name \(20 characters, hidden\)/u,
    )
  })

  it('still names a well-formed credential reference', async () => {
    const { search } = mount({
      search: { providers: [{ id: 'main', vendor: 'tavily', apiKeyEnv: 'MY_SEARCH_KEY' }] },
    })
    await expect(search.search({ query: 'x' })).rejects.toThrow(/"MY_SEARCH_KEY"/u)
  })
})

describe('custom url search', () => {
  let server: Server
  let base: string

  beforeAll(async () => {
    server = createServer((request, response) => {
      const url = new URL(request.url ?? '/', 'http://127.0.0.1')
      if (url.pathname === '/json') {
        response.writeHead(200, { 'content-type': 'application/json' })
        response.end(
          JSON.stringify({
            web: {
              results: [
                { link: 'https://a.example/1', title: 'A', description: 'first' },
                { link: 'https://b.example/2', title: 'B', description: 'second' },
                { link: 'https://c.example/3', title: 'C', description: 'third' },
              ],
            },
          }),
        )
        return
      }
      if (url.pathname === '/text') {
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.end(`answer\n[Docs](https://docs.example/x) and https://other.example/y`)
        return
      }
      if (url.pathname.startsWith('/prefix/')) {
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.end(`appended ${decodeURIComponent(url.pathname.slice('/prefix/'.length))}`)
        return
      }
      if (url.pathname === '/complete') {
        response.writeHead(200, { 'content-type': 'text/plain' })
        response.end(`q=${url.searchParams.get('q')} n=${url.searchParams.get('n')}`)
        return
      }
      response.writeHead(404)
      response.end('missing')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  it('maps an unknown JSON shape onto sources', async () => {
    const search = mount({
      search: { providers: [{ id: 'j', vendor: 'url', url: `${base}/json?q={query}` }] },
    }).search
    const result = await search.search({ query: 'hello', maxResults: 2 })
    expect(result.sources).toEqual([
      { url: 'https://a.example/1', title: 'A', snippet: 'first' },
      { url: 'https://b.example/2', title: 'B', snippet: 'second' },
    ])
    expect(result.truncated).toBe(true)
  })

  it('turns a text answer into content plus linked sources', async () => {
    const search = mount({
      search: { providers: [{ id: 't', vendor: 'url', url: `${base}/text?q={query}` }] },
    }).search
    const result = await search.search({ query: 'abc', maxResults: 5 })
    expect(result.content).toContain('answer')
    expect(result.sources.map((source) => source.url)).toEqual([
      'https://docs.example/x',
      'https://other.example/y',
    ])
  })

  it('appends the query to a prefix URL', async () => {
    const search = mount({
      search: { providers: [{ id: 'p', vendor: 'url', url: `${base}/prefix/` }] },
    }).search
    const result = await search.search({ query: 'a b/c', maxResults: 1 })
    expect(result.content).toBe('appended a b/c')
  })

  it('appends ?q= to a complete endpoint and keeps its own parameters', async () => {
    const search = mount({
      search: { providers: [{ id: 'c', vendor: 'url', url: `${base}/complete?n=5` }] },
    }).search
    const result = await search.search({ query: 'hello', maxResults: 1 })
    expect(result.content).toBe('q=hello n=5')
  })

  it('treats a missing vendor as a custom URL', async () => {
    const search = mount({
      search: { providers: [{ id: 'd', url: `${base}/text?q={query}` }] },
    }).search
    await expect(search.search({ query: 'x', maxResults: 1 })).resolves.toMatchObject({
      sources: expect.any(Array),
    })
  })

  it('sends a credential through the configured header', async () => {
    const seen: string[] = []
    const authServer = createServer((request, response) => {
      seen.push(String(request.headers['x-api-key']))
      response.writeHead(200, { 'content-type': 'application/json' })
      response.end(JSON.stringify({ results: [{ url: 'https://ok.example', title: 'ok' }] }))
    })
    await new Promise<void>((resolve) => authServer.listen(0, '127.0.0.1', resolve))
    const port = (authServer.address() as AddressInfo).port
    try {
      const search = mount(
        {
          search: {
            providers: [
              {
                id: 'a',
                vendor: 'url',
                url: `http://127.0.0.1:${port}/s`,
                apiKeyEnv: 'REF',
                authHeader: 'x-api-key',
                authPrefix: '',
              },
            ],
          },
        },
        { REF: 'secret-value' },
      ).search
      await search.search({ query: 'q' })
      expect(seen).toEqual(['secret-value'])
    } finally {
      await new Promise<void>((resolve) => authServer.close(() => resolve()))
    }
  })

  it('rejects providerOptions that are not a JSON object', async () => {
    const search = mount({
      search: {
        providers: [
          {
            id: 'n',
            vendor: '9router',
            baseURL: 'http://x/v1',
            apiKey: 'k',
            providerOptions: '{oops',
          },
        ],
      },
    }).search
    await expect(search.search({ query: 'q' })).rejects.toThrow(
      /providerOptions is not valid JSON/u,
    )
  })
})

describe('custom url fetch', () => {
  it('substitutes {url} into the fetch template', async () => {
    const called: string[] = []
    const server = createServer((request, response) => {
      called.push(String(request.url))
      response.writeHead(200, { 'content-type': 'text/plain' })
      response.end('body')
    })
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const port = (server.address() as AddressInfo).port
    try {
      const fetchProvider = mount({
        fetch: {
          providers: [{ id: 'r', vendor: 'url', url: `http://127.0.0.1:${port}/reader?u={url}` }],
        },
      }).fetch
      const result = await fetchProvider.fetch({ url: 'https://target.example/page' })
      expect(called[0]).toBe('/reader?u=https%3A%2F%2Ftarget.example%2Fpage')
      expect(result.statusCode).toBe(200)
      expect(result.body).toEqual({ kind: 'text', content: 'body' })
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})
