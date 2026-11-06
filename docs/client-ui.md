# Client UI

A host-only plugin adds tools, services, or commands. A plugin that renders in
the Web UI or Desktop window also ships a **client half**: a browser module that
DSH serves from the plugin package and loads lazily.

Generate one with:

```sh
pnpm new my-panel --ui --description "Adds a status panel to the composer."
```

Read this page before changing the generated `client.js`. The rules here come
from DSH's client module system and are not style preferences.

## Manifest changes

A UI plugin adds three things to the host-only manifest:

```json
{
  "exports": { "./client": "./client.js" },
  "files": ["dist", "client.js", "cordis.patch.yml", "locale/*.json", "icon.svg", "README.md", "LICENSE"],
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

- `exports["./client"]` must be a string or `{ default: string }`.
- `dsh.client.platform` must be `web`.
- `dsh.client.inject` only orders activation; it does not import modules for
  you.
- `immediately: true` loads the bundle at boot. Use it for small decorations
  that must be present before interaction; omit it for panels whose slot loads
  on demand.

## Artifact format

The browser artifact is a lazy factory registration, not an ES module:

```js
window.__ModuleLoader__.load({
  id: '@codeasier/dsh-plugin-my-panel',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    function Panel() {
      return h('div', { style: { padding: 8 } }, 'Hello')
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        ctx.slots.inject('conversation.composer.dock', () =>
          ctx.slots.register(
            { name: 'conversation.composer.dock', id: 'my-panel', order: 50 },
            Panel,
          ),
        )
      },
    }
  },
})
```

Rules:

- **The id equals the package name.** DSH identifies the browser module by the
  manifest package name; a mismatch fails composition.
- **Running the file only registers the factory.** Module side effects belong
  inside `apply`, and resources must be disposed when the entry unmounts.
- **React comes from the shared module table.** `require('react')` resolves to
  the shell's copy. Never install a second React, load a CDN build, or use UMD.
- **The factory must be self-contained.** DSH supports compiler-generated
  package-local chunks for `import()`; hand-written relative imports between
  client files are not a supported module boundary.
- **Compiled output must preserve this format.** If you compile the client half,
  build it to the same loader-factory shape and declare non-baseline runtime
  imports in `dsh.client.external`.

`node --check client.js` is a useful syntax gate, and the pack check ensures the
file ships. Neither proves that the slot renders.

## Slots

Register through the client context:

```js
ctx.slots.inject('conversation.composer.dock', () =>
  ctx.slots.register({ name: 'conversation.composer.dock', id: 'my-panel', order: 50 }, Panel),
)
```

- Choose a slot that already allocates space. For a decoration, the composer
  dock is a safe first choice; for a page, use a page slot.
- The `inject` callback is re-evaluated when the owning declaration collapses
  and returns; return every registration from it so teardown works.
- Read the selected slot's props and options from the running Harness rather
  than copying assumptions from another plugin.
- Do not read another plugin's DOM, stylesheet, or component internals.

## Styling

- Use the shell's design tokens: `--dsw-alias-*` for color and surface,
  `--dsw-radius-*` for corners. Literal colors are for artwork only.
- Copy markup and behavior from the host page of the same kind, then rename
  classes under your plugin's prefix.
- Do not import `@deepseek-ai/dsh-client-ui-primitives` or any other Harness
  client package as a module. Those packages are internal, change without
  notice, and a failing `require` blanks the slot entry.
- Do not render outside your component, append to `document.body`, or replace
  the app root.
- Do not serve an HTML page from the host and embed it in an iframe: it loses
  theme tokens, light/dark switching, and locale.

## Text and locale

Route user-visible text through the client locale service:

- Register a namespace with dictionary bundles for each locale.
- Use the service's translation function in components; do not hard-code
  English strings.
- Keep tool descriptions (model-facing) and UI strings (human-facing)
  separate: the former live in the host entry, the latter in locale resources.

## Shared modules

The shell seeds a frozen baseline table. Requests outside it fail unless they
are declared:

| Request | Handling |
|---|---|
| `react`, `react/jsx-runtime` | Baseline; no declaration. |
| Another enabled plugin's package row | Declare it in `dsh.client.external` only if the module system can resolve it there. |
| An arbitrary npm library | Bundle it into `client.js`; do not assume the browser can fetch it. |
| A Harness client package | Not a supported extension point; do not import it. |

Composition rejects malformed requests, missing suppliers, self-requests, and
synchronous cycles. A type-only import is erased and creates no request.

## Delivery, HMR, and restart

- DSH serves the exact artifact from the installed package at `/plugins` and
  combines enabled entries into boot scripts. A missing `client.js` fails
  activation with a build instruction naming the package and path.
- With HMR enabled, a rebuilt `client.js` gets a new revision and the open page
  replaces the row. Without HMR, restart the app.
- Replacing the installed package is a removal plus installation; the running
  process keeps the old module generation until restart.
- A page only applies graphs from the Host release it booted from. After a Host
  upgrade, reload the page.

## Verification

A UI change needs more than a passing build. Verify, in order:

1. `pnpm --filter <package> build` and `node --check packages/<package>/client.js`.
2. `pnpm pack:check` shows `client.js` in the tarball.
3. Install into a profile and confirm the host row is present:
   `dsh --profile web --dump-config`.
4. Open the page and confirm the slot renders in light and dark themes, with no
   `slot entry crashed` console error.
5. Disable the plugin and confirm the UI disappears without a reload when HMR
   is active, or after restart otherwise.

If browser control is unavailable, report exactly which steps ran and that the
rendered result was not observed. Installation and slot registration alone are
not visual verification.

## Checklist

- [ ] `./client` export, `dsh.client`, and `client.js` in `files`.
- [ ] Factory id equals the package name.
- [ ] Only baseline modules or declared `external` requests.
- [ ] Resources registered and disposed through the client context.
- [ ] Theme tokens only; no hard-coded colors.
- [ ] Locale service for visible text.
- [ ] Verified in a real page, or the limitation stated.
