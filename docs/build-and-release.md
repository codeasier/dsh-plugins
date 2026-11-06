# Build and release

Every package builds and publishes on its own schedule. This page describes the
toolchain, the local commands, the Changesets workflow, and the release
runbook.

## Toolchain

| Tool | Version | Role |
|---|---|---|
| Node.js | `>=22.18.0` | Local and CI runtime. |
| pnpm | `11.21.0` | Workspace, packing, publishing. |
| tsdown | `0.23.x` | Host bundle plus `.d.ts` and source maps. |
| TypeScript | `5.9.x` | Type-checking only (`--noEmit`); tsdown emits declarations. |
| Vitest | `5.1.x` | Unit tests per package. |
| Changesets | `2.31.x` | Versions, changelogs, tags, publish. |
| Biome | `2.6.x` | Format and lint. |

Versions are pinned in the root `package.json` and the pnpm lockfile. Upgrade
them in one pull request, with a CI run on Node 22 and Node 24.

## Build

```sh
pnpm build                 # every package, topological order
pnpm --filter <name> build # one package
pnpm build:watch           # parallel watch builds
```

Each plugin's `tsdown.config.ts`:

```ts
export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  platform: 'node',
  target: 'node22',
  outDir: 'dist',
  clean: true,
  dts: true,
  sourcemap: true,
})
```

Output:

```text
dist/
├── index.js        # ESM host entry
├── index.js.map
├── index.d.ts      # types for TypeScript consumers and editors
└── index.d.ts.map
```

DSH packages and published libraries stay external, so the runtime keeps one
instance of each. The workspace kit is different: tsdown aliases it to
`packages/plugin-kit/src/index.ts` and inlines it, so an installed tarball does
not depend on an unpublished package.

`dist/` is gitignored and rebuilt in CI and before publishing.

## Pack and publish artifact

```sh
pnpm --filter <name> pack          # writes <name>-<version>.tgz
pnpm pack:check                    # after pnpm build; validates every tarball
```

The pack check reads `npm pack --dry-run --json` and asserts:

- `dist/index.js` and `dist/index.d.ts` are present;
- the bundle patch, `locale/en.json`, `locale/zh.json`, and `icon.svg` are
  present for a plugin;
- no `src/`, test, `tsconfig`, or `tsdown.config` leaked in;
- unpacked size is under 2 MiB.

A package that fails this check cannot be released.

## Versioning policy

- Each package has its own version and `CHANGELOG.md`.
- `0.x` follows semver in spirit: a `minor` may contain a breaking change, but
  the changeset must say so. A `patch` is fix-only.
- While DSH is pre-1.0, keep `engines.dsh` to the tested minor line
  (`>=0.2.1-rc.2 <0.3.0`). Widening it requires a release that names the newly
  tested DSH version.
- A change to `plugin-kit` gets its own changeset. Because the kit is compiled
  into each plugin, every plugin that should ship the change also needs its own
  changeset and release; Changesets cannot bump a dependency edge that does not
  exist.
- Never edit a released version or a released changelog by hand.

## Changesets workflow

### 1. Record a change

```sh
pnpm changeset
```

Pick the affected packages and a bump level. Write a user-facing sentence: what
changed, and what a user must do differently, if anything. Commit the generated
`.changeset/*.md` with the code.

A pull request without a changeset is valid only when it changes no published
artifact: CI, docs, tests, or repository tooling.

### 2. Version PR

On every push to `main`, the release workflow opens or updates a pull request
named **Version Packages**. It runs:

```sh
pnpm version-packages   # changeset version && pnpm install --lockfile-only
```

That applies every pending changeset: bumps versions, updates internal ranges,
and prepends each package's `CHANGELOG.md`.

Review the PR like any other: versions, changelog text, and lockfile.

### 3. Publish

Merging the Version Packages PR runs the same workflow with no pending
changesets. It executes:

```sh
pnpm release   # pnpm build && changeset publish
```

`changeset publish` publishes only versions that are not on the registry yet,
tags each package `<name>@<version>`, and exits. The action then creates one
GitHub Release per published package from that package's changelog entry.

Because only changed packages get new versions, one release can publish
`@codeasier/dsh-plugin-a@0.2.0` while `@codeasier/dsh-plugin-b` stays on
`0.1.3`.

### 4. First publish of a new package

A new package starts at `0.1.0` in its manifest, with no changeset. When it
lands on `main`, the next release run publishes `0.1.0` because that version is
not on the registry. Do not add a changeset for the initial version unless you
intend to publish a different number.

## Release workflow

`.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false

permissions:
  contents: write
  pull-requests: write
  id-token: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v6
        with:
          version: 11.21.0
      - uses: actions/setup-node@v6
        with:
          node-version: 24
          cache: pnpm
          registry-url: https://registry.npmjs.org
      - run: pnpm install --frozen-lockfile
      - uses: changesets/action@v1.9.0
        with:
          version: pnpm version-packages
          publish: pnpm release:ci
          commitMode: github-api
          createGithubReleases: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: 'true'
```

Setup notes:

- Create an npm automation token with publish rights for `@codeasier` and save
  it as the repository secret `NPM_TOKEN`. Do not use a classic token with
  broad account scope.
- `pnpm release:ci` skips publishing while the token is absent, so a fork or a
  first push cannot fail the workflow. Configure the secret to enable releases.
- `setup-node` writes the npm auth line; `NPM_CONFIG_PROVENANCE=true` asks npm
  for a signed provenance attestation. Provenance needs a public repository and
  a workflow run from GitHub.
- Repository setting **Actions → General → Allow GitHub Actions to create and
  approve pull requests** must be enabled, or the Version Packages PR cannot be
  opened.
- Branch protection must allow the action's bot to push the version commit and
  tags, or use the default branch without required reviews for that bot. See
  [Maintainer runbook](maintainers.md#branch-protection).
- Trusted publishing (OIDC) can replace the token: configure the package's
  trusted publisher on npmjs.com for this repository and workflow, remove the
  `NODE_AUTH_TOKEN` line, and keep `id-token: write`. The release workflow's
  permissions are already sufficient. Test with a patch release first.

## Manual release

Maintainers can publish from a clean checkout:

```sh
pnpm install --frozen-lockfile
pnpm check
export NODE_AUTH_TOKEN=...   # or `npm login`
pnpm release
```

`pnpm release:dry` runs the build and `changeset publish --dry-run` without
uploading. Use it before a first release or after changing the workflow.

## Rollback and recovery

| Situation | Action |
|---|---|
| Bad release, no API break | Fix forward with a patch release. This is the default. |
| Bad release, users must stop installing it | `npm deprecate <pkg>@<version> "<reason>"`; publish a fixed version. |
| Leaked secret in a tarball | Rotate the secret, deprecate the version, publish a fixed version. Unpublish only if npm policy allows and no one could have installed it. |
| Broken CI on `main` | Revert the commit; do not publish from a red `main`. |
| Version PR conflicts | Close it, let the next push to `main` recreate it; never hand-edit versions in the PR beyond the changeset input. |

npm unpublish is a last resort and is time-limited and disruptive. Prefer
deprecation plus a fixed release.

## Release checklist

- [ ] `main` is green on Node 22 and Node 24.
- [ ] Every published change has a changeset with user-facing text.
- [ ] Version Packages PR reviewed; versions and changelogs match intent.
- [ ] `engines.dsh` ranges still reflect tested DSH versions.
- [ ] New packages have locale, icon, README, LICENSE, and `files` entries.
- [ ] `pnpm pack:check` passed in CI.
- [ ] After publish: npm shows the new versions, provenance badges appear, and
      GitHub Releases exist per package.
- [ ] Smoke-test one install from the registry into a clean profile or Desktop.
