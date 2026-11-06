# @codeasier/dsh-plugin-kit

Small, dependency-free helpers shared by this repository's DeepSeek Harness
plugins. The package has no DSH peer dependencies, so the same code runs in a
host plugin, a browser client module, a unit test, or a build script.

## Install

```sh
pnpm add @codeasier/dsh-plugin-kit
```

Plugins in this repository import it from source. The build (`tsdown`) aliases
`@codeasier/dsh-plugin-kit` to `packages/plugin-kit/src/index.ts` and inlines the
helpers into each plugin, so a published tarball has no dependency on this
package and installs on its own.

An external plugin author can still install the published package:

```sh
pnpm add @codeasier/dsh-plugin-kit
```

A kit change reaches in-repo users only when the affected plugins are rebuilt and
released. That is deliberate: installs stay self-contained.

## API

| Export | Purpose |
|---|---|
| `clampText(value, maxLength)` | Trim input and cap it by Unicode code point. |
| `errorMessage(error)` | One-line diagnostic for any thrown value. |
| `isRecord(value)` | Narrow parsed JSON to a plain object. |

## Conventions

- No side effects at import time.
- No DSH services, Cordis contexts, or Node built-ins that a browser cannot
  provide.
- Every export is additive; removing or changing one is a breaking change and
  needs a changeset that says so.

## License

MIT
