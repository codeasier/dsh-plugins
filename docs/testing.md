# Testing

The goal is confidence in four separate claims:

1. The code behaves.
2. The manifest and patch compose.
3. The published tarball contains what installation needs.
4. The plugin works in a real DSH profile.

Each claim has a different test; passing one does not imply another.

## Static checks

```sh
pnpm lint          # Biome format + lint
pnpm typecheck     # tsc --noEmit in every package
pnpm check:conventions
pnpm check:docs
```

Conventions and docs checks are repository-level tests. They catch missing
locales, a stale catalog, a row id that does not match the package name, a
missing `engines.dsh`, a broken relative link, and similar release blockers.

## Unit tests

Each package owns its Vitest suite next to the source:

```text
src/
├── index.ts
└── index.test.ts
```

Run one package or all:

```sh
pnpm --filter @codeasier/dsh-plugin-hello test
pnpm test
```

### Mounting a plugin

A full Cordis boot is unnecessary for most behavior. Declare the smallest
context the plugin uses and capture registrations:

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'

function mount(config: Config) {
  const registered: ToolDefinition[] = []
  const ctx = {
    tools: {
      register(definition: ToolDefinition) {
        registered.push(definition)
        return () => {}
      },
    },
  } as unknown as Context

  apply(ctx, config)
  return registered[0]
}
```

Assert:

- the plugin registers the expected number of tools;
- the tool name is stable (agents and saved prompts refer to it);
- valid arguments produce the documented value;
- invalid arguments and configuration fail with an actionable message;
- `output.render` returns the expected content blocks.

Keep the fake context honest: when a plugin starts using a new service, add it
to the fake and to `inject`. A test that passes because the plugin never touched
the new service is not coverage.

### What not to unit-test

- React rendering of a client half without the host slot system. Test the
  browser half in a real page instead.
- DSH's own composition. Use the composition smoke test below.
- npm or pnpm behavior. The pack check covers the artifact.

## Pack check

```sh
pnpm build
pnpm pack:check
```

This is the only check that reads the **real** published file list. It catches a
missing `dist`, a locale omitted from `files`, a leaked source file, and an
oversized package. A plugin can pass unit tests and fail installation for any of
these reasons.

## Composition smoke test

Use an isolated `DSH_HOME` so the test cannot touch your real profiles:

```sh
pnpm --filter @codeasier/dsh-plugin-hello pack
export DSH_HOME="$(mktemp -d)"
dsh plugin --profile web add "$PWD/codeasier-dsh-plugin-hello-0.1.0.tgz"
dsh --profile web --dump-config | grep -A 4 'id: hello'
dsh --profile web --dump-config-schema > schema.json 2> schema.err || true
grep -q '"id": "hello"' schema.json
grep -q '"maxNameLength"' schema.json
rm -rf "$DSH_HOME"
```

What this proves:

- the profile initializes and pnpm resolves the package and its dependencies;
- the bundle is selected and its patch inserts a row;
- `--dump-config` composes the row;
- `--dump-config-schema` imports the host module and reads its `Config`, which
  catches import errors, missing peer resolution, and invalid schema exports.
  The command can exit nonzero because a shipped part of the composition emits
  its own schema diagnostics; assert your plugin's entry and config fields in
  the JSON instead of relying on the exit code.

It does not prove that a tool works at runtime or that a client half renders.
Exercise the capability in a session, and read
[Client UI § verification](client-ui.md#verification) for UI work.

CI runs this on Ubuntu with Node 24 and the current DSH release. Locally, the
same steps work on macOS and Linux; use `$env:DSH_HOME` in PowerShell.

## Desktop matrix

Desktop is Electron-owned, so CI cannot boot it. Before a release that changes
Desktop-visible behavior, verify manually:

| Check | How |
|---|---|
| Install from registry | Plugins page installs the package, bundle enabled. |
| Install from tarball | `pnpm install:local <pkg> --desktop`, then restart. |
| Host capability | A new session can use the tool or feature. |
| UI | Slot renders in light and dark themes; no `slot entry crashed` in devtools. |
| Disposal | Disable the bundle; UI and tool disappear after the expected restart. |
| Version gate | An out-of-range package is refused with a clear message. |

Record which steps ran and which could not. "Installed" is not "verified".

## CI

`.github/workflows/ci.yml` runs:

- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`;
- `pnpm check:conventions` and `pnpm check:docs`;
- `pnpm pack:check`;
- a composition smoke test against the current published DSH on Node 24.

The static and unit jobs run on Node 22 and Node 24. The integration job runs on
Node 24 because the current DSH application requires it.

## Debugging failures

| Symptom | Start with |
|---|---|
| Vitest cannot resolve a DSH package | It is a peer/dev dependency; run `pnpm install` and check `peerDependencies`. |
| `tsc` reports a missing service | Import the package that augments `Context`, and add the service to `inject`. |
| Pack check says a file is missing | Add it to `files`; rebuild; run `npm pack --dry-run` in the package. |
| Composition smoke test refuses the version | The range does not include the installed DSH; compare `dsh --version`. |
| `--dump-config-schema` fails to import | A runtime import is missing from the tarball, a peer cannot resolve, or an export is invalid. |
| Client half 404s | `client.js` is not in `files`, or `exports["./client"]` is wrong. |
