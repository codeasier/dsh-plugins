# Plugins

Every plugin is an independent npm package. Install one, several, or none; each
has its own version, changelog, compatibility range, and release.

<!-- plugins:start -->
| Plugin | What it adds | Version |
|---|---|---|
| [`@codeasier/dsh-plugin-hello`](../packages/dsh-plugin-hello) | A minimal, production-shaped DeepSeek Harness plugin: one configurable tool, display metadata, and independent release wiring. | `0.1.0` |
| [`@codeasier/dsh-plugin-web-providers`](../packages/dsh-plugin-web-providers) | Configure any number of web search and web fetch vendors once, then switch the active one from Settings. | `0.1.0` |
<!-- plugins:end -->

## Install

The packages below are not on npm until the first release. Until then, install a
packed tarball from a checkout; after the first release, use the command below.

```sh
dsh plugin --profile web add <package>
```

Desktop users install through the **Plugins** page or the command runtime
bundled with the app. See [Install on DSH CLI](install/dsh.md) and
[Install on Desktop](install/desktop.md).

## Adding a plugin

```sh
pnpm new my-plugin --description "What a user gains from this plugin."
```

The generator updates this page and the root README. Do not edit the generated
table by hand; run `pnpm sync:registry`.

## Package kinds

| Kind | Example | Purpose |
|---|---|---|
| Plugin bundle | `@codeasier/dsh-plugin-hello` | Installs into a profile, inserts Loader rows. |
| Shared library | `@codeasier/dsh-plugin-kit` | Compiled into plugins; never installed as a bundle. |

The shared library does not appear in the catalog above because it adds no
capability on its own; tsdown inlines it into every plugin that imports it. Its API is documented in its
[README](../packages/plugin-kit/README.md).
