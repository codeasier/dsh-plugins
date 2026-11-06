# Troubleshooting

Start by identifying which layer failed: install, composition, activation, or
runtime. Each layer reports a different error surface.

```text
dsh plugin add      → package download, version gate, bundle selection
dsh --dump-config   → patch composition
startup log         → module import, service injection, activation
the session         → tool behavior, UI rendering
```

## `incompatible-version`

<a id="incompatible-version"></a>

The package's `engines.dsh` range excludes the running DSH version.

```sh
dsh --version
npm view @codeasier/dsh-plugin-hello engines.dsh
```

Fix in this order:

1. Upgrade DSH to a version inside the range.
2. Install an older plugin version whose range matches.
3. Reconsider: a plugin outside its supported range may fail in non-obvious
   ways.

The exemption path exists for emergencies:

```sh
dsh plugin --profile web allow-version @codeasier/dsh-plugin-hello@0.1.0 \
  --dsh-version 0.2.2-rc.1 --accept-risk
```

It maps an exact package version to exact runtime versions in the profile's
`compatibility.json`. It is not a compatibility guarantee, does not carry over
to the next plugin or DSH release, and is not recommended by this repository.

## The package installs but the plugin does nothing

Check, in order:

```sh
dsh plugin --profile web ls
dsh --profile web --dump-config | grep -A 5 'dsh-plugin'
```

| Finding | Cause | Fix |
|---|---|---|
| Package present, no row | Bundle not selected, or manifest has no `dsh.bundle.patch` | Enable it in the Plugins page; check `not-a-bundle` below. |
| Row present, `disabled: true` | A higher-priority layer disabled it | Edit the profile's `cordis.patch.yml` or the home patch. |
| Row present, plugin inactive | A required service is missing from the profile | Check `inject` against the profile's bundles. |
| Row present, plugin failed | Import or activation error | Read the startup diagnostic; run `--dump-config-schema` for an import failure. |
| Row absent from `--dump-config` | Bundle skipped (unreadable patch, incompatible version, malformed manifest) | Read `skippedBundles` in the startup output. |

After any package change, restart unless the profile has HMR enabled.

## `not-a-bundle`

`dsh plugin add` installed a dependency but the manifest lacks
`dsh.bundle.patch`, or the published tarball omitted the patch file.

```sh
npm view @codeasier/dsh-plugin-hello dsh
```

- If `dsh` is missing, the package is a library, not a plugin.
- If `dsh.bundle.patch` is present but installation reports it missing, the
  package's `files` omitted the patch. That is a release bug; report it.

## `already-installed`

With HMR active, DSH refuses to install over a package that is already installed,
because the running process cannot replace its module generation in place.

```sh
dsh plugin --profile web remove @codeasier/dsh-plugin-hello
dsh plugin --profile web add @codeasier/dsh-plugin-hello@0.2.0
```

Restart between the two when the app keeps the old bundle running. The Plugins
page's Update action performs the remove-and-install sequence.

## `restart-required`

The change is saved but not live. Restart the app.

- HMR recomposes **configuration** live; it does not swap a running package's
  JavaScript.
- A profile without HMR applies nothing until restart.
- Desktop always requires a restart after a package replacement.

## Build scripts were blocked

pnpm 11 blocks dependency install scripts and reports pending package names.
This repository ships no install scripts.

If a third-party dependency needs one, review the script before approving. The
approval runs with your user's permissions and persists for that profile.
Prefer a dependency that does not need it.

## Installing from a source directory

A source directory has no built `dist/` and may contain aliases that only the
repository's build tooling understands. Install a packed artifact instead:

```sh
pnpm --filter @codeasier/dsh-plugin-hello pack
dsh plugin --profile web add ./codeasier-dsh-plugin-hello-0.1.0.tgz
```

`pnpm pack` produces the same file list a release would. `npm pack` also lists
the `files` entry, but use pnpm for consistency with the release process.

## Missing client bundle

```text
client-modules: client bundle not found; run `pnpm run build` before launch
```

The installed package has no `client.js`, or `exports["./client"]` points at the
wrong path. For a released package this is a packaging bug: `files` must include
`client.js`. For a source build, run the client build before installing.

## UI does not update after a change

- Rebuilt `client.js` reaches an open page only when HMR is active.
- A package replacement needs a restart.
- After a DSH upgrade, reload the page; a page applies only modules from its
  boot release.
- Disabling a bundle removes its UI; re-enabling reloads it.

## `ERR_PNPM_TARBALL_URL_MISMATCH`

pnpm verifies lockfile tarball URLs against the configured registry. This can
happen after installing from a different registry or mirror.

Practical recovery: use one registry consistently for the profile, remove the
affected package, and reinstall. If the profile lockfile is inconsistent, let
DSH's Plugin Manager perform the operation again from the Plugins page.

## Registry or network failure

```sh
npm config get registry
pnpm config get registry
```

DSH asks the configured registry and can fall back to the npmmirror mirror. The
CLI forwards pnpm, so pnpm's proxy and auth settings apply. If a registry is
down, wait or switch registry; do not weaken version checks to work around a
network failure.

## npm publish returns 401

The release workflow's `NPM_TOKEN` is missing, expired, or lacks rights for the
scope. Regenerate an automation token for the `@codeasier` organization and
update the repository secret. A classic token with 2FA-on-publish enabled cannot
be used for unattended CI.

## `--dump-config-schema` fails to import

This command imports every composed plugin to read its `Config`. A nonzero exit
can come from an unrelated shipped plugin's schema diagnostics; first check
whether the JSON contains your plugin's entry with `"status": "schema"` and its
config fields. A real failure means one of:

- the tarball omitted a runtime file that `dist/index.js` imports;
- a DSH package was declared as a dependency and resolved to a second copy;
- a peer dependency is missing from the runtime;
- the module throws at import time (side effects outside `apply`);
- the module does not export a valid `Config`.

Run it only against a composition you trust: it executes plugin code.

## Desktop permission or lock errors

```text
EPERM: operation not permitted, open '~/.dsh/profiles/desktop/package.json.lock'
```

- Close the running Desktop instance, or use the Plugins page.
- Run the command from a normal terminal, not a sandbox that denies `~/.dsh`.
- Use the command runtime bundled with the app, not the npm `dsh` CLI.
- Do not delete lock files while an operation is running.

See [Install on Desktop](install/desktop.md#troubleshooting).

## Node version errors

```sh
node --version
pnpm --version
```

The repository requires Node `>=22.18.0` and pnpm 11. The current DSH application
may require a newer Node than the repository's build floor; this matters for
integration tests and for the bundled runtime, not for a published plugin, which
runs inside DSH's own process.

## A patch warning names your row

A profile patch targeting a missing id is warned about and skipped. Common
causes: the plugin was removed but the override remains, the row id changed
(breaking), or the bundle is not selected. Remove the stale override or install
the matching plugin version.

## Getting help

Open an issue with:

- package and version, `dsh --version`, OS, Node and pnpm versions;
- the exact command and its output;
- `dsh --profile <name> --dump-config` if composition is involved, with secrets
  and personal paths removed;
- whether the failure happens on Desktop, the CLI, or both.

For vulnerabilities, follow [Security](security.md#reporting-a-vulnerability)
instead of opening a public issue.
