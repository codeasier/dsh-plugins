# dsh-plugins

Community plugins for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(`dsh`) — one independently versioned npm package per plugin.

[![CI](https://github.com/codeasier/dsh-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/codeasier/dsh-plugins/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22.18-339933.svg)](package.json)

English | [中文](README.zh.md)

> Not affiliated with DeepSeek. `dsh` and DeepSeek Harness are the platform;
> this repository ships community extensions for it.
>
> **Status: initial scaffold.** The reference plugin is not on npm yet. Until the
> first release, install it from a checkout with `pnpm install:local` — see
> [Getting started § Run your plugin in DSH](docs/getting-started.md#run-your-plugin-in-dsh).

## Why this repository

- **Install one plugin, update one plugin.** Each package has its own version,
  changelog, git tag, GitHub Release, and npm artifact. Nothing else moves.
- **Shared code, not copy-paste.** Cross-plugin helpers live once in
  [`@codeasier/dsh-plugin-kit`](packages/plugin-kit) and are compiled into each
  plugin at build time, so every published tarball installs on its own.
- **Conventions are executable.** A generator scaffolds new plugins, and CI
  checks manifests, row ids, locales, icons, docs links, and the real
  `npm pack` file list.

## Plugins

<!-- plugins:start -->
| Plugin | What it adds | Version |
|---|---|---|
| [`@codeasier/dsh-plugin-hello`](./packages/dsh-plugin-hello) | A minimal, production-shaped DeepSeek Harness plugin: one configurable tool, display metadata, and independent release wiring. | `0.1.0` |
<!-- plugins:end -->

Each plugin's README documents its behavior, configuration, and tested
compatibility. The shared kit is a source library compiled into each plugin, not
a bundle, so it is not listed above.

## Install

### DeepSeek Harness CLI

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-hello
```

Use `--profile tui` for the terminal profile. Restart unless the profile runs
with HMR. A local build installs with:

```sh
pnpm install && pnpm build
pnpm install:local dsh-plugin-hello --profile web
```

### DeepSeek Harness Desktop

Open **Plugins** in the Desktop window, or use the command runtime bundled with
the app. The npm `dsh` CLI intentionally cannot manage the Electron-owned
`desktop` profile.

Detailed steps: [CLI](docs/install/dsh.md) · [Desktop](docs/install/desktop.md).

## How it fits together

A DSH profile is an ordered list of bundles plus a patch layer. A plugin is an
npm package that declares `dsh.bundle.patch`; installing it selects the bundle,
and its patch inserts a Loader row. The plugin's host half runs in-process;
an optional client half is served to the Web UI and Desktop from the same
package.

```text
packages/dsh-plugin-hello
├── cordis.patch.yml     # inserts row "hello"
├── dist/                # host entry built by tsdown
├── locale/              # display metadata (en, zh)
└── icon.svg
```

Read [Architecture](docs/architecture.md) for the full model, and
[Plugin anatomy](docs/plugin-anatomy.md) for the code-level contract.

## Develop

Requires Node `>=22.18.0` and pnpm 11. The integration steps also need DSH
`>=0.2.1-rc.2 <0.3.0`.

```sh
corepack enable
corepack prepare pnpm@11.21.0 --activate
pnpm install
pnpm check
```

| Command | Effect |
|---|---|
| `pnpm build` | Build every package in topological order. |
| `pnpm test` | Run every package's Vitest suite. |
| `pnpm typecheck` | Type-check without emitting. |
| `pnpm lint` / `pnpm lint:fix` | Biome check / apply safe fixes. |
| `pnpm check` | Full gate: lint, types, tests, build, conventions, docs, packs. |
| `pnpm new <name>` | Scaffold a plugin and update the catalog. |
| `pnpm changeset` | Record a release note. |
| `pnpm install:local <pkg> --profile web` | Pack and install into a profile. |

### Add a plugin

```sh
pnpm new my-plugin --description "What a user gains from this plugin."
pnpm --filter @codeasier/dsh-plugin-my-plugin test
pnpm changeset
```

Use `--ui` to generate a browser half. The generator refuses to overwrite an
existing package and updates the catalog in this README and
[docs/plugins.md](docs/plugins.md).

## Compatibility

| Plugins | DeepSeek Harness | Node.js |
|---|---|---|
| `0.1.x` | `>=0.2.1-rc.2 <0.3.0` | `>=22.18.0` |

`engines.dsh` is checked before plugin code is imported. An out-of-range plugin
is refused at install and skipped at startup. The platform is pre-1.0; a range
states what was tested, not what merely happens to load. See
[Manifest reference § compatibility](docs/manifest-reference.md#compatibility).

## Documentation

- [Getting started](docs/getting-started.md)
- [Architecture](docs/architecture.md)
- [Plugin anatomy](docs/plugin-anatomy.md)
- [Manifest reference](docs/manifest-reference.md)
- [Client UI](docs/client-ui.md)
- [Build and release](docs/build-and-release.md)
- [Testing](docs/testing.md)
- [Troubleshooting](docs/troubleshooting.md)
- [Conventions](docs/conventions.md)
- [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md) · [Maintainer runbook](docs/maintainers.md)
- [中文文档](docs/zh/README.md)

## Security

Plugins execute in the DSH process with your user's permissions; there is no
plugin sandbox. Install reviewed releases, prefer exact versions, and never put
secrets in profile configuration. Report vulnerabilities through GitHub's
private advisory flow — see [SECURITY.md](SECURITY.md).

## Contributing

Issues and pull requests are welcome. Start with
[CONTRIBUTING.md](CONTRIBUTING.md) and the [conventions](docs/conventions.md);
the PR template lists the checks a review will apply.

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © 2026 codeasier. Individual plugins may ship third-party artwork;
keep the attribution required by its license.
