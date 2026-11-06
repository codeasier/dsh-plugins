# Install on Desktop

DeepSeek Harness Desktop owns its own profile, named `desktop`. The npm `dsh`
CLI deliberately rejects boot, config-dump, and plugin-management requests for
that profile; the app (or the command runtime bundled with it) is the supported
owner.

## Option A: the Plugins page

1. Open DeepSeek Harness Desktop.
2. Open **Plugins** in the sidebar. (Before the first release, install a local
   tarball instead; the registry name does not resolve yet.)
3. Search for `@codeasier/dsh-plugin-hello` and install it, or point the
   installer at a local tarball.
4. Confirm the bundle is enabled.
5. Restart the app if the change is not live.

The page uses the app's own package manager and writes the same profile
manifest the CLI would. This is the least surprising path on macOS, Windows,
and Linux.

## Option B: the bundled command runtime

The Desktop installation ships a command runtime that is allowed to manage its
profile. On macOS:

```sh
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" --version
"/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
  plugin --profile desktop add @codeasier/dsh-plugin-hello
```

The path differs when the app is installed elsewhere; locate the
`runtime/cli/bin/dsh` file inside the installation. The version printed by
`--version` must satisfy the plugin's `engines.dsh` range.

With this repository checked out, the helper does the same:

```sh
pnpm install:local dsh-plugin-hello --desktop
```

It builds the plugin (including the inlined shared kit), packs it, and invokes
the bundled runtime.

Do **not** use the npm `dsh` command with `--profile desktop` for plugin
management. It is rejected by design, because package operations in the Desktop
profile are owned by the app.

## Verify

- The **Plugins** page lists the bundle and its rows without an error.
- Settings → Plugins shows the plugin in the read-only inventory.
- A new session can use the capability the plugin adds.
- After an app update, reload the window so the page matches the new Host
  release.

## Update and remove

Use the Plugins page for updates and removal. A package replacement requires a
restart; open pages keep the module generation they booted with.

If the page reports `restart-required`, close and reopen the app. If it reports
an unmet version range, update the app or install a plugin version that supports
your app.

## Troubleshooting

### The bundled CLI reports a permission error

The Desktop app and the CLI both take a write lock on the profile. Close the
running instance, or use the Plugins page, then retry. On macOS, a sandboxed
terminal may also deny writes to `~/.dsh`; run the command from a normal
terminal.

### The npm CLI refuses `--profile desktop`

That is expected. Use the Plugins page or the bundled runtime described above.

### The plugin is installed but the UI is unchanged

- A host-only plugin adds tools, not UI; there may be nothing new to see.
- A UI plugin needs a page reload after a Host release change.
- A package replacement needs an app restart.
- A disabled bundle contributes nothing; enable it in Plugins.

### Install succeeds, activation fails

Read the diagnostic in the Plugins page. Common causes are a missing
`client.js` in the published tarball (the package must ship it), an asset that
`files` omitted, or a DSH package imported as a dependency instead of a peer.

## Security note

The Desktop profile runs plugins in the app's process with the user's
permissions. Installing a plugin is executing third-party code, with or without
a UI. Prefer reviewed releases from this repository, check the npm provenance
badge, and read [Security](../security.md).
