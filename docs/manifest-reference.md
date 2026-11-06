# Manifest reference

This page specifies the `package.json` fields a plugin in this repository must
carry, and the exact compatibility rules DSH applies before it imports plugin
code.

## Fields

| Field | Required | Rule |
|---|---|---|
| `name` | yes | `@codeasier/dsh-plugin-<kebab-name>`; the suffix is the row id. |
| `version` | yes | Semver. Starts at `0.1.0`; Changesets owns every later bump. |
| `description` | yes | One sentence, 20–200 characters; also used in the catalog. |
| `keywords` | yes | Must include `dsh-plugin`; add domain terms after it. |
| `license` | yes | `MIT`, with a `LICENSE` file in the package. |
| `type` | yes | `module`. |
| `main`, `types` | yes | `./dist/index.js`, `./dist/index.d.ts` for resolvers that ignore `exports`. |
| `exports["."]` | yes | `{ "types": "./dist/index.d.ts", "default": "./dist/index.js" }`. |
| `exports["./cordis.patch.yml"]` | yes | The bundle patch path. |
| `exports["./locale/*.json"]` | yes | Display metadata. |
| `exports["./icon"]` | yes | Display icon. |
| `exports["./package.json"]` | yes | Lets inspectors read the manifest. |
| `exports["./client"]` | UI only | The browser half. |
| `files` | yes | `dist`, `cordis.patch.yml`, `locale/*.json`, `icon.svg`, `README.md`, `LICENSE`, plus `client.js` for UI. |
| `publishConfig.access` | yes | `public`. |
| `repository.directory` | yes | `packages/dsh-plugin-<name>`. |
| `homepage`, `bugs` | yes | Point at the package directory and the repository issues. |
| `engines.node` | yes | `>=22.18.0`. |
| `engines.dsh` | yes | The supported DSH range; see [compatibility](#compatibility). |
| `dsh.bundle.patch` | yes | One patch path, or an ordered array of patch paths. |
| `dsh.client` | UI only | `{ platform, inject?, external?, immediately? }`. |
| `dependencies` | as needed | Ordinary libraries only. DSH packages must not appear here. |
| `peerDependencies` | yes | Every DSH package the plugin imports. |

## `dsh.bundle.patch`

```json
{ "dsh": { "bundle": { "patch": "./cordis.patch.yml" } } }
```

A string or array of strings, relative to the package root. DSH reads the
declared files in order and concatenates their patch lists. A package without
this field is a dependency, not a bundle: `dsh plugin add` can install it, but
it contributes no rows and Plugin Manager reports `not-a-bundle`.

Every file named here must be in `files`; the pack check enforces that.

## `dsh.client`

```json
{
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "immediately": true,
      "inject": ["@deepseek-ai/dsh-client-ui-conversation"]
    }
  }
}
```

| Field | Required | Meaning |
|---|---|---|
| `platform` | yes | `"web"`. Other values are rejected. |
| `inject` | no | Client packages whose activation should precede this one. This orders activation; it does not provide modules. |
| `external` | no | Exact non-baseline module requests the bundle resolves against the shared table or another plugin row. Core modules such as `react` are baseline and need no declaration. |
| `immediately` | no | Load the bundle at boot instead of only when its slot is first needed. |

The browser artifact must register a lazy factory whose id equals the package
name; DSH serves it under `/plugins` and composes the boot graph from every
enabled entry that declares `dsh.client`. The package must export `./client` as
a string, or an object with a string `default`.

Details, constraints, and the exact artifact shape are in
[Client UI](client-ui.md).

## Compatibility

<a id="compatibility"></a>

Before importing a plugin, DSH compares its declared requirement with the
single runtime version returned by `dsh --version`.

### `engines.dsh` wins

When `engines.dsh` is present, it decides alone:

```json
{ "engines": { "dsh": ">=0.2.1-rc.2 <0.3.0" } }
```

Matching uses standard semver ranges with prereleases enabled
(`includePrerelease`), because DSH ships prereleases. `0.2.1-rc.2` and
`0.2.2-rc.1` both satisfy the range above.

Rules:

- An empty or invalid range is incompatible, not "no constraint".
- `workspace:`, `workspace:^`, `workspace:~`, and `workspace:*` are invalid
  here. They are only meaningful in peer ranges.
- A plugin with `engines.dsh` may declare any `peerDependencies` ranges; they
  are ignored for admission.
- A plugin with neither `engines.dsh` nor a DSH peer package imposes no
  version constraint. Do not do this in this repository: the conventions check
  requires `engines.dsh`.

### Peer fallback

When `engines.dsh` is absent, every `peerDependencies` range on
`@deepseek-ai/dsh` and `@deepseek-ai/dsh-*` must match the runtime. For peers
only, `workspace:^`, `workspace:~`, and `workspace:*` mean the current runtime.
An empty or invalid peer range is unmet.

### When the check runs

- **Install:** a registry spec is resolved and checked before `pnpm add` runs,
  so nothing is downloaded and no build script runs. A local path is read from
  its manifest. A git or tarball spec can only be judged after fetching; DSH
  restores the profile manifest and lockfile on refusal.
- **Startup and recomposition:** a bundle whose requirement is unmet is skipped
  and listed in `skippedBundles`; its rows never import.
- **Live reload:** a changed module is checked on the next composition.

A refusal carries the unmet requirement keyed `engines.dsh` or by peer name,
for example:

```json
{ "code": "incompatible-version", "requirements": { "engines.dsh": ">=0.2.1-rc.2 <0.3.0" } }
```

### Choosing a range

- Keep the lower bound at the oldest DSH the plugin is **tested** against.
- Keep the upper bound at the next minor (`<0.3.0`) while DSH is pre-1.0. A new
  minor may change plugin APIs; widening the range is a deliberate release.
- Do not chase every DSH release. A plugin that still works does not need a
  version bump; a package's published range stays valid.
- When narrowing a range, release it as a breaking change and say which DSH
  version is now required.

### Exemptions are a last resort

An exact `package@version` can be granted specific DSH runtime versions in the
profile's `compatibility.json`. The CLI exposes the workflow:

```sh
dsh plugin --profile web version-exemptions
dsh plugin --profile web allow-version @codeasier/dsh-plugin-x@0.2.0 \
  --dsh-version 0.2.2-rc.1 --accept-risk
dsh plugin --profile web revoke-version @codeasier/dsh-plugin-x@0.2.0 \
  --dsh-version 0.2.2-rc.1
```

An exemption is not a compatibility guarantee: the plugin may crash or corrupt
state. This repository does not grant exemptions on a user's behalf and does not
recommend them; upgrade the plugin or DSH instead.

## Tarball contents

`npm pack` always adds `package.json`, `README.md`, and `LICENSE` when present.
Everything else comes from `files`. CI runs `npm pack --dry-run --json` and
asserts that:

- `dist/index.js` and `dist/index.d.ts` exist;
- the bundle patch, both locales, and the icon exist for a plugin;
- no `src/`, test, `tsconfig`, or `tsdown.config` file leaks into the tarball;
- unpacked size stays under 2 MiB.

See [Build and release](build-and-release.md#pack-and-publish-artifact).
