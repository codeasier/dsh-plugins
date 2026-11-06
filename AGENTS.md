# AGENTS.md

Repository instructions for AI coding agents and humans who want the short
version.

## What this repository is

A pnpm monorepo of independent DeepSeek Harness plugins. Each plugin is a
publishable npm package with its own version, changelog, compatibility range,
and release. Shared helpers live in `packages/plugin-kit` and are compiled into
each plugin.

## Commands

```sh
pnpm install
pnpm check                 # lint, types, tests, build, conventions, docs, packs
pnpm new <name>            # scaffold a plugin (--ui for a browser half)
pnpm --filter <name> test
pnpm sync:registry         # regenerate the catalog
pnpm install:local <pkg> --profile web
```

Do not invent alternative build or publish commands. CI runs the same scripts.

## Rules

1. **Use the generator** for a new plugin. Do not copy a package by hand, and do
   not edit generated files in place; edit `templates/plugin/` when the template
   itself must change.
2. **Never edit the plugin catalog by hand.** It lives between
   `<!-- plugins:start -->` and `<!-- plugins:end -->` in `README.md` and
   `docs/plugins.md`; run `pnpm sync:registry`.
3. **DSH packages are peers.** Never move `@deepseek-ai/dsh-*` into
   `dependencies` or bundle them; a second instance breaks service injection.
4. **Every plugin declares `engines.dsh`.** Set it to the DSH versions actually
   tested. Narrowing it is a breaking change.
5. **Keep one row per plugin.** The bundle patch inserts exactly one row whose id
   is the package suffix and whose name is the package name.
6. **Ship the display contract.** `locale/en.json`, `locale/zh.json`,
   `icon.svg`, README, CHANGELOG, and LICENSE are required. Files used at runtime
   must be in `files`.
7. **Add behavior tests.** At minimum, mount the plugin against a fake context
   and assert registration plus the observable result.
8. **Add a changeset** for any published-package change, except the first publish
   of a new package. Docs/CI-only changes need none.
9. **No secrets, no install scripts, no obfuscated code.** Plugins run with the
   user's permissions.
10. **The shared kit is inlined.** Keep the `tsconfig.json` paths,
    `vitest.config.ts` alias, and `tsdown.config.ts` alias in sync. Never add a
    runtime dependency on an in-repo package; publish it and depend on the
    version, or compile it in.
11. **Do not claim UI verification without a rendered page.** Installation and
    slot registration are not visual proof.

## Where things are

| Path | Contents |
|---|---|
| `packages/dsh-plugin-*/` | Plugins. |
| `packages/plugin-kit/` | Shared source helpers, no DSH services; compiled in. |
| `templates/plugin/` | Generator source. |
| `scripts/` | Generator and checks; standard library only. |
| `docs/` | Policy and platform-facing documentation; `docs/adr/` for decisions. |
| `.github/workflows/` | CI and release. |

## Verification before reporting done

Run:

```sh
pnpm check
```

Then, for a plugin change, pack and install it into a profile you own:

```sh
pnpm install:local <package> --profile web
```

Exercise the capability in a session. For UI work, verify in a real page or state
the limitation explicitly. Never modify the user's real profiles or Desktop
configuration without approval.

## Writing

- English is canonical; `README.zh.md` and `docs/zh/` are Chinese entry points.
- Keep docs consistent with the installed DSH behavior. If the platform and this
  repository disagree, the platform wins; fix the docs.
- Link files with repository-relative paths in docs so `pnpm check:docs` can
  validate them.
