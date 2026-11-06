# Install on the DSH CLI

This page covers installing and maintaining plugins in a profile used through
the `dsh` command. For the Electron Desktop app, read
[Install on Desktop](desktop.md); its profile is owned by the app.

## Profiles

A profile is a directory at `$DSH_HOME/profiles/<name>/`. `$DSH_HOME` defaults
to `~/.dsh`. Shipped profiles include `web`, `tui`, `headless`, `acp`, `sdk`,
and `sdk-minimal`; `desktop` is reserved for the Electron app.

Plugins are installed per profile. Installing into `web` does not affect `tui`.
A profile that has never been used is initialized from its shipped template on
first use.

## Install

> Before the first release, the packages are not on npm. Install a packed tarball
> with `pnpm install:local` (see [From a tarball](#from-a-tarball)); the registry
> commands on this page apply once a version is published.

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-hello
```

The command forwards its arguments to pnpm in the profile directory, then
selects the package as a bundle when its manifest declares
`dsh.bundle.patch`. The result is recorded in the profile's `package.json`:

```json
{
  "dependencies": { "@codeasier/dsh-plugin-hello": "0.1.0" },
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "@codeasier/dsh-plugin-hello"]
    }
  }
}
```

Exact versions are pinned by default for registry installs. To track a range
deliberately:

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-hello@^0.1.0
```

### From a tarball

Useful for a release candidate or a local build:

```sh
pnpm install:local dsh-plugin-hello --profile web
```

or manually:

```sh
pnpm --filter @codeasier/dsh-plugin-hello pack
dsh plugin --profile web add ./codeasier-dsh-plugin-hello-0.1.0.tgz
```

A source directory has no built `dist/` and is not a release artifact. Pack it
first; `pnpm pack` produces the same file list a publish would.

### From Git

pnpm accepts a Git address, but a Git install needs a build step and an
install-script approval. Prefer a published tarball or a packed local artifact.

## Verify

```sh
# The package is installed and the bundle is selected
dsh plugin --profile web ls

# The exact composed tree, including the plugin's row and config
dsh --profile web --dump-config

# The composed modules' config schemas; this imports plugin code
dsh --profile web --dump-config-schema
```

`--dump-config-schema` imports every composed plugin to read its schema. Run it
only for a composition you trust. The command may exit nonzero because a shipped
part of the composition emits schema diagnostics; check for your plugin's entry
in the JSON rather than relying on the exit code.

Then open a new session and exercise the capability. A tool registered by the
plugin becomes available to the model in that profile.

## Enable, disable, and update

- **Enable/disable a bundle:** use the Plugins page in the Web UI or the
  `plugin_manager` tool. Enabling appends the bundle to the end of the selection,
  which can change configuration precedence; disabling keeps the dependency
  installed.
- **Update one plugin:** `dsh plugin --profile web add
  @codeasier/dsh-plugin-hello@latest`, or the Update action in Plugin Manager.
  Never update all packages blindly: each plugin's `engines.dsh` range is its
  own contract.
- **Remove:** `dsh plugin --profile web remove @codeasier/dsh-plugin-hello`.
  Removal deselects the bundle, unloads its contributions, and removes the
  dependency.

After a package replacement, restart the app. DSH can recompose configuration
live when the profile enables HMR, but a running JavaScript module is not
replaced in place.

## Version gates

DSH checks `engines.dsh` before importing plugin code. If the running version
is outside the range, the install is refused and nothing is downloaded (for a
registry spec). On startup, an incompatible bundle is skipped and listed.

```text
incompatible-version: @codeasier/dsh-plugin-hello@0.2.0 requires dsh >=0.2.1-rc.2 <0.3.0
```

Options:

1. Upgrade DSH, then install the plugin.
2. Install an older plugin version whose range matches.
3. As a last resort, grant an exact-version exemption. This is risky; see
   [Troubleshooting](../troubleshooting.md#incompatible-version).

## Registries and the network

DSH's plugin manager asks the configured registry first and can fall back to
`https://registry.npmmirror.com/` while the first is unreachable or has no copy.
The CLI forwards pnpm, so pnpm's own registry, proxy, and authentication
configuration apply. If a registry cannot be reached, fix the registry or proxy
rather than granting an exemption.

Dependency install scripts are blocked by pnpm 11 until approved. This
repository ships no install scripts; a plugin that needs one is a supply-chain
smell and should be reviewed before approval.

## Multiple plugins, multiple profiles

Each package is independent. Install as many as the profile needs:

```sh
dsh plugin --profile web add \
  @codeasier/dsh-plugin-hello \
  @codeasier/dsh-plugin-other
```

Install the same package into several profiles by repeating the command with a
different `--profile`. There is no "install everything" meta-package; that would
couple every release.

## Uninstall completely

```sh
dsh plugin --profile web remove @codeasier/dsh-plugin-hello
```

If a profile's patch carries overrides for the removed bundle, delete those
rows too; a patch naming a missing id prints a warning and is skipped. Do not
delete the profile directory unless you intend to lose every profile setting.
