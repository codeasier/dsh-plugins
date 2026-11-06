/**
 * Web Providers — make `web_search` and `web_fetch` point at whichever vendor a
 * user actually pays for, and let them switch it from Settings without a
 * restart.
 *
 * DSH ships one search provider and one fetch provider. Everything else — a
 * 9Router gateway, Tavily, Brave, Exa, Serper, SearXNG, Google PSE, Linkup,
 * SearchAPI, You.com, Perplexity, Xquik, Firecrawl, Jina, or a bare URL you
 * already know — has to be a plugin. This one registers exactly two seam
 * providers and dispatches to whichever entry the profile marks active, so a
 * vendor is configuration rather than code.
 *
 * Credentials never enter the profile: an entry names a credential reference
 * (`apiKeyEnv`) or, for a throwaway key, carries `apiKey` in the profile file.
 * @module @codeasier/dsh-plugin-web-providers
 */

import type { Context } from '@deepseek-ai/cordis'
import type {
  WebFetchProvider,
  WebFetchRequest,
  WebFetchResult,
  WebSearchProvider,
  WebSearchRequest,
  WebSearchResult,
  WebSearchSource,
} from '@deepseek-ai/dsh-web'
import z from '@deepseek-ai/schemastery'

/** Stable Loader identity; keep it equal to the patch row id. */
export const name = 'web-providers'

/** The web seam must exist before this plugin can contribute providers. */
export const inject = ['web']

/** Provider id the profile's `web` row selects (`searchProvider` / `fetchProvider`). */
export const PROVIDER_ID = 'web-providers'

const DEFAULT_TIMEOUT_MS = 30_000
const DEFAULT_MAX_RESULTS = 8
const MAX_BODY_CHARS = 100_000
const MAX_RESPONSE_BYTES = 5_000_000
const DEFAULT_USER_AGENT =
  'deepseek-harness/web-providers (+https://github.com/codeasier/dsh-plugins)'
const HTTP_URL = /^https?:\/\/\S+$/u

/** 9Router: the channel used when an entry names none. */
const DEFAULT_9ROUTER_CHANNEL = 'ag'

/**
 * Credential references in this codebase are UPPER_SNAKE. A reference that does
 * not look like one was probably a raw key pasted into the wrong field, so
 * error messages must not echo it: messages travel into transcripts and logs.
 */
const CREDENTIAL_NAME = /^[A-Z][A-Z0-9_]{0,63}$/u

/** Wire protocols an entry can name. */
export const VENDORS = [
  'url', // one complete address, response auto-detected
  '9router', // ag-style gateway: POST {base}/search
  'tavily',
  'brave',
  'exa',
  'serper',
  'searxng',
  'google-cse',
  'firecrawl',
  'jina',
  'http', // fetch only: plain HTTP GET
  'http-json', // either: describe the endpoint yourself
] as const

/** One configured vendor entry, as written in the profile patch. */
export interface ProviderSpec {
  id: string
  vendor?: string
  label?: string
  baseURL?: string
  apiKey?: string
  apiKeyEnv?: string
  timeoutMs?: number
  maxResults?: number
  /** `url` vendor and `http-json`: the request address template. */
  url?: string
  method?: string
  queryParam?: string
  resultsPath?: string
  urlField?: string
  titleField?: string
  snippetField?: string
  contentField?: string
  /** `url` vendor: header and scheme carrying the credential. */
  authHeader?: string
  authPrefix?: string
  /** 9Router knobs; the channel is the model. */
  model?: string
  searchType?: string
  country?: string
  language?: string
  timeRange?: string
  domainFilter?: string
  providerOptions?: string
  /** google-cse requires the search-engine id. */
  cx?: string
  /** tavily knobs. */
  searchDepth?: string
  includeAnswer?: boolean
  maxBodyChars?: number
}

/** One capability's entry list and the id to use from it. */
export interface ProviderList {
  active?: string
  providers?: ProviderSpec[]
}

/** User-tunable settings, validated at activation. */
export interface Config {
  search?: ProviderList
  fetch?: ProviderList
}

const providerFields = {
  id: z.string().required().description('Name used in the active field, e.g. "my-router".'),
  vendor: z.string().description(`Wire protocol: ${VENDORS.join(', ')}. Omit for a custom URL.`),
  label: z.string().description('Shown in diagnostics; defaults to the id.'),
  baseURL: z.string().description('Endpoint root, when the vendor allows overriding it.'),
  apiKey: z
    .string()
    .role('secret')
    .description('Literal key. Prefer apiKeyEnv: this value is stored in the profile patch file.'),
  apiKeyEnv: z
    .string()
    .description('Credential reference: the credentials store first, then the launch environment.'),
  timeoutMs: z.natural(),
  maxResults: z.natural(),
  // Custom URL (`url` vendor) and the manual `http-json` mapping.
  url: z
    .string()
    .description(
      'url vendor: the complete endpoint. {query}, {url} and {max} are substituted; without a placeholder the value is appended to the path.',
    ),
  authHeader: z
    .string()
    .description('url vendor: header carrying the credential; defaults to Authorization.'),
  authPrefix: z
    .string()
    .description(
      'url vendor: scheme before the credential, e.g. "Bearer"; blank sends the raw value.',
    ),
  method: z.string().description('url / http-json: GET or POST; defaults to GET.'),
  queryParam: z
    .string()
    .description(
      'url vendor: parameter name used when the URL has no {query}/{url} placeholder. http-json: query-string parameter, or blank to send a JSON body.',
    ),
  resultsPath: z
    .string()
    .description(
      'http-json: dot path to the result array, e.g. "web.results". Blank = the body is the array.',
    ),
  urlField: z.string().description('http-json: field holding each result URL.'),
  titleField: z.string().description('http-json: field holding each result title.'),
  snippetField: z.string().description('http-json: field holding each result snippet.'),
  contentField: z.string().description('http-json: dot path to the answer/body text.'),
  // Vendor knobs.
  model: z
    .string()
    .description(
      '9router: the search channel id, e.g. "ag", "tavily", "brave-search". The provider is the model: same value as the gateway\'s `provider`.',
    ),
  searchType: z.string().description('9router: web (default), news, or x for the Xquik channel.'),
  country: z.string().description('9router: country hint, channel-dependent.'),
  language: z.string().description('9router: language hint, channel-dependent.'),
  timeRange: z.string().description('9router: time_range hint such as "week", channel-dependent.'),
  domainFilter: z.string().description('9router: domain_filter, channel-dependent.'),
  providerOptions: z
    .string()
    .description(
      '9router: JSON object forwarded as provider_options, e.g. {"cx":"..."} for google-pse or {"queryType":"Latest"} for xquik.',
    ),
  cx: z.string().description('google-cse: the search-engine id.'),
  searchDepth: z.string().description('tavily: basic or advanced.'),
  includeAnswer: z.boolean().description('tavily: ask for a synthesized answer; defaults to true.'),
  maxBodyChars: z.natural(),
}

/**
 * One capability's list. `active` is a plain string rather than a reference so
 * the settings page can edit the list without the Loader remounting anything.
 */
function listSchema() {
  return z
    .object({
      active: z
        .string()
        .default('')
        .description('Id of the entry to use. Blank = the only configured entry.'),
      providers: z.array(z.object(providerFields)).default([]),
    })
    .volatile()
}

/** Schema for {@link Config}. */
export const Config: z<Config> = z.object({
  search: listSchema(),
  fetch: listSchema(),
}) as z<Config>

/** Typed error: consumers read `code`, messages never contain a key. */
class ProviderError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.code = code
  }
}

function providerError(message: string, code: string): ProviderError {
  return new ProviderError(message, code)
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

/** Quote a reference for a message, hiding anything that is not a plausible name. */
function describeRef(ref: string): string {
  if (CREDENTIAL_NAME.test(ref)) return `"${ref}"`
  return `a value that is not a credential name (${ref.length} characters, hidden)`
}

/** Read a possibly-volatile schemastery field. */
function read<T>(node: T | { get(): T } | undefined | null): T | undefined {
  if (node === undefined || node === null) return undefined
  const holder = node as { get?: () => T }
  return typeof holder.get === 'function' ? holder.get() : (node as T)
}

/** Dot-path lookup that tolerates missing links. */
function at(value: unknown, path: string | undefined): unknown {
  const key = str(path)
  if (key === undefined) return undefined
  return key
    .split('.')
    .filter((part) => part.length > 0)
    .reduce<unknown>(
      (node, part) =>
        node === null || node === undefined ? undefined : (node as Record<string, unknown>)[part],
      value,
    )
}

/** Read a dot path and keep the array of objects it holds, if any. */
function rowsAt(value: unknown, path?: string): Record<string, unknown>[] {
  const list = path === undefined ? value : at(value, path)
  return Array.isArray(list)
    ? list.filter(
        (row): row is Record<string, unknown> =>
          row !== null && typeof row === 'object' && !Array.isArray(row),
      )
    : []
}

/** Parse a JSON object from config, or throw a message that names the field. */
function parseJSONObject(
  text: string | undefined,
  where: string,
): Record<string, unknown> | undefined {
  if (text === undefined) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch (error) {
    throw providerError(
      `${where} is not valid JSON: ${String((error as Error)?.message ?? error)}`,
      'WEB_PROVIDER_ERROR',
    )
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw providerError(`${where} must be a JSON object`, 'WEB_PROVIDER_ERROR')
  }
  return parsed as Record<string, unknown>
}

/** Keep only http(s) sources, drop duplicates, keep the first title/snippet. */
function cleanSources(
  items: readonly { url?: unknown; title?: unknown; snippet?: unknown }[],
): WebSearchSource[] {
  const seen = new Set<string>()
  const sources: WebSearchSource[] = []
  for (const item of items) {
    const url = typeof item?.url === 'string' ? item.url.trim() : ''
    if (url.length === 0 || !HTTP_URL.test(url) || seen.has(url)) continue
    seen.add(url)
    const title = str(item.title)
    const snippet = str(item.snippet)
    sources.push({
      url,
      ...(title === undefined ? {} : { title }),
      ...(snippet === undefined ? {} : { snippet }),
    })
  }
  return sources
}

/** Timeout composed with the caller's cancellation signal. */
function combinedSignal(signal: AbortSignal | undefined, timeoutMs: number): AbortSignal {
  const timeout = AbortSignal.timeout(timeoutMs)
  if (signal === undefined) return timeout
  return AbortSignal.any([signal, timeout])
}

function timeoutOf(spec: ProviderSpec): number {
  return Number.isFinite(spec.timeoutMs) && (spec.timeoutMs as number) > 0
    ? (spec.timeoutMs as number)
    : DEFAULT_TIMEOUT_MS
}

function maxBodyOf(spec: ProviderSpec): number {
  return Number.isFinite(spec.maxBodyChars) && (spec.maxBodyChars as number) > 0
    ? (spec.maxBodyChars as number)
    : MAX_BODY_CHARS
}

// ── credential and endpoint resolution ──────────────────────────────────────

interface CredentialHit {
  value?: string
}

interface CredentialService {
  resolve(ref: string): Promise<CredentialHit | undefined>
}

/** Resolve a key: literal → credential reference → launch environment. */
async function resolveKey(ctx: Context, spec: ProviderSpec): Promise<string | undefined> {
  const literal = str(spec.apiKey)
  if (literal !== undefined) return literal
  const ref = str(spec.apiKeyEnv)
  if (ref !== undefined) {
    const credentials = ctx.get('credentials') as CredentialService | undefined
    if (credentials !== undefined) {
      const hit = await credentials.resolve(ref)
      const value = hit?.value
      if (typeof value === 'string' && value.length > 0) return value
    }
    const fromEnv = str(process.env[ref])
    if (fromEnv !== undefined) return fromEnv
    throw providerError(
      `web-providers: no credential ${describeRef(ref)} for entry "${spec.id}"; add it to ~/.dsh/.credentials.yaml, or put the key itself in the apiKey field`,
      'WEB_PROVIDER_CREDENTIAL_MISSING',
    )
  }
  return undefined
}

/** The base URL an entry resolves to: only the one written on it. */
function resolveBaseURL(spec: ProviderSpec): string | undefined {
  const own = str(spec.baseURL)
  if (own !== undefined && HTTP_URL.test(own)) return own.replace(/\/+$/u, '')
  return undefined
}

// ── entry selection ─────────────────────────────────────────────────────────

export interface Selection {
  entry: ProviderSpec | undefined
  configured: boolean
  providers: ProviderSpec[]
}

/**
 * Pick the active entry of one kind, without throwing on an empty list.
 * Exported for tests and for callers that need to render the current choice.
 * @param config - the validated plugin config.
 * @param kind - which capability's list to read.
 * @returns the resolved entry, whether `active` named one, and the list.
 */
export function resolveSelection(config: Config | undefined, kind: 'search' | 'fetch'): Selection {
  const section = read(config?.[kind]) ?? {}
  const providers = Array.isArray(section.providers) ? section.providers : []
  const active = str(section.active)
  if (active !== undefined) {
    const hit = providers.find((candidate) => candidate?.id === active)
    return { entry: hit, configured: true, providers }
  }
  if (providers.length === 1) return { entry: providers[0], configured: true, providers }
  return { entry: undefined, configured: false, providers }
}

/** Pick the active entry or explain precisely why there is none. */
function requireEntry(config: Config | undefined, kind: 'search' | 'fetch'): ProviderSpec {
  const { entry, configured, providers } = resolveSelection(config, kind)
  if (entry !== undefined) return entry
  if (providers.length === 0) {
    throw providerError(
      `web-providers: no ${kind} provider is configured; add one on the plugin's settings page`,
      'WEB_PROVIDER_ERROR',
    )
  }
  if (configured) {
    throw providerError(
      `web-providers: ${kind}.active names "${read(config?.[kind])?.active ?? ''}", which matches none of ${providers.map((p) => p?.id).join(', ')}`,
      'WEB_PROVIDER_ERROR',
    )
  }
  throw providerError(
    `web-providers: ${providers.length} ${kind} providers are configured but none is active; pick one on the settings page`,
    'WEB_PROVIDER_ERROR',
  )
}

// ── request helpers ─────────────────────────────────────────────────────────

/** Perform one JSON request, mapping transport and HTTP failures to messages. */
async function requestJSON(
  spec: ProviderSpec,
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<Record<string, unknown>> {
  const timeoutMs = timeoutOf(spec)
  const composed = combinedSignal(signal, timeoutMs)
  let response: Response
  try {
    response = await fetch(url, { redirect: 'error', ...init, signal: composed })
  } catch (error) {
    if (signal?.aborted === true) throw providerError('web request aborted', 'WEB_ABORTED')
    if (composed.aborted)
      throw providerError(`web request timed out after ${timeoutMs} ms`, 'WEB_TIMEOUT')
    throw providerError(`cannot reach ${url}: ${String(error)}`, 'WEB_PROVIDER_ERROR')
  }
  const text = await response.text()
  let payload: Record<string, unknown> | undefined
  try {
    payload = JSON.parse(text) as Record<string, unknown>
  } catch {
    payload = undefined
  }
  if (!response.ok) {
    const detail =
      at(payload, 'error.message') ??
      at(payload, 'error') ??
      at(payload, 'message') ??
      text.slice(0, 200)
    const code =
      response.status === 401 || response.status === 403
        ? 'WEB_PROVIDER_CREDENTIAL_MISSING'
        : 'WEB_PROVIDER_ERROR'
    throw providerError(
      `${spec.vendor} request failed (HTTP ${response.status}): ${String(detail)}`,
      code,
    )
  }
  if (payload === undefined)
    throw providerError(`${spec.vendor} returned a non-JSON response`, 'WEB_PROVIDER_ERROR')
  return payload
}

/**
 * GET (or POST) a URL and return its body as text, without assuming JSON.
 * The `url` vendor has no idea what shape the endpoint answers in, so it
 * decides after reading the body instead of failing on a parse error.
 */
async function requestText(
  spec: ProviderSpec,
  url: string,
  init: RequestInit,
  signal?: AbortSignal,
): Promise<{ text: string; contentType: string; url: string }> {
  const timeoutMs = timeoutOf(spec)
  const composed = combinedSignal(signal, timeoutMs)
  let response: Response
  try {
    response = await fetch(url, { redirect: 'follow', ...init, signal: composed })
  } catch (error) {
    if (signal?.aborted === true) throw providerError('web request aborted', 'WEB_ABORTED')
    if (composed.aborted)
      throw providerError(`web request timed out after ${timeoutMs} ms`, 'WEB_TIMEOUT')
    throw providerError(`cannot reach ${url}: ${String(error)}`, 'WEB_PROVIDER_ERROR')
  }
  const { bytes } = await readCapped(response, MAX_RESPONSE_BYTES)
  const text = new TextDecoder().decode(bytes)
  if (!response.ok) {
    const detail = text.replace(/\s+/gu, ' ').slice(0, 200)
    const code =
      response.status === 401 || response.status === 403
        ? 'WEB_PROVIDER_CREDENTIAL_MISSING'
        : 'WEB_PROVIDER_ERROR'
    throw providerError(`custom url failed (HTTP ${response.status}): ${detail}`, code)
  }
  return { text, contentType: response.headers.get('content-type') ?? '', url: response.url || url }
}

/** Read at most `limitBytes` from a response body. */
async function readCapped(
  response: Response,
  limitBytes: number,
): Promise<{ bytes: Buffer; truncated: boolean }> {
  const chunks: Buffer[] = []
  let total = 0
  let truncated = false
  const body = response.body
  if (body === null) return { bytes: Buffer.alloc(0), truncated: false }
  for await (const chunk of body as unknown as AsyncIterable<Uint8Array>) {
    if (total + chunk.length > limitBytes) {
      chunks.push(Buffer.from(chunk.subarray(0, limitBytes - total)))
      truncated = true
      break
    }
    chunks.push(Buffer.from(chunk))
    total += chunk.length
  }
  return { bytes: Buffer.concat(chunks), truncated }
}

/**
 * Fill the template, in order of precedence:
 *   1. an explicit `{query}` / `{url}` placeholder is substituted;
 *   2. an explicit queryParam turns the value into a query parameter;
 *   3. a URL ending in `/` is a prefix (s.jina.ai, r.jina.ai) → append to path;
 *   4. anything else is a complete endpoint → append `?q=` / `?url=`.
 * Guessing is unavoidable once there is no placeholder, so the guess is
 * spelled out here and overridable with `queryParam`.
 */
function expandTemplate(
  template: string,
  token: 'query' | 'url',
  value: string,
  queryParam?: string,
): string {
  if (template.includes(`{${token}}`))
    return template.replaceAll(`{${token}}`, encodeURIComponent(value))
  const encoded = encodeURIComponent(value)
  if (queryParam !== undefined) {
    const withParam = new URL(template)
    withParam.searchParams.set(queryParam, value)
    return withParam.toString()
  }
  if (/\/$/u.test(template)) return `${template}${encoded}`
  return `${template}${template.includes('?') ? '&' : '?'}${token === 'query' ? 'q' : 'url'}=${encoded}`
}

/** Walk any JSON shape and return the first array of objects worth quoting. */
function autoRows(payload: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 4 || payload === null || typeof payload !== 'object') return []
  if (Array.isArray(payload)) {
    const objects = payload.filter(
      (row): row is Record<string, unknown> =>
        row !== null && typeof row === 'object' && !Array.isArray(row),
    )
    if (objects.length > 0) return objects
    for (const row of payload) {
      const found = autoRows(row, depth + 1)
      if (found.length > 0) return found
    }
    return []
  }
  const record = payload as Record<string, unknown>
  // Prefer the keys every search API uses before walking arbitrary ones.
  for (const key of ['results', 'organic', 'items', 'data', 'web', 'hits', 'documents', 'pages']) {
    const found = autoRows(record[key], depth + 1)
    if (found.length > 0) return found
  }
  for (const value of Object.values(record)) {
    const found = autoRows(value, depth + 1)
    if (found.length > 0) return found
  }
  return []
}

/** First non-empty string among the usual field spellings. */
function pickText(row: unknown, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = at(row, key)
    if (typeof value === 'string' && value.trim() !== '') return value.trim()
  }
  return undefined
}

/** URLs out of markdown links or bare URLs in a text answer. */
function linksInText(text: string, limit: number): WebSearchSource[] {
  const found: WebSearchSource[] = []
  const seen = new Set<string>()
  for (const match of text.matchAll(/\[([^\]]{1,200})\]\((https?:\/\/[^)\s]+)\)/gu)) {
    const label = match[1]
    const target = match[2]
    if (target === undefined || seen.has(target)) continue
    seen.add(target)
    found.push({ url: target, ...(label === undefined ? {} : { title: label.trim() }) })
    if (found.length >= limit) return found
  }
  for (const match of text.matchAll(/https?:\/\/[^\s<>"')\]]+/gu)) {
    const url = (match[0] ?? '').replace(/[.,;:]+$/u, '')
    if (url === '' || seen.has(url)) continue
    seen.add(url)
    found.push({ url })
    if (found.length >= limit) return found
  }
  return found
}

/** Strip HTML to readable text; enough for tools, not a full readability pass. */
function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, ' ')
    .replace(/<!--[\s\S]*?-->/gu, ' ')
    .replace(/<\/(p|div|section|article|li|tr|h[1-6]|blockquote|pre)>/giu, '\n')
    .replace(/<br\s*\/?>/giu, '\n')
    .replace(/<[^>]+>/gu, ' ')
    .replace(/&nbsp;/gu, ' ')
    .replace(/&amp;/gu, '&')
    .replace(/&lt;/gu, '<')
    .replace(/&gt;/gu, '>')
    .replace(/&quot;/gu, '"')
    .replace(/&#39;/gu, "'")
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .replace(/[ \t]{2,}/gu, ' ')
    .trim()
}

/** Authorization headers for the `url` vendor. */
function authHeaders(spec: ProviderSpec, apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = {}
  if (apiKey === undefined) return headers
  const header = str(spec.authHeader)
  const prefix = str(spec.authPrefix)
  if (header !== undefined)
    headers[header.toLowerCase()] = prefix === undefined ? apiKey : `${prefix} ${apiKey}`
  else headers.authorization = `Bearer ${apiKey}`
  return headers
}

type SearchVendor = (
  ctx: Context,
  spec: ProviderSpec,
  request: WebSearchRequest,
  signal?: AbortSignal,
) => Promise<WebSearchResult>

type FetchVendor = (
  ctx: Context,
  spec: ProviderSpec,
  request: WebFetchRequest,
  signal?: AbortSignal,
) => Promise<WebFetchResult>

// ── search vendors ──────────────────────────────────────────────────────────

const searchVendors: Record<string, SearchVendor> = {
  /**
   * One complete URL, nothing else. Paste `https://host/search?q={query}` (or
   * just `https://host/` and the query is appended), and the response is read
   * as JSON when it parses and as text otherwise — no resultsPath, no
   * urlField, no vendor taxonomy.
   */
  async url(ctx, spec, request, signal) {
    const template = str(spec.url) ?? str(spec.baseURL)
    if (template === undefined) {
      throw providerError(
        `custom url entry "${spec.id}" has no URL: set url to the full address`,
        'WEB_PROVIDER_ERROR',
      )
    }
    if (!HTTP_URL.test(template.replaceAll('{query}', 'x').replaceAll('{max}', '1'))) {
      throw providerError(
        `custom url entry "${spec.id}" needs an http(s) URL, got "${template}"`,
        'WEB_PROVIDER_ERROR',
      )
    }
    const max = request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS
    const endpoint = expandTemplate(
      template.replaceAll('{max}', String(max)),
      'query',
      request.query,
      str(spec.queryParam),
    )
    const apiKey = await resolveKey(ctx, spec)
    const headers = {
      accept: 'application/json, text/plain;q=0.9, text/html;q=0.8, */*;q=0.7',
      ...authHeaders(spec, apiKey),
    }
    const method = (str(spec.method) ?? 'GET').toUpperCase()
    const { text, contentType } = await requestText(spec, endpoint, { method, headers }, signal)
    const maxChars = maxBodyOf(spec)

    let payload: unknown
    try {
      payload = JSON.parse(text)
    } catch {
      payload = undefined
    }
    if (payload !== undefined) {
      const rows = autoRows(payload)
      const sources = cleanSources(
        rows.slice(0, max).map((row) => ({
          url: pickText(row, ['url', 'link', 'href', 'uri', 'source_url', 'html_url']),
          title: pickText(row, ['title', 'name', 'heading', 'label']),
          snippet: pickText(row, [
            'snippet',
            'description',
            'content',
            'text',
            'summary',
            'body',
            'highlight',
          ]),
        })),
      )
      const content = pickText(payload, ['answer', 'summary', 'content', 'text', 'data.answer'])
      if (sources.length === 0 && content === undefined) {
        throw providerError(
          `custom url entry "${spec.id}" returned JSON with no recognisable results; use the http-json vendor to map the fields`,
          'WEB_PROVIDER_ERROR',
        )
      }
      return {
        ...(content === undefined ? {} : { content: content.slice(0, maxChars) }),
        sources,
        truncated: rows.length > max,
      }
    }

    const isHTML = /html/i.test(contentType)
    const body = isHTML ? htmlToText(text) : text
    const content = body.length > maxChars ? body.slice(0, maxChars) : body
    return {
      content,
      sources: cleanSources(linksInText(body, max)),
      truncated: body.length > maxChars,
    }
  },

  /**
   * 9Router `/v1/search`. The channel is the model: `{"model":"tavily"}` and
   * `{"provider":"tavily"}` are the same request. Channels are listed by
   * `GET /v1/models/web` (kind `webSearch`) and described by
   * `GET /v1/models/info?id=<channel>/search`, which also reports which
   * optional params and search types that channel accepts.
   */
  async '9router'(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec)
    if (baseURL === undefined) {
      throw providerError(
        `9router entry "${spec.id}" has no endpoint: set baseURL`,
        'WEB_PROVIDER_ERROR',
      )
    }
    const apiKey = await resolveKey(ctx, spec)
    if (apiKey === undefined) {
      throw providerError(
        `9router entry "${spec.id}" has no API key: set apiKey or apiKeyEnv`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    }
    const channel = str(spec.model) ?? DEFAULT_9ROUTER_CHANNEL
    const maxResults = request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS
    const providerOptions = parseJSONObject(
      str(spec.providerOptions),
      `9router entry "${spec.id}" providerOptions`,
    )
    const body = {
      model: channel,
      query: request.query,
      max_results: maxResults,
      ...(str(spec.searchType) === undefined ? {} : { search_type: str(spec.searchType) }),
      ...(str(spec.country) === undefined ? {} : { country: str(spec.country) }),
      ...(str(spec.language) === undefined ? {} : { language: str(spec.language) }),
      ...(str(spec.timeRange) === undefined ? {} : { time_range: str(spec.timeRange) }),
      ...(str(spec.domainFilter) === undefined ? {} : { domain_filter: str(spec.domainFilter) }),
      ...(providerOptions === undefined ? {} : { provider_options: providerOptions }),
    }
    const payload = await requestJSON(
      spec,
      `${baseURL}/search`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      },
      signal,
    )
    const errors = Array.isArray(payload.errors) ? payload.errors : []
    const failure = str(errors[0]) ?? str(at(errors[0], 'message'))
    if (failure !== undefined)
      throw providerError(`9router channel "${channel}" failed: ${failure}`, 'WEB_PROVIDER_ERROR')
    const errorMessage = at(payload, 'error.message') ?? at(payload, 'error')
    if (errorMessage !== undefined) {
      throw providerError(
        `9router channel "${channel}" failed: ${String(errorMessage)}`,
        'WEB_PROVIDER_ERROR',
      )
    }
    const rows = rowsAt(payload, 'results')
    // `answer` is a string, null, or {source, text, model} depending on channel.
    const answer = payload.answer
    const text = str(answer) ?? str(at(answer, 'text'))
    const available = at(payload, 'metrics.total_results_available')
    return {
      ...(text === undefined ? {} : { content: text }),
      sources: cleanSources(
        rows.map((row) => ({
          url: row?.url,
          title: row?.title,
          snippet: str(row?.snippet) ?? str(row?.content) ?? str(row?.display_url),
        })),
      ),
      truncated: typeof available === 'number' && available > rows.length,
    }
  },

  async tavily(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://api.tavily.com'
    const apiKey = await resolveKey(ctx, spec)
    if (apiKey === undefined)
      throw providerError(
        `tavily entry "${spec.id}" needs apiKey or apiKeyEnv`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    const max = request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS
    const payload = await requestJSON(
      spec,
      `${baseURL}/search`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          api_key: apiKey,
          query: request.query,
          max_results: max,
          include_answer: spec.includeAnswer !== false,
          ...(str(spec.searchDepth) !== undefined ? { search_depth: spec.searchDepth } : {}),
        }),
      },
      signal,
    )
    const rows = rowsAt(payload, 'results')
    const answer = str(payload.answer)
    return {
      ...(answer === undefined ? {} : { content: answer }),
      sources: cleanSources(
        rows.map((row) => ({
          url: row?.url,
          title: row?.title,
          snippet: row?.content ?? row?.snippet,
        })),
      ),
      truncated: rows.length > max,
    }
  },

  async brave(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://api.search.brave.com'
    const apiKey = await resolveKey(ctx, spec)
    if (apiKey === undefined)
      throw providerError(
        `brave entry "${spec.id}" needs apiKey or apiKeyEnv`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    const max = request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS
    const url = new URL(`${baseURL}/res/v1/web/search`)
    url.searchParams.set('q', request.query)
    url.searchParams.set('count', String(max))
    const payload = await requestJSON(
      spec,
      url.toString(),
      { headers: { accept: 'application/json', 'x-subscription-token': apiKey } },
      signal,
    )
    const rows = rowsAt(payload, 'web.results')
    return {
      sources: cleanSources(
        rows.map((row) => ({ url: row?.url, title: row?.title, snippet: row?.description })),
      ),
      truncated: rows.length > max,
    }
  },

  async exa(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://api.exa.ai'
    const apiKey = await resolveKey(ctx, spec)
    if (apiKey === undefined)
      throw providerError(
        `exa entry "${spec.id}" needs apiKey or apiKeyEnv`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    const max = request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS
    const payload = await requestJSON(
      spec,
      `${baseURL}/search`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({
          query: request.query,
          numResults: max,
          contents: { text: { maxCharacters: 800 } },
        }),
      },
      signal,
    )
    const rows = rowsAt(payload, 'results')
    return {
      sources: cleanSources(
        rows.map((row) => ({
          url: row?.url,
          title: row?.title,
          snippet: row?.text ?? row?.summary,
        })),
      ),
      truncated: rows.length > max,
    }
  },

  async serper(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://google.serper.dev'
    const apiKey = await resolveKey(ctx, spec)
    if (apiKey === undefined)
      throw providerError(
        `serper entry "${spec.id}" needs apiKey or apiKeyEnv`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    const max = request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS
    const payload = await requestJSON(
      spec,
      `${baseURL}/search`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ q: request.query, num: max }),
      },
      signal,
    )
    const rows = rowsAt(payload, 'organic')
    const answer = str(at(payload, 'answerBox.answer'))
    return {
      ...(answer === undefined ? {} : { content: answer }),
      sources: cleanSources(
        rows.map((row) => ({ url: row?.link, title: row?.title, snippet: row?.snippet })),
      ),
      truncated: rows.length > max,
    }
  },

  async searxng(_ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec)
    if (baseURL === undefined)
      throw providerError(
        `searxng entry "${spec.id}" has no endpoint: set baseURL`,
        'WEB_PROVIDER_ERROR',
      )
    const max = request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS
    const url = new URL(`${baseURL}/search`)
    url.searchParams.set('q', request.query)
    url.searchParams.set('format', 'json')
    const payload = await requestJSON(
      spec,
      url.toString(),
      { headers: { accept: 'application/json' } },
      signal,
    )
    const rows = rowsAt(payload, 'results')
    return {
      sources: cleanSources(
        rows.map((row) => ({ url: row?.url, title: row?.title, snippet: row?.content })),
      ),
      truncated: rows.length > max,
    }
  },

  async 'google-cse'(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://www.googleapis.com/customsearch/v1'
    const apiKey = await resolveKey(ctx, spec)
    if (apiKey === undefined)
      throw providerError(
        `google-cse entry "${spec.id}" needs apiKey or apiKeyEnv`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    const cx = str(spec.cx)
    if (cx === undefined)
      throw providerError(
        `google-cse entry "${spec.id}" needs cx (the search-engine id)`,
        'WEB_PROVIDER_ERROR',
      )
    const max = Math.min(10, request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS)
    const url = new URL(baseURL)
    url.searchParams.set('key', apiKey)
    url.searchParams.set('cx', cx)
    url.searchParams.set('q', request.query)
    url.searchParams.set('num', String(max))
    const payload = await requestJSON(
      spec,
      url.toString(),
      { headers: { accept: 'application/json' } },
      signal,
    )
    const rows = rowsAt(payload, 'items')
    return {
      sources: cleanSources(
        rows.map((row) => ({ url: row?.link, title: row?.title, snippet: row?.snippet })),
      ),
      truncated: rows.length > max,
    }
  },

  async firecrawl(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://api.firecrawl.dev'
    const apiKey = await resolveKey(ctx, spec)
    if (apiKey === undefined)
      throw providerError(
        `firecrawl entry "${spec.id}" needs apiKey or apiKeyEnv`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    const max = request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS
    const payload = await requestJSON(
      spec,
      `${baseURL}/v1/search`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ query: request.query, limit: max }),
      },
      signal,
    )
    const rows = rowsAt(payload, 'data')
    return {
      sources: cleanSources(
        rows.map((row) => ({ url: row?.url, title: row?.title, snippet: row?.description })),
      ),
      truncated: rows.length > max,
    }
  },

  async jina(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://s.jina.ai'
    const apiKey = await resolveKey(ctx, spec)
    const { text } = await requestText(
      spec,
      `${baseURL}/${encodeURIComponent(request.query)}`,
      {
        headers: {
          accept: 'text/plain',
          ...(apiKey === undefined ? {} : { authorization: `Bearer ${apiKey}` }),
        },
      },
      signal,
    )
    const max = request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS
    const maxChars = maxBodyOf(spec)
    return {
      content: text.length > maxChars ? text.slice(0, maxChars) : text,
      sources: cleanSources(linksInText(text, max)),
      truncated: text.length > maxChars,
    }
  },

  async 'http-json'(ctx, spec, request, signal) {
    const apiKey = await resolveKey(ctx, spec)
    const template = str(spec.url)
    if (template === undefined)
      throw providerError(`http-json entry "${spec.id}" needs url`, 'WEB_PROVIDER_ERROR')
    const max = request.maxResults ?? spec.maxResults ?? DEFAULT_MAX_RESULTS
    let url = template
      .replaceAll('{query}', encodeURIComponent(request.query))
      .replaceAll('{max}', String(max))
    const headers: Record<string, string> = {
      accept: 'application/json',
      ...(apiKey === undefined ? {} : { authorization: `Bearer ${apiKey}` }),
    }
    const method = str(spec.method) ?? 'GET'
    const init: RequestInit = { method, headers }
    if (str(spec.queryParam) !== undefined && method === 'GET') {
      const withParam = new URL(url)
      withParam.searchParams.set(str(spec.queryParam) as string, request.query)
      url = withParam.toString()
    } else if (method !== 'GET') {
      headers['content-type'] = 'application/json'
      init.body = JSON.stringify({
        [str(spec.queryParam) ?? 'query']: request.query,
        max_results: max,
      })
    }
    const payload = await requestJSON(spec, url, init, signal)
    const rows = at(payload, str(spec.resultsPath)) ?? payload
    const list = rowsAt(rows)
    const content = at(payload, str(spec.contentField))
    return {
      ...(str(content) === undefined ? {} : { content: str(content) as string }),
      sources: cleanSources(
        list.map((row) => ({
          url: at(row, str(spec.urlField) ?? 'url') ?? row?.url,
          title: at(row, str(spec.titleField) ?? 'title') ?? row?.title,
          snippet: at(row, str(spec.snippetField) ?? 'snippet') ?? row?.snippet ?? row?.content,
        })),
      ),
      truncated: list.length > max,
    }
  },
}

// ── fetch vendors ───────────────────────────────────────────────────────────

const fetchVendors: Record<string, FetchVendor> = {
  /**
   * Fetch through one complete URL: `https://reader.example/?u={url}`, or a
   * bare prefix such as `https://r.jina.ai/` and the target is appended.
   */
  async url(ctx, spec, request, signal) {
    const template = str(spec.url) ?? str(spec.baseURL)
    if (template === undefined) {
      throw providerError(
        `custom url entry "${spec.id}" has no URL: set url to the full address`,
        'WEB_PROVIDER_ERROR',
      )
    }
    const endpoint = expandTemplate(template, 'url', request.url, str(spec.queryParam))
    const apiKey = await resolveKey(ctx, spec)
    const headers = {
      accept: 'text/plain, text/html;q=0.9, application/json;q=0.8, */*;q=0.7',
      ...authHeaders(spec, apiKey),
    }
    const { text, contentType } = await requestText(
      spec,
      endpoint,
      { method: (str(spec.method) ?? 'GET').toUpperCase(), headers },
      signal,
    )
    const maxChars = maxBodyOf(spec)
    let payload: unknown
    try {
      payload = JSON.parse(text)
    } catch {
      payload = undefined
    }
    const raw =
      payload !== undefined
        ? String(
            pickText(payload, [
              'content',
              'text',
              'markdown',
              'data.content',
              'data.markdown',
              'data',
            ]) ?? text,
          )
        : /html/i.test(contentType)
          ? htmlToText(text)
          : text
    return {
      url: request.url,
      statusCode: 200,
      body: {
        kind: 'text' as const,
        content: raw.length > maxChars ? raw.slice(0, maxChars) : raw,
      },
      truncated: raw.length > maxChars,
    }
  },

  async http(_ctx, spec, request, signal) {
    const timeoutMs = timeoutOf(spec)
    const composed = combinedSignal(signal, timeoutMs)
    let response: Response
    try {
      response = await fetch(request.url, {
        redirect: 'follow',
        headers: {
          accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
          'user-agent': DEFAULT_USER_AGENT,
        },
        signal: composed,
      })
    } catch (error) {
      if (signal?.aborted === true) throw providerError('web fetch aborted', 'WEB_ABORTED')
      if (composed.aborted)
        throw providerError(`web fetch timed out after ${timeoutMs} ms`, 'WEB_FETCH_TIMEOUT')
      throw providerError(`web fetch failed: ${String(error)}`, 'WEB_PROVIDER_ERROR')
    }
    const contentType = response.headers.get('content-type') ?? ''
    const { bytes, truncated } = await readCapped(response, MAX_RESPONSE_BYTES)
    const raw = new TextDecoder().decode(bytes)
    const isHTML = /html/i.test(contentType)
    const maxChars = maxBodyOf(spec)
    const text = isHTML ? htmlToText(raw) : raw
    return {
      url: response.url || request.url,
      statusCode: response.status,
      body: {
        kind: 'text' as const,
        content: text.length > maxChars ? text.slice(0, maxChars) : text,
      },
      truncated: truncated || text.length > maxChars,
    }
  },

  async jina(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://r.jina.ai'
    const apiKey = await resolveKey(ctx, spec)
    const timeoutMs = timeoutOf(spec)
    const composed = combinedSignal(signal, timeoutMs)
    let response: Response
    try {
      response = await fetch(`${baseURL}/${request.url}`, {
        redirect: 'follow',
        headers: {
          accept: 'text/plain',
          ...(apiKey === undefined ? {} : { authorization: `Bearer ${apiKey}` }),
        },
        signal: composed,
      })
    } catch (error) {
      if (signal?.aborted === true) throw providerError('web fetch aborted', 'WEB_ABORTED')
      if (composed.aborted)
        throw providerError(`web fetch timed out after ${timeoutMs} ms`, 'WEB_FETCH_TIMEOUT')
      throw providerError(`web fetch failed: ${String(error)}`, 'WEB_PROVIDER_ERROR')
    }
    const text = await response.text()
    const maxChars = maxBodyOf(spec)
    return {
      url: request.url,
      statusCode: response.status,
      body: {
        kind: 'text' as const,
        content: text.length > maxChars ? text.slice(0, maxChars) : text,
      },
      truncated: text.length > maxChars,
    }
  },

  async firecrawl(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://api.firecrawl.dev'
    const apiKey = await resolveKey(ctx, spec)
    if (apiKey === undefined)
      throw providerError(
        `firecrawl entry "${spec.id}" needs apiKey or apiKeyEnv`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    const payload = await requestJSON(
      spec,
      `${baseURL}/v1/scrape`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ url: request.url, formats: ['markdown'] }),
      },
      signal,
    )
    const content = at(payload, 'data.markdown') ?? at(payload, 'data.content') ?? ''
    return {
      url: request.url,
      statusCode: 200,
      body: { kind: 'text' as const, content: String(content) },
      truncated: false,
    }
  },

  async tavily(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://api.tavily.com'
    const apiKey = await resolveKey(ctx, spec)
    if (apiKey === undefined)
      throw providerError(
        `tavily entry "${spec.id}" needs apiKey or apiKeyEnv`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    const payload = await requestJSON(
      spec,
      `${baseURL}/extract`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ api_key: apiKey, urls: [request.url] }),
      },
      signal,
    )
    const first = rowsAt(payload, 'results')[0]
    const content = at(first, 'raw_content') ?? at(first, 'content') ?? ''
    return {
      url: request.url,
      statusCode: 200,
      body: { kind: 'text' as const, content: String(content) },
      truncated: false,
    }
  },

  async exa(ctx, spec, request, signal) {
    const baseURL = resolveBaseURL(spec) ?? 'https://api.exa.ai'
    const apiKey = await resolveKey(ctx, spec)
    if (apiKey === undefined)
      throw providerError(
        `exa entry "${spec.id}" needs apiKey or apiKeyEnv`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    const payload = await requestJSON(
      spec,
      `${baseURL}/contents`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify({ urls: [request.url], text: true }),
      },
      signal,
    )
    const first = rowsAt(payload, 'results')[0]
    return {
      url: request.url,
      statusCode: 200,
      body: { kind: 'text' as const, content: String(at(first, 'text') ?? '') },
      truncated: false,
    }
  },

  async 'http-json'(ctx, spec, request, signal) {
    const apiKey = await resolveKey(ctx, spec)
    const template = str(spec.url)
    if (template === undefined)
      throw providerError(`http-json entry "${spec.id}" needs url`, 'WEB_PROVIDER_ERROR')
    const url = template.replaceAll('{url}', encodeURIComponent(request.url))
    const headers = {
      accept: 'application/json',
      ...(apiKey === undefined ? {} : { authorization: `Bearer ${apiKey}` }),
    }
    const payload = await requestJSON(spec, url, { headers }, signal)
    const content =
      at(payload, str(spec.contentField)) ?? at(payload, 'content') ?? at(payload, 'data')
    return {
      url: request.url,
      statusCode: 200,
      body: { kind: 'text' as const, content: String(content ?? '') },
      truncated: false,
    }
  },
}

// ── plugin ──────────────────────────────────────────────────────────────────

/**
 * Register the two seam providers.
 * @param ctx - the plugin context; `web` must be present.
 * @param config - validated settings from the patch row.
 */
export function apply(ctx: Context, config: Config): void {
  const sectionOf = (kind: 'search' | 'fetch') => read(config?.[kind]) ?? {}

  const searchProvider: WebSearchProvider = {
    id: PROVIDER_ID,
    // Cheap, no network: an empty list is the only "unavailable" state, so a
    // missing key or endpoint still reports the precise error from search().
    available: () => {
      const providers = sectionOf('search').providers
      return Array.isArray(providers) ? providers.length > 0 : false
    },
    async search(request, signal) {
      const spec = requireEntry(config, 'search')
      const vendor = searchVendors[str(spec.vendor) ?? 'url']
      if (vendor === undefined) {
        throw providerError(
          `web-providers: search entry "${spec.id}" names unknown vendor "${spec.vendor}"`,
          'WEB_PROVIDER_ERROR',
        )
      }
      return vendor(ctx, spec, request, signal)
    },
  }

  const fetchProvider: WebFetchProvider = {
    id: PROVIDER_ID,
    available: () => {
      const providers = sectionOf('fetch').providers
      return Array.isArray(providers) ? providers.length > 0 : false
    },
    async fetch(request, signal) {
      const spec = requireEntry(config, 'fetch')
      const vendor = fetchVendors[str(spec.vendor) ?? 'url']
      if (vendor === undefined) {
        throw providerError(
          `web-providers: fetch entry "${spec.id}" names vendor "${spec.vendor}", which this plugin cannot fetch with (9router has no fetch endpoint)`,
          'WEB_PROVIDER_ERROR',
        )
      }
      return vendor(ctx, spec, request, signal)
    },
  }

  ctx.web.registerSearchProvider(searchProvider)
  ctx.web.registerFetchProvider(fetchProvider)
}
