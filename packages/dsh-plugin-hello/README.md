# @codeasier/dsh-plugin-hello

The reference plugin for [codeasier/dsh-plugins](https://github.com/codeasier/dsh-plugins).
It adds one configurable `hello` tool and is small enough to read end to end,
but it follows every repository convention: an `engines.dsh` compatibility
range, a bundle patch, localized display metadata, an original icon, tests, and
an independently versioned package.

## Install

### DeepSeek Harness CLI

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-hello
```

Use `--profile tui` instead of `web` for the terminal profile. The command
installs the package and adds the bundle to `dsh.profile.bundles`; restart the
app if the profile does not run with HMR.

### DeepSeek Harness Desktop

Open **Plugins** in the Desktop window and install
`@codeasier/dsh-plugin-hello`, or use the command runtime bundled with the app.
The npm `dsh` CLI deliberately cannot manage the Electron-owned `desktop`
profile. See [Install on Desktop](https://github.com/codeasier/dsh-plugins/blob/main/docs/install/desktop.md).

### From a local checkout

```sh
pnpm install && pnpm build
pnpm install:local dsh-plugin-hello --profile web
```

## What it does

| Tool | Parameters | Result |
|---|---|---|
| `hello` | `name` (string, required) | Greeting text such as `Hello, Ada!` |

The tool is registered on the plugin context, so disabling or removing the
bundle removes it again.

## Configuration

| Key | Type | Default | Meaning |
|---|---|---|---|
| `greeting` | string | `Hello` | Text before the name. |
| `maxNameLength` | natural number | `64` | Maximum accepted name length, in Unicode code points. |

Override the row in the profile's `cordis.patch.yml`:

```yaml
- id: hello
  name: '@codeasier/dsh-plugin-hello'
  config:
    greeting: 你好
    maxNameLength: 40
```

`config` is replaced wholesale, never deep-merged. Restate every field you need;
the schema supplies defaults for omitted optional fields.

## Compatibility

| Plugin | DeepSeek Harness | Node.js |
|---|---|---|
| `0.1.x` | `>=0.2.1-rc.2 <0.3.0` | `>=22.18.0` |

Installing a plugin whose `engines.dsh` range excludes the running version is
refused before download. See
[version compatibility](https://github.com/codeasier/dsh-plugins/blob/main/docs/manifest-reference.md#compatibility).

## Develop

```sh
pnpm --filter @codeasier/dsh-plugin-hello build
pnpm --filter @codeasier/dsh-plugin-hello test
pnpm --filter @codeasier/dsh-plugin-hello typecheck
```

Source entry: [`src/index.ts`](./src/index.ts). Bundle patch:
[`cordis.patch.yml`](./cordis.patch.yml). Display metadata:
[`locale/en.json`](./locale/en.json).

## License

MIT
