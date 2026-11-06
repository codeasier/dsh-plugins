# __PACKAGE_NAME__

__DESCRIPTION__

This is a community plugin for
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).
It ships a bundle patch, localized display metadata, and an
[`engines.dsh`](https://github.com/codeasier/dsh-plugins/blob/main/docs/manifest-reference.md#compatibility) compatibility range,
so it installs and updates independently of every other plugin in this
repository.

## Install

### DeepSeek Harness CLI

```sh
dsh plugin --profile web add __PACKAGE_NAME__
```

Restart the app when the profile does not run with HMR.

### DeepSeek Harness Desktop

Open **Plugins** in the Desktop window and install `__PACKAGE_NAME__`, or use
the command runtime bundled with the app. The npm `dsh` CLI cannot manage the
Electron-owned `desktop` profile. See
[Install on Desktop](https://github.com/codeasier/dsh-plugins/blob/main/docs/install/desktop.md).

### From this checkout

```sh
pnpm install && pnpm build
pnpm install:local dsh-plugin-__ROW_ID__ --profile web
```

## What it does

Replace this section with the user-visible behavior, the tool or page it adds,
and one concrete example. Keep the generated `__TOOL_NAME__` tool only if it is
part of the final feature; otherwise rename it and update the test.

| Tool | Parameters | Result |
|---|---|---|
| `__TOOL_NAME__` | `text` (string, required) | Prefixed echo of `text`. |

## Configuration

| Key | Type | Default | Meaning |
|---|---|---|---|
| `prefix` | string | `__TITLE__` | Text placed before the echoed input. |
| `maxTextLength` | natural number | `200` | Maximum accepted input length, in Unicode code points. |

Override the row in the profile's `cordis.patch.yml`:

```yaml
- id: __ROW_ID__
  name: '__PACKAGE_NAME__'
  config:
    prefix: custom
```

`config` is replaced wholesale, never deep-merged.

## Compatibility

| Plugin | DeepSeek Harness | Node.js |
|---|---|---|
| `0.1.x` | `>=0.2.1-rc.2 <0.3.0` | `>=22.18.0` |

## Develop

```sh
pnpm --filter __PACKAGE_NAME__ build
pnpm --filter __PACKAGE_NAME__ test
pnpm --filter __PACKAGE_NAME__ typecheck
```

Read [Plugin anatomy](https://github.com/codeasier/dsh-plugins/blob/main/docs/plugin-anatomy.md) and
[Client UI](https://github.com/codeasier/dsh-plugins/blob/main/docs/client-ui.md) before extending the plugin.

## License

MIT
