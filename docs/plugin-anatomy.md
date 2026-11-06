# Plugin anatomy

A plugin is a normal npm package with a `dsh` section. This page walks through
every part, using
[`@codeasier/dsh-plugin-hello`](../packages/dsh-plugin-hello) as the reference.

## Files

| File | Required | Purpose |
|---|---|---|
| `package.json` | yes | Identity, exports, bundle patch, client declaration, compatibility. |
| `cordis.patch.yml` | yes | The bundle layer; inserts the Loader row. |
| `src/index.ts` | yes | Host entry: `name`, `inject`, `Config`, `apply`. |
| `dist/` | built | Publishable host artifact; never committed. |
| `locale/en.json`, `locale/zh.json` | yes | Display metadata read without activating the plugin. |
| `icon.svg` | yes | Display icon, up to 256 KiB. |
| `README.md` | yes | Install, behavior, config, compatibility, development. |
| `CHANGELOG.md` | yes | Maintained by Changesets. |
| `src/*.test.ts` | yes | At least one unit test. |
| `client.js` | if UI | Browser half in loader-factory format. |
| `tsdown.config.ts`, `tsconfig.json` | yes | Build and type-check configuration. |

## `package.json`

```json
{
  "name": "@codeasier/dsh-plugin-hello",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" },
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./locale/*.json": "./locale/*.json",
    "./icon": "./icon.svg",
    "./package.json": "./package.json"
  },
  "files": ["dist", "cordis.patch.yml", "locale/*.json", "icon.svg", "README.md", "LICENSE"],
  "dsh": { "bundle": { "patch": "./cordis.patch.yml" } },
  "engines": { "node": ">=22.18.0", "dsh": ">=0.2.1-rc.2 <0.3.0" }
}
```

Every field is specified in the [manifest reference](manifest-reference.md).
Three rules matter at code level:

- **One row per plugin.** `dsh.bundle.patch` points at the bundle layer; that
  layer inserts a row whose `id` is the short name and whose `name` is the
  package name.
- **`files` is the publish allow-list.** If a runtime file is not listed, it is
  not installed. The pack check catches omissions.
- **`engines.dsh` gates loading.** DSH refuses the package before importing it
  when the range excludes the running version.

## Bundle patch

```yaml
- insert:
    - id: hello
      name: '@codeasier/dsh-plugin-hello'
```

The patch can also carry `config` when a plugin has no meaningful defaults, can
insert a group, or can override rows another bundle declared. Do not copy the
profile's own settings into the bundle: users change `config` in their profile
patch, and a bundle-level `config` is replaced wholesale by any override.

Patch dialect in one sentence: `insert` appends rows; a mapping with `id` and no
`insert` targets an existing row and replaces supplied fields, with `config`
replaced wholesale; `group`, `disabled`, `isolate`, and `!!js` are available for
advanced compositions.

## Host entry

```ts
import type { Context } from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import z from '@deepseek-ai/schemastery'

export const name = 'hello'
export const inject = ['tools']

export interface Config {
  greeting: string
}
export const Config: z<Config> = z.object({
  greeting: z.string().default('Hello'),
})

export function apply(ctx: Context, config: Config): void {
  ctx.tools.register(defineTool({
    name: 'hello',
    description: 'Greet a person by name.',
    parameters: { name: { type: 'string', required: true, description: 'Who to greet.' } },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: { text: { type: 'string', required: true } },
      },
      render: (_args, value) => [{ type: 'text', text: value.text }],
    },
    async execute(args) {
      return { text: `${config.greeting}, ${args.name}!` }
    },
  }))
}
```

Exports are named and exclusive: either a `name` / `inject` / `Config` / `apply`
function plugin, or a service class as the default export. Do not mix forms.

### `name`

Stable Loader identity. Keep it equal to the row id. Changing it is a breaking
change for any profile that overrides the row by id.

### `inject`

The services the plugin needs. Without `inject`, `ctx.tools` is not guaranteed
to exist and the plugin can activate too early. Put every optional service in
`inject` (or use `ctx.inject([...], ...)`) so the plugin stays inactive in
profiles that do not provide it instead of throwing.

### `Config`

A [Schemastery](https://github.com/deepseek-ai/deepseek-harness) schema. DSH
validates the row's `config` at activation. Rules:

- Put every tunable here, not in module constants.
- Give defaults, so an empty `{}` row is valid.
- Re-validate semantic constraints in `apply` when the schema cannot express
  them (for example, a positive integer that must also divide a batch size).
- Never store secrets in `config`; use a credential reference service instead.

### `apply`

Run every registration through `ctx`. Registrations made through the plugin
context are owned by it, so disabling or removing the plugin removes them.

- `ctx.tools.register(definition)` returns a disposer; returning it is optional
  for tool registration because the registry ties the layer to the context.
- For listeners, timers, sockets, and subscriptions, use `ctx.effect(() =>
  cleanup)` or `ctx.on(event, handler)` and return the disposer. Do not leave a
  timer or a listener alive after unload.
- Do not write another plugin's state, the profile, or the file system during
  activation unless that is the plugin's explicit feature.
- Activation must be deterministic. Network calls and slow I/O belong behind a
  tool or a lazily started service, not in `apply`.

## Tools

`defineTool` validates arguments before `execute` runs and validates the
returned value against `output.schema`. Practical rules:

- **Name** must be unique in the composition and is model-visible. Use a
  domain prefix when the name is generic.
- **Description** states exactly when to call the tool. It is prompt text, not
  documentation.
- **Parameters** are per-property specs with `required: true` inline, not a JSON
  Schema `required` array.
- **Output** is canonical data, not rendered text. `render` is a pure function
  that turns the value into content blocks; keep it free of I/O.
- **Errors** should be actionable and stable: `throw new Error('plugin: what
  failed and what to do')`. The registry reports the message to the model.
- **Cancellation**: if a tool performs long work, observe `exec.signal` and
  forward it to fetch/child processes.

## Display metadata

DSH reads these without activating the plugin:

`locale/en.json`:

```json
{
  "meta": {
    "title": "Hello",
    "description": "Adds a configurable hello tool that greets a person by name."
  }
}
```

- Add `locale/zh.json` (and any other shipped locale) with the same shape.
- Export `./locale/*.json` and `./icon`.
- The icon must be an image inside the package, at most 256 KiB: SVG, PNG, JPEG,
  or WebP. An original icon is required; if you use third-party artwork, its
  license must allow redistribution and attribution must be kept.
- A package-root plugin may declare a top-level `icon` field instead; it takes
  priority over `./icon`.

## Tests

At minimum, mount the plugin against the interface it declares and assert the
user-visible behavior:

```ts
const registered: ToolDefinition[] = []
const ctx = {
  tools: { register: (definition) => { registered.push(definition); return () => {} } },
} as unknown as Context

apply(ctx, { greeting: 'Hello' })
await expect(registered[0].execute({ name: 'Ada' }, {} as never))
  .resolves.toEqual({ text: 'Hello, Ada!' })
```

That test proves registration and behavior without booting DSH. Pack and
composition checks cover the rest; see [Testing](testing.md).

## Anti-patterns

| Don't | Why |
|---|---|
| Import `@deepseek-ai/dsh-client-ui-primitives` from a client module | Harness client packages are not a stable API for plugins; a missing module blanks the slot. |
| Append session events with a new `type` | Readers reject unknown stored events unless marked ignorable; use projections or existing events. |
| Serve an HTML page in an iframe | It loses theme tokens, light/dark switching, and locale. Use a slot. |
| Write DOM outside your component | Fights React and host layout; breaks on unmount. |
| Hard-code colors in UI | Use `--dsw-alias-*` tokens. |
| Put secrets in `cordis.patch.yml` | The profile file is readable; use a credential reference. |
| Add a dependency on another plugin bundle | Bundle order becomes an install constraint; move shared code into `plugin-kit` or a plain library. |
| Use install scripts | pnpm 11 blocks them by default and they run outside review. |
| Depend on `@deepseek-ai/dsh-*` as a bundled dependency | It duplicates a shared instance and breaks service injection. Use `peerDependencies`. |

## Definition of done

- Behavior implemented and tested.
- `name`, row id, `engines.dsh`, locales, icon, README, and changelog updated.
- `pnpm check` passes locally.
- A changeset exists unless this is the first publish of a new package.
- The plugin was installed into at least one profile, and its capability was
  exercised (for Desktop, say which part was verified).
