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
pnpm --filter <name> pack --pack-destination .pack   # .pack/<name>-<version>.tgz
pnpm pack:check                                      # after pnpm build
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
pnpm release:ci   # build, then changeset publish when a credential is configured
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

## How npm publishing works

The release workflow never runs from a tag. It runs on a push to `main`, and the
Changesets action decides between two outcomes:

1. **Pending changesets exist** → it opens or updates the Version Packages PR.
   Nothing is published.
2. **No pending changesets** → it runs `pnpm release:ci`:
   `pnpm build`, then `changeset publish`.

`changeset publish` asks npm which local versions already exist and publishes
only the missing ones. It never republishes an unchanged package version. A push
with no version change is therefore a successful no-op, and the first release is
the exception where `0.1.0` is missing by definition.

That is how independent versions work in practice: a release can publish one
plugin, several plugins, or none, without a global repository version.

### Credentials and auth modes

The workflow supports two npm auth modes:

| `RELEASE_PUBLISH` | Run | Credential |
|---|---|---|
| unset or not `true` | push or dispatch | `NPM_TOKEN` secret |
| `true` | push or dispatch | OIDC trusted publishing |
| any | dispatch with `-f bootstrap=true` | `NPM_TOKEN` secret |

`NPM_TOKEN` is not removed when OIDC is enabled. It stays as the bootstrap
credential for a **new package's first publish**, because npm trusted publishing
can only be configured after the package exists.

A token-based publish through pnpm does **not** attach a provenance attestation.
The OIDC path does. See [Configure trusted publishing](#configure-trusted-publishing)
for the per-package setup.

Create a granular access token:

1. npmjs.com → **Access Tokens** → **Generate New Token** → **Granular Access
   Token**.
2. Grant read/write package access for the `@codeasier` scope (or all packages).
3. Choose a short expiry (90 days or one year) and calendar a rotation.
4. Allow the token to bypass 2FA so CI can publish without an OTP.
5. Store it as a repository secret:

   ```sh
   gh secret set NPM_TOKEN --repo codeasier/dsh-plugins
   ```

   Paste it at the prompt. Never put it in `.npmrc`, a workflow file, or a
   commit.

Confirm that the scope exists and your account can publish to it:

```sh
npm login
npm whoami
npm org ls codeasier
```

If the scope does not exist or your account lacks publish rights, fix that
before the first release. A successful CI run cannot work around a 404/403 from
the registry.

### First publish

A new package starts at `0.1.0` and has no changeset. The next release run
publishes it because that version is not on the registry. This repository's
initial `hello@0.1.0` and `kit@0.1.0` were published this way.

```sh
pnpm release:status   # the new package: "would publish"
gh workflow run release.yml -f bootstrap=true --repo codeasier/dsh-plugins
gh run watch
npm view @codeasier/dsh-plugin-hello version
gh release list
```

`-f bootstrap=true` forces the token path. It is required when
`RELEASE_PUBLISH=true` is already set, and harmless before that. After the first
publish, configure the new package's trusted publisher so later releases use
OIDC.

For a new package, confirm `publishConfig.access` is `public`, `files` includes
every runtime asset, and the npm scope exists. Do not add a changeset just to
produce `0.1.0`.

### Later releases

Merge the Version Packages PR. If no package version changed, `changeset
publish` publishes nothing and the run still succeeds. To inspect the decision
without uploading:

```sh
pnpm release:dry   # build, then list which package versions are missing on npm
pnpm release:status
```

### Configure trusted publishing

<a id="configure-trusted-publishing"></a>

Trusted publishing is configured **per package**, not per scope, and npm only
allows it for a package that already exists. You do not need to know future
packages in advance: configure each one after its first publish.

For every package that should publish through OIDC, run the equivalent of:

```sh
npx npm@12.2.2 trust github @codeasier/dsh-plugin-hello \
  --file release.yml \
  --repo codeasier/dsh-plugins \
  --allow-publish

npx npm@12.2.2 trust github @codeasier/dsh-plugin-kit \
  --file release.yml \
  --repo codeasier/dsh-plugins \
  --allow-publish
```

This operation requires a one-time password / 2FA. npm prints an authentication
URL; complete it in your browser. Run it in a normal terminal, not from an
unattended agent session. The npm website equivalent is package **Settings** →
**Trusted publishing** → GitHub Actions with repository
`codeasier/dsh-plugins`, workflow `release.yml`, and an empty environment.

Verify and enable OIDC:

```sh
npx npm@12.2.2 trust list @codeasier/dsh-plugin-hello
gh variable set RELEASE_PUBLISH --body true --repo codeasier/dsh-plugins
```

Once every package that might publish has a trusted publisher, normal releases
use OIDC and attach provenance. Until then, the token path keeps working.

For a **new** package after OIDC is enabled:

1. merge its Version Packages PR;
2. publish its first version with the bootstrap path:
   `gh workflow run release.yml -f bootstrap=true`;
3. run the `npm trust github <package> ...` command for it;
4. later releases use OIDC automatically.

In OIDC mode, `pnpm release:ci` first checks whether a package that is about to
publish exists on npm at all. If it does not, the run stops with these
instructions instead of attempting an OIDC publish that cannot succeed.

To temporarily force the token path again, dispatch with `-f bootstrap=true`.
To disable publishing entirely, remove the `RELEASE_PUBLISH` variable and the
`NPM_TOKEN` secret; `pnpm release:ci` then exits successfully without
publishing.

## Release workflow

`.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      bootstrap:
        description: "Use NPM_TOKEN for this run (new package or temporary fallback)"
        type: boolean
        default: false

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
          NODE_AUTH_TOKEN: ${{ (inputs.bootstrap == true || vars.RELEASE_PUBLISH != 'true') && secrets.NPM_TOKEN || '' }}
          RELEASE_BOOTSTRAP: ${{ inputs.bootstrap }}
          RELEASE_PUBLISH: ${{ vars.RELEASE_PUBLISH }}
```

Setup notes:

- Credential setup is in [How npm publishing works](#how-npm-publishing-works).
  `pnpm release:ci` skips publishing when neither a token nor
  `RELEASE_PUBLISH=true` is present, so a fork or a first push cannot fail the
  workflow.
- `setup-node` writes the npm auth line. Provenance requires trusted publishing
  (OIDC); the token-based path above does not attach an attestation.
- Repository setting **Actions → General → Allow GitHub Actions to create and
  approve pull requests** must be enabled, or the Version Packages PR cannot be
  opened.
- Branch protection must allow the action's bot to push the version commit and
  tags, or use the default branch without required reviews for that bot. See
  [Maintainer runbook](maintainers.md#branch-protection).
- Trusted publishing (OIDC) is opt-in per run through the
  `RELEASE_PUBLISH=true` repository variable. Configure each package's trusted
  publisher first; see [Configure trusted publishing](#configure-trusted-publishing).
  The `NODE_AUTH_TOKEN` expression keeps the token path until that variable is
  set, and the `bootstrap` dispatch input forces it for a new package's first
  publish.

## Manual release

Maintainers can publish from a clean checkout:

```sh
pnpm install --frozen-lockfile
pnpm check
export NODE_AUTH_TOKEN=...   # or `npm login`
pnpm release
```

`pnpm release:dry` builds and lists the package versions that are missing on
npm; `pnpm release:status` lists them without building. Neither uploads
anything.

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
- [ ] After publish: npm shows the new versions, GitHub Releases exist per
      package, and a provenance badge appears when OIDC is configured.
- [ ] Smoke-test one install from the registry into a clean profile or Desktop.
