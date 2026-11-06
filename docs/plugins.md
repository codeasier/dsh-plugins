# Plugins

Every plugin is an independent npm package. Install one, several, or none; each
has its own version, changelog, compatibility range, and release.

<!-- plugins:start -->
| Plugin | What it adds | Version |
|---|---|---|
| [`@codeasier/dsh-plugin-hello`](../packages/dsh-plugin-hello) | A minimal, production-shaped DeepSeek Harness plugin: one configurable tool, display metadata, and independent release wiring. | `0.1.0` |
<!-- plugins:end -->

## Install

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
capability on its own; tsdown inlines it into every plugin that imports it. Its
API is documented in its [README](../packages/plugin-kit/README.md).

`hello` and `kit` are reference packages. They are published once at `0.1.0` to
validate the release pipeline and are listed in `.changeset/config.json`
`ignore`, so they do not receive future versions. Add a real plugin beside them
when one exists.
