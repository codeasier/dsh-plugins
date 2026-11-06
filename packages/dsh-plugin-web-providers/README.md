# @codeasier/dsh-plugin-web-providers

Point `web_search` and `web_fetch` at the vendor you actually use — 9Router,
Tavily, Brave, Exa, Serper, SearXNG, Google PSE, Firecrawl, Jina, your own JSON
endpoint, or a bare URL — and switch between them from Settings without
restarting the app.

This is a community plugin for
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).
It ships a bundle patch, localized display metadata, and an
[`engines.dsh`](https://github.com/codeasier/dsh-plugins/blob/main/docs/manifest-reference.md#compatibility) compatibility range,
so it installs and updates independently of every other plugin in this
repository.

## Install

### DeepSeek Harness CLI

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-web-providers
```

Restart the app when the profile does not run with HMR.

### DeepSeek Harness Desktop

Open **Plugins** in the Desktop window and install `@codeasier/dsh-plugin-web-providers`, or use
the command runtime bundled with the app. The npm `dsh` CLI cannot manage the
Electron-owned `desktop` profile. See
[Install on Desktop](https://github.com/codeasier/dsh-plugins/blob/main/docs/install/desktop.md).

### From this checkout

```sh
pnpm install && pnpm build
pnpm install:local dsh-plugin-web-providers --profile web
```

## What it does

The host half registers two providers on the web seam under the id
`web-providers`. The profile's `web` row selects them:

```yaml
- id: web
  name: '@deepseek-ai/dsh-web'
  config:
    searchProvider: web-providers
    fetchProvider: web-providers
```

Each capability holds a list of entries; `active` names the one to use, and a
list with exactly one entry works without `active`.

```yaml
- id: web-providers
  config:
    search:
      active: my-router
      providers:
        - id: my-router
          vendor: 9router
          baseURL: http://10.66.0.3:20128/v1
          apiKeyEnv: MY_ROUTER_KEY     # credential reference; value lives outside the profile
    fetch:
      active: plain
      providers:
        - id: plain
          vendor: http
```

Saving on the settings page writes this row and applies on the next call: the
plugin re-reads the section every time, so no restart and no remount.

## Settings

Left user menu → Settings → **Web search / fetch**. The page uses the shell's
design tokens (`--dsw-alias-*`, `--dsw-radius-*`), so it matches the neighbouring
sections in light and dark themes, and its text comes from the client locale
service.

- **In use** commits immediately for saved provider IDs; leaving it on automatic
  is valid. Save a new or renamed provider before switching to it.
- Drafts retain their starting revision. Concurrent changes surface a conflict
  instead of overwriting another window's providers or credentials; Revert loads
  the latest saved section.
- **Edit** expands an entry in place. `Save` / `Cancel` apply to the whole
  section; `Collapse` keeps the edits as an unsaved draft.
- **Add provider / Delete** change the list without an open editor, so the
  section footer shows `Revert` / `Save` while the draft differs from storage.
- **Key** is a single control: pick *Key* (written to the profile, mode 600) or
  *Credential name* (read from `~/.dsh/.credentials.yaml`, with the launch
  environment as fallback — the mode that works for a Dock-launched desktop
  app). Only one is ever stored; a hand-edited row that carried both converges
  on the first save.
- **Advanced** holds the vendor-specific fields. Anything the form does not
  model survives in **Other fields (JSON)**. Invalid JSON blocks saving even
  after the editor is collapsed; correct it or explicitly discard the draft.

## Vendors

### Search

| vendor | endpoint | credential |
|---|---|---|
| `url` | whatever you paste | optional |
| `9router` | `POST {baseURL}/search` | Bearer; channel chosen by `model` |
| `tavily` | `POST https://api.tavily.com/search` | `apiKey` / `apiKeyEnv` |
| `brave` | `GET https://api.search.brave.com/res/v1/web/search` | `X-Subscription-Token` |
| `exa` | `POST https://api.exa.ai/search` | `x-api-key` |
| `serper` | `POST https://google.serper.dev/search` | `X-API-KEY` |
| `searxng` | `GET {baseURL}/search?format=json` | none |
| `google-cse` | `GET https://www.googleapis.com/customsearch/v1` | `key` + `cx` |
| `firecrawl` | `POST https://api.firecrawl.io/v1/search` | Bearer |
| `jina` | `GET https://s.jina.ai/{query}` | Bearer, optional |
| `http-json` | your own endpoint | see mapping fields |

### Fetch

| vendor | behaviour |
|---|---|
| `url` | one complete URL, `{url}` substituted or appended |
| `http` | plain HTTP GET, HTML reduced to text, 5 MB / 100k char caps |
| `jina` | `GET https://r.jina.ai/{url}` → markdown |
| `firecrawl` | `POST /v1/scrape` → markdown |
| `tavily` | `POST /extract` → raw content |
| `exa` | `POST /contents` → text |
| `http-json` | your own endpoint, `contentField` picks the body |

## Custom URL

Pick **Custom URL** (`vendor: url`, and any entry that leaves `vendor` out) and
the entry is just an address:

```yaml
search:
  providers:
    - id: my-search
      vendor: url
      url: https://api.example.com/search?q={query}&n={max}
fetch:
  providers:
    - id: my-reader
      vendor: url
      url: https://reader.example/?u={url}
```

`{query}`, `{url}` and `{max}` are substituted. With no placeholder the value
has to go somewhere, so the fallback is explicit:

| shape | behaviour |
|---|---|
| contains `{query}` / `{url}` | substituted in place |
| `queryParam` set | appended as that parameter |
| ends with `/` | appended to the path (`https://r.jina.ai/` → `/https://…`) |
| anything else | appended as `?q=` / `?url=` |

The response is read once and classified: **JSON** → the first array of objects
(preferring `results`, `organic`, `items`, `data`, `web`, `hits`, `documents`,
`pages`) mapped from the usual spellings; **text or HTML** → the body becomes
the content and markdown/bare links become the sources. For an exotic shape use
`http-json`, which declares `resultsPath`, `urlField`, `titleField`,
`snippetField`, and `contentField` explicitly.

For `http-json` fetch, `method` defaults to `GET`; `{url}` substitutes the target
and `queryParam`, when set, adds it as a query-string parameter. `POST` sends a
JSON object containing the target under `queryParam` (default `url`), alongside
any template substitution. Other fetch methods are rejected.

All transports validate HTTP(S) URLs without userinfo and follow at most five
same-origin redirects. Cross-origin redirects are rejected and require a new
tool call, so custom authentication headers never follow them. Responses are
capped at 5 MB; HTML conversion scans at most one million characters in linear
time and reports truncation, in addition to the configured output character cap.
Transport diagnostics omit URL paths, query strings, and raw exception details;
upstream error diagnostics redact known request credentials.

## 9Router

The gateway's `/v1/search` takes the channel as the model: `{"model":"tavily"}`
and `{"provider":"tavily"}` are the same request. `model` is a configuration
field, so another channel is a settings change.

| request field | default | notes |
|---|---|---|
| `model` | `ag` | the channel id |
| `max_results` | tool request → `maxResults` → 8 | the channel may cap it |
| `search_type` | not sent (= `web`) | `news`, or `x` for Xquik |
| `country` / `language` / `time_range` / `domain_filter` | not sent | channel-dependent; set `country`, `language`, `timeRange`, `domainFilter` in Other fields |
| `provider_options` | not sent | JSON; `cx` for google-pse, `queryType`/`cursor` for xquik |

```bash
GET {baseURL}/models/web                    # ids of kind "webSearch"
GET {baseURL}/models/info?id=tavily/search  # params, searchTypes, maxResults
```

Those ids end in `/search`, but `/v1/search` expects the bare name. `ag` is not
in that registry — it is the Gemini/antigravity grounding channel. Which
channels work is decided by the gateway: one without credentials answers
`No credentials for provider: X`, and the plugin reports a credential-redacted
diagnostic.

## Compatibility

- `engines.dsh`: `>=0.2.1-rc.2 <0.3.0`; developed and verified against
  `0.2.2-rc.1`.
- Requires a profile whose `web` service is present (any profile with
  `@deepseek-ai/dsh-web`). Without it the plugin stays inactive.
- The client half uses `slots`, `configForms`, and `locale`; without them the
  page does not register.

## Development

```sh
pnpm --filter @codeasier/dsh-plugin-web-providers build
pnpm --filter @codeasier/dsh-plugin-web-providers test
node --check packages/dsh-plugin-web-providers/client.js
```

The client half is hand-written loader code; read
[Client UI](https://github.com/codeasier/dsh-plugins/blob/main/docs/client-ui.md)
before changing it. Provider behavior lives in `src/index.ts` and is covered by
`src/index.test.ts`, including a local HTTP server for the `url` vendor.
