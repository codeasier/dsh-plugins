# FAQ

## What is DeepSeek Harness?

DeepSeek Harness (`dsh`) is a plugin-first agent runtime built on
[Cordis](https://github.com/deepseek-ai/deepseek-harness). Everything in a
running Harness — tools, models, UI rows — is a plugin composed from a profile.
This repository ships community plugins for it.

## Do I have to install every plugin?

No. Each plugin is an independent npm package. Install only what you need:

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-hello
```

## Can I install several plugins at once?

Yes. They compose in the profile's bundle order. The only coupling to watch is
row-id uniqueness and configuration precedence: later bundles and profile
patches win.

## Is there an "all plugins" package?

No, deliberately. A meta-package would make every plugin's release depend on
every other plugin's release, and would install capabilities a user did not ask
for. If demand appears, a separately versioned meta-package could be added
without changing the individual packages, but it is not part of this design.

## Can one plugin depend on another plugin?

Avoid it. Bundle order would become an install constraint, and disabling one
plugin could break another. Put shared helpers in
[`@codeasier/dsh-plugin-kit`](https://www.npmjs.com/package/@codeasier/dsh-plugin-kit),
which is compiled into each plugin, or in a plain library both plugins depend
on.

## Can a plugin use React or an npm library in the browser?

React comes from the shell's shared module table; do not install a second copy.
Other browser libraries should be bundled into `client.js`. DSH packages are not
a stable import surface for plugins. See [Client UI](client-ui.md).

## Does installing a plugin update it automatically?

No. The profile pins the installed version. Update deliberately:

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-hello@latest
```

Each plugin's `engines.dsh` range is its own compatibility contract; a bulk
update can cross several of them at once.

## Does it work on Desktop and the CLI?

Host-side plugins work in both: a profile is a profile. Desktop owns its
`desktop` profile, so install through the Plugins page or the bundled command
runtime. UI plugins render in the Desktop window and the Web UI from the same
package.

## Why the `@codeasier` npm scope?

The repository owner controls that scope, which keeps package names and
provenance tied to the same organization. Publishing requires membership in the
npm organization; contributors do not need it.

## Can I keep a plugin private?

This repository is public, so everything merged here is public. A profile can
install private packages from a private registry or a local tarball, but those
packages are outside this repository's release process.

## Why pnpm?

The pnpm workspace gives each plugin its own package while sharing one install,
one lockfile, and topological builds. The shared kit is compiled into each
plugin, so the published artifact has no workspace-only dependency and no
knowledge of the monorepo.

## Why TypeScript and tsdown?

TypeScript catches service-shape mistakes before a profile boots. tsdown emits
ESM, declarations, and source maps with one dependency and keeps DSH packages
external, which is required for a single shared runtime instance.

## Why do packages start at 0.1.0?

It signals pre-1.0 API stability without pretending to be a mature line. While
DSH is also pre-1.0, the platforms move; the plugin's `engines.dsh` range states
what was tested.

## How do I request a plugin?

Open a feature request with the problem you want solved, the deployment you use
(CLI or Desktop), and any API or data source involved. A request is more likely
to land if it needs no new privileged capability and can be tested in CI.

## How do I report a bug?

Use the bug report form with versions, the exact command, and sanitized output.
For a security issue, do not open a public issue; follow
[Security](security.md#reporting-a-vulnerability).

## Can I contribute a plugin?

Yes. Start with [Getting started](getting-started.md), then
[Conventions](conventions.md). A contribution is expected to include tests, a
changeset, documentation, and evidence that the plugin was installed into a real
profile.
