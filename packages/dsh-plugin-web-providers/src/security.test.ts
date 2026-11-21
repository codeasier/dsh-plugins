import { createServer, type RequestListener, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'

import type { Context } from '@deepseek-ai/cordis'
import { WebError, type WebFetchProvider, type WebSearchProvider } from '@deepseek-ai/dsh-web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apply, type Config, type ProviderSpec } from './index.js'

function mount(kind: 'search' | 'fetch', spec: ProviderSpec, key?: string) {
  const providers: { search?: WebSearchProvider; fetch?: WebFetchProvider } = {}
  const ctx = {
    web: {
      registerSearchProvider: (provider: WebSearchProvider) => {
        providers.search = provider
      },
      registerFetchProvider: (provider: WebFetchProvider) => {
        providers.fetch = provider
      },
    },
    get: () => ({ resolve: async () => ({ value: key }) }),
  } as unknown as Context
  apply(ctx, { [kind]: { providers: [spec] } } as Config)
  return providers as { search: WebSearchProvider; fetch: WebFetchProvider }
}

const servers: Server[] = []
async function serve(handler: RequestListener): Promise<string> {
  const server = createServer(handler)
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(
    servers
      .splice(0)
      .map((server) => new Promise<void>((resolve) => server.close(() => resolve()))),
  )
})

const SECRET = 'synthetic/key+never-leak'

describe('credential-safe errors', () => {
  it.each([
    'https://upstream.test/search?key=synthetic-validation-key bad',
    'ftp://user:synthetic-validation-key@upstream.test/search',
  ])('omits a malformed endpoint from validation errors: %s', async (url) => {
    const http = vi.fn()
    vi.stubGlobal('fetch', http)
    const { search } = mount('search', { id: 'u', vendor: 'url', url })
    const error = await search.search({ query: 'q' }).catch((error) => error)
    expect(error).toBeInstanceOf(WebError)
    expect(error.message).not.toContain('synthetic-validation-key')
    expect(http).not.toHaveBeenCalled()
  })

  it.each(['errors', 'error'])('redacts HTTP-200 gateway %s diagnostics', async (shape) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          shape === 'errors'
            ? { errors: [{ message: `denied ${SECRET}` }] }
            : { error: { message: `denied ${SECRET}` } },
        ),
      ),
    )
    const { search } = mount(
      'search',
      { id: 'g', vendor: '9router', baseURL: 'https://upstream.test', apiKeyEnv: 'SEARCH_KEY' },
      SECRET,
    )
    const error = await search.search({ query: 'q' }).catch((error) => error)
    expect(error.code).toBe('WEB_PROVIDER_ERROR')
    expect(error.message).not.toContain(SECRET)
  })

  it('does not expose a resolved Google key or a transport exception', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        throw new Error(`failed ${url} ${SECRET}`)
      }),
    )
    const { search } = mount(
      'search',
      { id: 'g', vendor: 'google-cse', apiKeyEnv: 'SEARCH_KEY', cx: 'cx' },
      SECRET,
    )
    const error = await search.search({ query: 'q' }).catch((error) => error)
    expect(error).toBeInstanceOf(WebError)
    expect(error.message).toContain('https://www.googleapis.com')
    expect(error.message).not.toContain(SECRET)
    expect(error.message).not.toContain(encodeURIComponent(SECRET))
    expect(error.message).not.toContain('key=')
  })

  it.each([
    ['url', 'x-api-key'],
    ['url', 'accept'],
    ['http-json', 'x-api-key'],
  ])('redacts credentials reflected by %s upstream errors using %s', async (vendor, authHeader) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                message: `denied ${SECRET} ${encodeURIComponent(SECRET)} https://upstream.test/path?token=${SECRET}`,
              },
            }),
            { status: 401 },
          ),
      ),
    )
    const { search } = mount(
      'search',
      {
        id: 'u',
        vendor,
        url: 'https://upstream.test/search',
        apiKeyEnv: 'SEARCH_KEY',
        authHeader,
        authPrefix: 'Token',
      },
      SECRET,
    )
    const error = await search.search({ query: 'q' }).catch((error) => error)
    expect(error.message).not.toContain(SECRET)
    expect(error.message).not.toContain(encodeURIComponent(SECRET))
    expect(error.code).toBe('WEB_PROVIDER_CREDENTIAL_MISSING')
  })

  it('never exposes custom URL userinfo, query credentials, or path tokens', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('transport failure')
      }),
    )
    const { search } = mount('search', {
      id: 'u',
      vendor: 'url',
      url: `https://user:synthetic-password@upstream.test/${SECRET}?token=synthetic-query`,
    })
    const error = await search.search({ query: 'q' }).catch((error) => error)
    for (const secret of ['synthetic-password', 'synthetic-query', SECRET])
      expect(error.message).not.toContain(secret)
  })
})

describe('bounded same-origin redirects', () => {
  it.each(['search', 'fetch'] as const)(
    'blocks credential forwarding for custom URL %s',
    async (kind) => {
      const received: string[] = []
      const target = await serve((request, response) => {
        received.push(String(request.headers['x-api-key']))
        response.end('leaked')
      })
      const source = await serve((_request, response) => {
        response.writeHead(302, { location: target })
        response.end()
      })
      const providers = mount(kind, {
        id: 'u',
        vendor: 'url',
        url: source,
        apiKey: SECRET,
        authHeader: 'x-api-key',
      })
      const result =
        kind === 'search'
          ? providers.search.search({ query: 'q' })
          : providers.fetch.fetch({ url: 'https://resource.test' })
      await expect(result).rejects.toMatchObject({ code: 'WEB_REDIRECT_BLOCKED' })
      expect(received).toEqual([])
    },
  )

  it.each(['http', 'jina'])('does not cross an origin in %s fetch', async (vendor) => {
    let hits = 0
    const target = await serve((_request, response) => {
      hits++
      response.end('unapproved')
    })
    const source = await serve((_request, response) => {
      response.writeHead(302, { location: target })
      response.end()
    })
    const { fetch } = mount('fetch', { id: 'f', vendor, baseURL: source })
    await expect(fetch.fetch({ url: source })).rejects.toMatchObject({
      code: 'WEB_REDIRECT_BLOCKED',
    })
    expect(hits).toBe(0)
  })

  it('allows relative same-origin redirects and preserves custom authentication', async () => {
    const seen: string[] = []
    const base = await serve((request, response) => {
      seen.push(String(request.headers['x-api-key']))
      if (request.url?.startsWith('/start')) {
        response.writeHead(302, { location: '/done' })
        response.end()
        return
      }
      response.writeHead(200, { 'content-type': 'text/plain' })
      response.end('done')
    })
    const { search } = mount('search', {
      id: 's',
      vendor: 'url',
      url: `${base}/start`,
      apiKey: SECRET,
      authHeader: 'x-api-key',
    })
    await expect(search.search({ query: 'q' })).resolves.toMatchObject({ content: 'done' })
    expect(seen).toEqual([SECRET, SECRET])
  })

  it('caps redirect loops before making an unbounded number of requests', async () => {
    let hits = 0
    const base = await serve((_request, response) => {
      hits++
      response.writeHead(302, { location: '/loop' })
      response.end()
    })
    const { fetch } = mount('fetch', { id: 'f', vendor: 'http' })
    await expect(fetch.fetch({ url: base })).rejects.toMatchObject({ code: 'WEB_REDIRECT_BLOCKED' })
    expect(hits).toBeLessThanOrEqual(6)
  })

  it.each(['ftp://upstream.test/a', 'http://user:password@127.0.0.1/secret'])(
    'validates redirect target %s',
    async (location) => {
      const fetchMock = vi.fn(
        async (_url: unknown, _init?: RequestInit) =>
          new Response(null, { status: 302, headers: { location } }),
      )
      vi.stubGlobal('fetch', fetchMock)
      const { fetch } = mount('fetch', { id: 'f', vendor: 'http' })
      await expect(fetch.fetch({ url: 'http://127.0.0.1/start' })).rejects.toBeInstanceOf(WebError)
      expect(fetchMock).toHaveBeenCalledTimes(1)
      expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' })
    },
  )

  it.each([301, 302, 303, 307, 308])(
    'applies fetch method semantics for a %s redirect',
    async (status) => {
      const calls: RequestInit[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn(async (_url, init) => {
          calls.push(init)
          return calls.length === 1
            ? new Response(null, { status, headers: { location: '/done' } })
            : Response.json({ results: [] })
        }),
      )
      const { search } = mount('search', {
        id: 's',
        vendor: 'http-json',
        url: 'https://upstream.test/start',
        method: 'POST',
      })
      await search.search({ query: 'q' })
      expect(calls).toHaveLength(2)
      expect(calls[1]?.method).toBe(status === 307 || status === 308 ? 'POST' : 'GET')
      expect(calls[1]?.body).toBe(
        status === 307 || status === 308
          ? JSON.stringify({ query: 'q', max_results: 8 })
          : undefined,
      )
    },
  )
})

describe('bounded HTML conversion', () => {
  it('handles an adversarial run of unclosed tags without quadratic work', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () => new Response('<'.repeat(64_000), { headers: { 'content-type': 'text/html' } }),
      ),
    )
    const { fetch } = mount('fetch', { id: 'f', vendor: 'http' })
    const started = performance.now()
    await fetch.fetch({ url: 'https://upstream.test' })
    expect(performance.now() - started).toBeLessThan(1000)
  })

  it('limits conversion input independently of the configured output limit', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(`${'x'.repeat(2_000_000)}<p>tail</p>`, {
            headers: { 'content-type': 'text/html' },
          }),
      ),
    )
    const { fetch } = mount('fetch', { id: 'f', vendor: 'http', maxBodyChars: 4_000_000 })
    const result = await fetch.fetch({ url: 'https://upstream.test' })
    expect(result.truncated).toBe(true)
    expect(result.body.content.length).toBeLessThanOrEqual(1_000_000)
    expect(result.body.content).not.toContain('tail')
  })

  it('retains readable blocks and entities while dropping comments/scripts/styles', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            '<style>hidden</style><!--hidden--><p>A &amp; B</p><script>hidden</script><div>C<br>D</div>',
            { headers: { 'content-type': 'text/html' } },
          ),
      ),
    )
    const { fetch } = mount('fetch', { id: 'f', vendor: 'http' })
    const result = await fetch.fetch({ url: 'https://upstream.test' })
    expect(result.body.content).toBe('A & B\nC\nD')
  })
})

describe('bounded body reads', () => {
  it.each(['url', 'http', 'jina'])(
    'maps a %s body timeout without reflecting transport details',
    async (vendor) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(
          async (_url, init) =>
            new Response(
              new ReadableStream({
                start(controller) {
                  init.signal.addEventListener('abort', () => controller.error(new Error(SECRET)), {
                    once: true,
                  })
                },
              }),
            ),
        ),
      )
      const { fetch } = mount('fetch', {
        id: 'f',
        vendor,
        url: 'https://upstream.test',
        timeoutMs: 10,
      })
      const error = await fetch.fetch({ url: 'https://upstream.test' }).catch((error) => error)
      expect(error).toBeInstanceOf(WebError)
      expect(error.code).toBe(vendor === 'url' ? 'WEB_TIMEOUT' : 'WEB_FETCH_TIMEOUT')
      expect(error.message).not.toContain(SECRET)
    },
  )
})

describe('host structured errors', () => {
  it('uses the host error superclass recognized by tool error metadata', async () => {
    const { search } = mount('search', { id: 't', vendor: 'tavily' })
    const error = await search.search({ query: 'q' }).catch((error) => error)
    expect(error).toBeInstanceOf(WebError)
    // The host pipeline extracts info only from this shared HarnessError base.
    const HarnessError = Object.getPrototypeOf(WebError)
    const info = error instanceof HarnessError ? { name: error.name, code: error.code } : undefined
    expect(info).toMatchObject({ code: 'WEB_PROVIDER_CREDENTIAL_MISSING' })
  })

  it('retains cancellation codes as WebError instances', async () => {
    const controller = new AbortController()
    controller.abort()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init) => {
        init.signal.throwIfAborted()
      }),
    )
    const { search } = mount('search', { id: 'u', vendor: 'url', url: 'https://upstream.test' })
    await expect(search.search({ query: 'q' }, controller.signal)).rejects.toBeInstanceOf(WebError)
    await expect(search.search({ query: 'q' }, controller.signal)).rejects.toMatchObject({
      code: 'WEB_ABORTED',
    })
  })
})
