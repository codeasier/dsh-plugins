import type { Context } from '@deepseek-ai/cordis'
import type { WebFetchProvider, WebSearchProvider } from '@deepseek-ai/dsh-web'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { apply, type Config, PROVIDER_ID, type ProviderSpec } from './index.js'

const API_KEY = 'synthetic-adapter-key'
const QUERY = 'a query & more'
const TARGET = 'https://target.example/article?a=1&b=two'
const SOURCE = { url: 'https://source.example/article', title: 'Source', snippet: 'A snippet' }

function mount(kind: 'search', spec: ProviderSpec): WebSearchProvider
function mount(kind: 'fetch', spec: ProviderSpec): WebFetchProvider
function mount(kind: 'search' | 'fetch', spec: ProviderSpec): WebSearchProvider | WebFetchProvider {
  const search: WebSearchProvider[] = []
  const fetch: WebFetchProvider[] = []
  const ctx = {
    web: {
      registerSearchProvider: (provider: WebSearchProvider) => {
        search.push(provider)
        return () => {}
      },
      registerFetchProvider: (provider: WebFetchProvider) => {
        fetch.push(provider)
        return () => {}
      },
    },
    get: (service: string) =>
      service === 'credentials'
        ? {
            resolve: async (ref: string) => ({
              value: ref === 'ADAPTER_KEY' ? API_KEY : undefined,
            }),
          }
        : undefined,
  } as unknown as Context
  const config: Config = { [kind]: { active: spec.id, providers: [spec] } }
  apply(ctx, config)
  expect(search).toHaveLength(1)
  expect(fetch).toHaveLength(1)
  expect(search[0]?.id).toBe(PROVIDER_ID)
  expect(fetch[0]?.id).toBe(PROVIDER_ID)
  const provider = kind === 'search' ? search[0] : fetch[0]
  if (provider === undefined) throw new Error(`missing ${kind} registration`)
  expect(provider.available()).toBe(true)
  return provider
}

function mockHTTP(payload: unknown, status = 200) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () =>
    typeof payload === 'string'
      ? new Response(payload, { status, headers: { 'content-type': 'text/plain' } })
      : Response.json(payload, { status }),
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

function sent(fetch: ReturnType<typeof mockHTTP>) {
  expect(fetch).toHaveBeenCalledTimes(1)
  const call = fetch.mock.calls[0]
  if (call === undefined) throw new Error('no HTTP request')
  const [input, init] = call
  expect(init?.signal).toBeInstanceOf(AbortSignal)
  return {
    url: String(input),
    method: init?.method ?? 'GET',
    headers: Object.fromEntries(new Headers(init?.headers)),
    body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('commercial search adapter contracts', () => {
  const cases = [
    {
      vendor: 'tavily',
      spec: { searchDepth: 'advanced', includeAnswer: false },
      endpoint: 'https://api.tavily.com/search',
      method: 'POST',
      headers: { authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
      body: {
        api_key: API_KEY,
        query: QUERY,
        max_results: 3,
        include_answer: false,
        search_depth: 'advanced',
      },
      payload: {
        answer: 'Answer',
        results: [{ url: SOURCE.url, title: SOURCE.title, content: SOURCE.snippet }],
      },
      content: 'Answer',
    },
    {
      vendor: 'brave',
      endpoint: `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(QUERY).replaceAll('%20', '+')}&count=3`,
      method: 'GET',
      headers: { 'x-subscription-token': API_KEY },
      payload: {
        web: { results: [{ url: SOURCE.url, title: SOURCE.title, description: SOURCE.snippet }] },
      },
    },
    {
      vendor: 'exa',
      endpoint: 'https://api.exa.ai/search',
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      body: { query: QUERY, numResults: 3, contents: { text: { maxCharacters: 800 } } },
      payload: { results: [{ url: SOURCE.url, title: SOURCE.title, text: SOURCE.snippet }] },
    },
    {
      vendor: 'serper',
      endpoint: 'https://google.serper.dev/search',
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'content-type': 'application/json' },
      body: { q: QUERY, num: 3 },
      payload: {
        organic: [{ link: SOURCE.url, title: SOURCE.title, snippet: SOURCE.snippet }],
        answerBox: { answer: 'Answer' },
      },
      content: 'Answer',
    },
    {
      vendor: 'google-cse',
      spec: { cx: 'engine-id' },
      endpoint: `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=engine-id&q=${encodeURIComponent(QUERY).replaceAll('%20', '+')}&num=3`,
      method: 'GET',
      headers: {},
      payload: { items: [{ link: SOURCE.url, title: SOURCE.title, snippet: SOURCE.snippet }] },
    },
    {
      vendor: 'firecrawl',
      endpoint: 'https://api.firecrawl.dev/v1/search',
      method: 'POST',
      headers: { authorization: `Bearer ${API_KEY}`, 'content-type': 'application/json' },
      body: { query: QUERY, limit: 3 },
      payload: {
        success: true,
        data: [{ url: SOURCE.url, title: SOURCE.title, description: SOURCE.snippet }],
      },
    },
  ]

  for (const test of cases) {
    it(`${test.vendor} sends its wire request and maps its response`, async () => {
      const http = mockHTTP(test.payload)
      const search = mount('search', {
        id: test.vendor,
        vendor: test.vendor,
        apiKeyEnv: 'ADAPTER_KEY',
        maxResults: 7,
        ...test.spec,
      })
      const result = await search.search({ query: QUERY, maxResults: 3 })
      expect(sent(http)).toEqual({
        url: test.endpoint,
        method: test.method,
        headers: { accept: 'application/json', ...test.headers },
        body: test.body,
      })
      expect(result).toEqual({
        sources: [SOURCE],
        truncated: false,
        ...(test.content === undefined ? {} : { content: test.content }),
      })
    })
  }

  it('Tavily requests an answer by default and uses the configured result limit', async () => {
    const http = mockHTTP({ results: [] })
    await mount('search', {
      id: 'tavily',
      vendor: 'tavily',
      apiKey: API_KEY,
      maxResults: 5,
    }).search({ query: QUERY })
    expect(sent(http).body).toEqual({
      api_key: API_KEY,
      query: QUERY,
      max_results: 5,
      include_answer: true,
    })
  })

  it('Google clamps the API result count to ten', async () => {
    const http = mockHTTP({ items: [] })
    await mount('search', {
      id: 'google',
      vendor: 'google-cse',
      apiKey: API_KEY,
      cx: 'engine-id',
    }).search({ query: QUERY, maxResults: 25 })
    expect(new URL(sent(http).url).searchParams.get('num')).toBe('10')
  })

  it('Jina encodes the query path and derives sources from its text answer', async () => {
    const text = `An answer [Source](${SOURCE.url}) and https://second.example/page`
    const http = mockHTTP(text)
    const result = await mount('search', {
      id: 'jina',
      vendor: 'jina',
      apiKeyEnv: 'ADAPTER_KEY',
      maxBodyChars: 9,
    }).search({ query: QUERY, maxResults: 1 })
    expect(sent(http)).toEqual({
      url: `https://s.jina.ai/${encodeURIComponent(QUERY)}`,
      method: 'GET',
      headers: { accept: 'text/plain', authorization: `Bearer ${API_KEY}` },
      body: undefined,
    })
    expect(result).toEqual({
      content: text.slice(0, 9),
      sources: [{ url: SOURCE.url, title: SOURCE.title }],
      truncated: true,
    })
  })

  it('maps a commercial HTTP authorization error to the seam error code', async () => {
    mockHTTP({ error: { message: 'Unauthorized' } }, 401)
    await expect(
      mount('search', { id: 'exa', vendor: 'exa', apiKey: API_KEY }).search({ query: QUERY }),
    ).rejects.toMatchObject({
      code: 'WEB_PROVIDER_CREDENTIAL_MISSING',
      message: expect.stringContaining('Unauthorized'),
    })
  })
})

describe('gateway and configurable search adapters', () => {
  it('9router forwards channel options and maps an object answer and metrics', async () => {
    const http = mockHTTP({
      answer: { source: 'gateway', text: 'Gateway answer', model: 'tavily' },
      results: [{ url: SOURCE.url, title: SOURCE.title, content: SOURCE.snippet }],
      metrics: { total_results_available: 4 },
    })
    const result = await mount('search', {
      id: 'gateway',
      vendor: '9router',
      baseURL: 'https://gateway.example/v1/',
      apiKeyEnv: 'ADAPTER_KEY',
      model: 'tavily',
      searchType: 'news',
      country: 'us',
      language: 'en',
      timeRange: 'week',
      domainFilter: 'example.com',
      providerOptions: '{"topic":"news"}',
    }).search({ query: QUERY, maxResults: 3 })
    expect(sent(http)).toEqual({
      url: 'https://gateway.example/v1/search',
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        authorization: `Bearer ${API_KEY}`,
      },
      body: {
        model: 'tavily',
        query: QUERY,
        max_results: 3,
        search_type: 'news',
        country: 'us',
        language: 'en',
        time_range: 'week',
        domain_filter: 'example.com',
        provider_options: { topic: 'news' },
      },
    })
    expect(result).toEqual({ content: 'Gateway answer', sources: [SOURCE], truncated: true })
  })

  it('9router surfaces a channel failure returned with HTTP 200', async () => {
    mockHTTP({ errors: [{ message: 'Channel unavailable' }], results: [] })
    await expect(
      mount('search', {
        id: 'gateway',
        vendor: '9router',
        baseURL: 'https://gateway.example/v1',
        apiKey: API_KEY,
      }).search({ query: QUERY }),
    ).rejects.toMatchObject({
      code: 'WEB_PROVIDER_ERROR',
      message: expect.stringContaining('Channel unavailable'),
    })
  })

  it('SearXNG requests JSON from its configured base and maps content snippets', async () => {
    const http = mockHTTP({
      results: [{ url: SOURCE.url, title: SOURCE.title, content: SOURCE.snippet }],
    })
    const result = await mount('search', {
      id: 'searx',
      vendor: 'searxng',
      baseURL: 'https://searx.example/root/',
    }).search({ query: QUERY, maxResults: 3 })
    const request = sent(http)
    expect(new URL(request.url).pathname).toBe('/root/search')
    expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual({
      q: QUERY,
      format: 'json',
    })
    expect(request).toMatchObject({ method: 'GET', headers: { accept: 'application/json' } })
    expect(result).toEqual({ sources: [SOURCE], truncated: false })
  })

  it('http-json maps nested result fields and substitutes GET placeholders', async () => {
    const http = mockHTTP({
      response: {
        answer: 'Mapped answer',
        hits: [{ document: { href: SOURCE.url, heading: SOURCE.title, summary: SOURCE.snippet } }],
      },
    })
    const result = await mount('search', {
      id: 'custom',
      vendor: 'http-json',
      url: 'https://custom.example/search?q={query}&limit={max}',
      apiKey: API_KEY,
      resultsPath: 'response.hits',
      urlField: 'document.href',
      titleField: 'document.heading',
      snippetField: 'document.summary',
      contentField: 'response.answer',
    }).search({ query: QUERY, maxResults: 3 })
    expect(sent(http)).toEqual({
      url: `https://custom.example/search?q=${encodeURIComponent(QUERY)}&limit=3`,
      method: 'GET',
      headers: { accept: 'application/json', authorization: `Bearer ${API_KEY}` },
      body: undefined,
    })
    expect(result).toEqual({ content: 'Mapped answer', sources: [SOURCE], truncated: false })
  })

  it('http-json search sends a POST body using the configured query field', async () => {
    const http = mockHTTP({ results: [] })
    await mount('search', {
      id: 'custom',
      vendor: 'http-json',
      url: 'https://custom.example/search',
      method: 'POST',
      queryParam: 'prompt',
      resultsPath: 'results',
    }).search({ query: QUERY, maxResults: 3 })
    expect(sent(http)).toMatchObject({
      url: 'https://custom.example/search',
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: { prompt: QUERY, max_results: 3 },
    })
  })
})

describe('commercial fetch adapter contracts', () => {
  const cases = [
    {
      vendor: 'tavily',
      endpoint: 'https://api.tavily.com/extract',
      headers: { authorization: `Bearer ${API_KEY}` },
      body: { api_key: API_KEY, urls: [TARGET] },
      payload: { results: [{ url: TARGET, raw_content: 'Extracted body' }], failed_results: [] },
    },
    {
      vendor: 'exa',
      endpoint: 'https://api.exa.ai/contents',
      headers: { 'x-api-key': API_KEY },
      body: { urls: [TARGET], text: true },
      payload: { results: [{ url: TARGET, text: 'Extracted body' }] },
    },
    {
      vendor: 'firecrawl',
      endpoint: 'https://api.firecrawl.dev/v1/scrape',
      headers: { authorization: `Bearer ${API_KEY}` },
      body: { url: TARGET, formats: ['markdown'] },
      payload: { success: true, data: { markdown: 'Extracted body' } },
    },
  ]

  for (const test of cases) {
    it(`${test.vendor} sends its extraction request and maps its response`, async () => {
      const http = mockHTTP(test.payload)
      const result = await mount('fetch', {
        id: test.vendor,
        vendor: test.vendor,
        apiKeyEnv: 'ADAPTER_KEY',
      }).fetch({ url: TARGET })
      expect(sent(http)).toEqual({
        url: test.endpoint,
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...test.headers,
        },
        body: test.body,
      })
      expect(result).toEqual({
        url: TARGET,
        statusCode: 200,
        body: { kind: 'text', content: 'Extracted body' },
        truncated: false,
      })
    })
  }

  it('Jina prefixes the target URL and preserves reader status while truncating text', async () => {
    const http = mockHTTP('Reader response', 206)
    const result = await mount('fetch', {
      id: 'jina',
      vendor: 'jina',
      apiKeyEnv: 'ADAPTER_KEY',
      maxBodyChars: 6,
    }).fetch({ url: TARGET })
    expect(sent(http)).toEqual({
      url: `https://r.jina.ai/${TARGET}`,
      method: 'GET',
      headers: { accept: 'text/plain', authorization: `Bearer ${API_KEY}` },
      body: undefined,
    })
    expect(result).toEqual({
      url: TARGET,
      statusCode: 206,
      body: { kind: 'text', content: 'Reader' },
      truncated: true,
    })
  })
})

describe('Tavily extraction result selection', () => {
  function tavily() {
    return mount('fetch', { id: 'tavily', vendor: 'tavily', apiKey: API_KEY })
  }

  it('rejects an HTTP-200 all-failed extraction and preserves the requested URL failure reason', async () => {
    mockHTTP({
      results: [],
      failed_results: [
        { url: 'https://other.example/', error: 'Unrelated failure' },
        { url: TARGET, error: 'Failed to fetch URL: access denied' },
      ],
    })
    await expect(tavily().fetch({ url: TARGET })).rejects.toMatchObject({
      code: 'WEB_PROVIDER_ERROR',
      message: expect.stringContaining('Failed to fetch URL: access denied'),
    })
  })

  it('rejects when only an unrelated URL appears in successful results', async () => {
    mockHTTP({ results: [{ url: 'https://other.example/', raw_content: 'Wrong page' }] })
    await expect(tavily().fetch({ url: TARGET })).rejects.toMatchObject({
      code: 'WEB_PROVIDER_ERROR',
    })
  })

  it('selects the requested URL rather than the first successful result', async () => {
    mockHTTP({
      results: [
        { url: 'https://other.example/', raw_content: 'Wrong page' },
        { url: TARGET, raw_content: 'Requested page' },
      ],
      failed_results: [{ url: 'https://failed.example/', error: 'Unrelated failure' }],
    })
    await expect(tavily().fetch({ url: TARGET })).resolves.toMatchObject({
      url: TARGET,
      statusCode: 200,
      body: { kind: 'text', content: 'Requested page' },
    })
  })

  it('allows an explicitly successful empty page', async () => {
    mockHTTP({ results: [{ url: TARGET, raw_content: '' }], failed_results: [] })
    await expect(tavily().fetch({ url: TARGET })).resolves.toMatchObject({
      statusCode: 200,
      body: { kind: 'text', content: '' },
    })
  })
})

describe('http-json fetch method contract', () => {
  function reader(spec: Partial<ProviderSpec> = {}) {
    return mount('fetch', {
      id: 'reader',
      vendor: 'http-json',
      url: 'https://reader.example/extract?format=text',
      apiKeyEnv: 'ADAPTER_KEY',
      contentField: 'response.text',
      ...spec,
    })
  }

  it('sends POST JSON with the default url field and maps nested content', async () => {
    const http = mockHTTP({ response: { text: 'Reader body' } })
    const result = await reader({ method: 'POST' }).fetch({ url: TARGET })
    expect(sent(http)).toEqual({
      url: 'https://reader.example/extract?format=text',
      method: 'POST',
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${API_KEY}`,
        'content-type': 'application/json',
      },
      body: { url: TARGET },
    })
    expect(result).toEqual({
      url: TARGET,
      statusCode: 200,
      body: { kind: 'text', content: 'Reader body' },
      truncated: false,
    })
  })

  it('uses queryParam as the POST JSON field, not as a query string', async () => {
    const http = mockHTTP({ response: { text: 'Reader body' } })
    await reader({ method: 'POST', queryParam: 'target' }).fetch({ url: TARGET })
    expect(sent(http)).toMatchObject({
      url: 'https://reader.example/extract?format=text',
      method: 'POST',
      body: { target: TARGET },
    })
  })

  it('sets an explicit GET queryParam while retaining endpoint parameters', async () => {
    const http = mockHTTP({ response: { text: 'Reader body' } })
    await reader({ method: 'GET', queryParam: 'target' }).fetch({ url: TARGET })
    const request = sent(http)
    expect(request.method).toBe('GET')
    expect(request.body).toBeUndefined()
    expect(request.headers['content-type']).toBeUndefined()
    expect(Object.fromEntries(new URL(request.url).searchParams)).toEqual({
      format: 'text',
      target: TARGET,
    })
  })

  it('defaults to GET and substitutes every encoded URL placeholder', async () => {
    const http = mockHTTP({ response: { text: 'Reader body' } })
    await reader({ url: 'https://reader.example/{url}?copy={url}' }).fetch({ url: TARGET })
    expect(sent(http)).toMatchObject({
      url: `https://reader.example/${encodeURIComponent(TARGET)}?copy=${encodeURIComponent(TARGET)}`,
      method: 'GET',
      body: undefined,
    })
  })

  it('substitutes URL placeholders for POST as well as sending the JSON body', async () => {
    const http = mockHTTP({ response: { text: 'Reader body' } })
    await reader({ method: 'POST', url: 'https://reader.example/extract?source={url}' }).fetch({
      url: TARGET,
    })
    expect(sent(http)).toMatchObject({
      url: `https://reader.example/extract?source=${encodeURIComponent(TARGET)}`,
      method: 'POST',
      body: { url: TARGET },
    })
  })

  for (const method of ['PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'invalid']) {
    it(`rejects unsupported method ${method} without making a network request`, async () => {
      const http = mockHTTP({ response: { text: 'Reader body' } })
      await expect(reader({ method }).fetch({ url: TARGET })).rejects.toMatchObject({
        code: 'WEB_PROVIDER_ERROR',
      })
      expect(http).not.toHaveBeenCalled()
    })
  }
})
