# Getting started

This guide takes a new contributor from a clean clone to a plugin running in a
DeepSeek Harness profile.

## Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | `>=22.18.0` | The workspace and test runner require it. DSH Desktop bundles Node 24. |
| pnpm | `11.x` | The repository pins `pnpm@11.21.0`; Corepack reads it. |
| DeepSeek Harness | `>=0.2.1-rc.2 <0.3.0` | The plugins declare that range in `engines.dsh`. |
| Git | any recent version | The generator and checks use only standard Git. |

Enable the pinned package manager once:

```sh
corepack enable
corepack prepare pnpm@11.21.0 --activate
```

## Clone and verify

```sh
git clone git@github.com:codeasier/dsh-plugins.git
cd dsh-plugins
pnpm install
pnpm check
```

`pnpm check` runs, in order:

1. `biome check .` — formatting and lint rules.
2. `pnpm -r typecheck` — TypeScript in every package.
3. `pnpm -r test` — Vitest in every package.
4. `pnpm build` — tsdown builds in dependency order.
5. `pnpm check:conventions` — manifests, patches, locales, icons, catalog.
6. `pnpm check:docs` — relative links in user-facing Markdown.
7. `pnpm pack:check` — the real `npm pack` file list of every package.

The same sequence runs in CI on Node 22 and Node 24.

## Add a plugin

The generator writes a complete package and updates the generated catalog:

```sh
pnpm new my-plugin --description "What a user gains from this plugin."
```

With a browser half:

```sh
pnpm new my-panel --ui --description "Adds a status panel to the composer."
```

The generator refuses to overwrite an existing package. It creates:

```text
packages/dsh-plugin-my-plugin/
├── cordis.patch.yml       # bundle layer: inserts the plugin row
├── icon.svg               # display icon, ≤256 KiB
├── locale/en.json         # meta.title / meta.description
├── locale/zh.json
├── src/index.ts           # host entry: name, inject, Config, apply
├── src/index.test.ts
├── tsconfig.json
├── tsdown.config.ts
├── client.js              # only with --ui
├── README.md
├── CHANGELOG.md
└── package.json
```

Then:

1. Replace the generated echo tool with the real behavior.
2. Update the locale files, icon, README, and compatibility table.
3. Run `pnpm --filter @codeasier/dsh-plugin-my-plugin test`.
4. Add a changeset with `pnpm changeset`.
5. Try it in a profile (next section).

Read [Conventions](conventions.md) before opening a pull request. The
checklist there is what reviewers apply.

## Run your plugin in DSH

A source package directory has no built `dist/` and is not a publishable
artifact. Install a packed tarball, not the directory:

```sh
pnpm install:local dsh-plugin-my-plugin --profile web
```

The helper builds every package, runs `pnpm pack`, and calls:

```sh
dsh plugin --profile web add .pack/codeasier-dsh-plugin-my-plugin-0.1.0.tgz
```

Restart the app unless the profile enables HMR. Then open a new session and ask
the model to use the tool, or inspect the composition:

```sh
dsh --profile web --dump-config | grep -A 4 'id: my-plugin'
```

For Desktop:

```sh
pnpm install:local dsh-plugin-my-plugin --desktop
```

Or install through the Desktop **Plugins** page. See
[Install on Desktop](install/desktop.md).

## Repository map

| Path | Purpose |
|---|---|
| `packages/` | Publishable workspace packages; one plugin per directory. |
| `packages/plugin-kit/` | Shared source helpers with no DSH services; compiled into plugins. |
| `templates/plugin/` | Source used by `pnpm new`. Edit templates, not copies. |
| `scripts/` | Generator, conventions/docs/pack checks, local installer. |
| `docs/` | This documentation; `docs/adr/` records decisions. |
| `.changeset/` | Pending release notes and version policy. |
| `.github/` | CI, release workflow, issue forms, PR template. |

## Everyday commands

| Command | Effect |
|---|---|
| `pnpm build` | Build all packages in topological order. |
| `pnpm build:watch` | Watch-build all packages in parallel. |
| `pnpm test` | Run every package's Vitest suite. |
| `pnpm typecheck` | Type-check every package without emitting. |
| `pnpm lint` / `pnpm lint:fix` | Biome check; `--write` applies safe fixes. |
| `pnpm check` | Full pre-push gate (CI equivalent). |
| `pnpm new <name>` | Scaffold a plugin and install dependencies. |
| `pnpm changeset` | Record a release note. |
| `pnpm sync:registry` | Regenerate the catalog in README and `docs/plugins.md`. |
| `pnpm install:local <pkg> --profile web` | Pack and install into a profile. |
| `pnpm pack:check` | Validate publishable tarballs (build first). |

## Where to go next

- New to the platform? [Architecture](architecture.md).
- Writing the first tool? [Plugin anatomy](plugin-anatomy.md).
- Adding a page? [Client UI](client-ui.md).
- Blocked by version refusal or a missing bundle? [Troubleshooting](troubleshooting.md).
