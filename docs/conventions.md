# Conventions

These rules make many small packages behave as one project. Some are enforced by
`pnpm check`; the rest are review criteria. If a rule is wrong, change it in this
document and in the check in the same pull request.

## Naming

| Thing | Rule | Example |
|---|---|---|
| Package | `@codeasier/dsh-plugin-<kebab>` | `@codeasier/dsh-plugin-hello` |
| Directory | `packages/dsh-plugin-<kebab>` | `packages/dsh-plugin-hello` |
| Loader row id | package suffix, lowercase kebab | `hello` |
| Tool name | lowercase with underscores if needed; unique in a composition | `hello`, `run_code` |
| Config key | camelCase | `maxNameLength` |
| Locale file | `locale/<bcp47>.json` | `locale/en.json`, `locale/zh.json` |
| Test file | beside the source, `*.test.ts` | `src/index.test.ts` |

The row id must be unique across the repository. It is stable API: users
override rows by id in their profile patches.

## Package layout

```text
packages/dsh-plugin-example/
├── cordis.patch.yml
├── icon.svg
├── locale/en.json
├── locale/zh.json
├── src/index.ts
├── src/index.test.ts
├── tsconfig.json
├── tsdown.config.ts
├── README.md
├── CHANGELOG.md
├── LICENSE
└── package.json
```

`client.js` is added only for a UI plugin. Generated `dist/` is never committed.

Use `pnpm new <name>` rather than copying a package by hand. The generator
creates the current layout, manifest, patch, tests, and catalog entry.

## Manifest

- Declare `engines.dsh`; never rely on an unbounded plugin.
- DSH packages are `peerDependencies`; ordinary libraries are `dependencies`.
- Never put a `@deepseek-ai/dsh-*` package in `dependencies`.
- Keep `files` explicit and include every runtime asset.
- Keep `publishConfig.access` at `public`.
- Include `README.md`, `LICENSE`, and `CHANGELOG.md` in every package.
- Pin the package version in the profile, not a loose range, unless the user
  explicitly wants automatic updates.

## Dependencies

| Dependency kind | Allowed | Notes |
|---|---|---|
| `@codeasier/dsh-plugin-kit` | yes | Imported from source and inlined by tsdown; not a runtime dependency. Pure helpers only. |
| `@deepseek-ai/schemastery` | yes | Config schema; a duplicate copy is harmless. |
| Small, audited utility libraries | with review | Prefer the standard library; justify in the PR. |
| DSH runtime packages | peers only | A second instance breaks service injection. |
| Another plugin bundle | no | Creates install-order coupling; move shared code to the kit. |
| Native modules or install scripts | no | Blocked by pnpm, hard to audit, platform-specific. |

The shared kit is deliberately small. Add to it only when at least two plugins
need the same behavior and the helper has no DSH service dependency. When a
plugin imports it, keep the three aliases in sync: `tsconfig.json` `paths`,
`vitest.config.ts` `resolve.alias`, and `tsdown.config.ts` `alias`. The generator
wires all three.

## TypeScript and code style

- ESM only, `"type": "module"`, Node 22+.
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `verbatimModuleSyntax` are on. Do not weaken them per package.
- Named exports only for plugin entries. Default exports are reserved for the
  service-class form.
- No `any` in published code; use `unknown` and narrow.
- Keep model-facing strings (tool names, descriptions, errors) in English and
  stable; they are prompt text.
- Error messages start with the plugin or tool name and say what to do:
  `hello: maxNameLength must be a positive integer`.
- No side effects at import time. Registration happens in `apply`.
- Comments explain why, not what. Delete commented-out code.

Biome owns formatting and import order. Run `pnpm lint:fix` instead of arguing
about style.

## Behavior

- Registration is owned by the plugin context. Return or register disposers for
  listeners, timers, sockets, and subscriptions.
- Activation is fast and deterministic. Network and disk work belongs in a tool,
  a command, or a lazily started service.
- Configuration belongs in `Config`, with defaults. Validate semantic
  constraints that the schema cannot express.
- Do not write the profile, the workspace, or another plugin's state from
  `apply`.
- For state derived from a session, use the session projection mechanism rather
  than polling or rescanning events.
- Observe cancellation (`exec.signal`) for long-running tools.

## User interface

- Render in a slot; never append a second application or write outside your
  component.
- Use `--dsw-alias-*` tokens, not literal colors.
- Do not import Harness client packages or primitives.
- Route visible text through the client locale service.
- Check light and dark themes, and disposal, before claiming UI success.

See [Client UI](client-ui.md).

## Documentation

Every plugin README contains:

1. What the plugin adds and a one-line example.
2. Install commands for the CLI and Desktop.
3. Configuration table and an override example.
4. Compatibility table.
5. Development commands.
6. License.

Repository-level behavior changes update `docs/`. A new decision that affects
multiple packages gets an ADR in `docs/adr/`.

The catalog in the root README files (`README.md`, `README.zh.md`) and
`docs/plugins.md` is generated. Never edit it by hand; run
`pnpm sync:registry`.

## Versions and compatibility

- Semver per package; `0.x` may break in a minor, but the changeset must say so.
- Every user-visible change gets a changeset. Internal refactors do not.
- `engines.dsh` reflects **tested** DSH versions, not hopes.
- Narrowing the range is a breaking change: announce it, and release a new
  version rather than mutating an existing one.
- Deprecate before removing. A removed tool or config key needs a changelog
  entry with a migration path.
- Never edit a published changelog or version.

## Security and review

- New dependencies need a reason and a license check.
- No secrets in source, tests, fixtures, screenshots, or logs.
- No obfuscated code or bundled binaries without review.
- Plugin code runs in-process with the user's permissions; treat every new
  capability as a security decision.
- Follow [Security](security.md) for reporting and handling vulnerabilities.

## Commits and pull requests

- Conventional Commit subjects: `feat(hello): ...`, `fix(kit): ...`,
  `docs: ...`, `chore: ...`.
- One logical change per PR. A refactor and a behavior change are separate PRs.
- The PR template asks for affected packages, a changeset, and verification.
- Keep `pnpm check` green. CI uses the same commands.

## Machine-enforced rules

| Check | Enforces |
|---|---|
| `pnpm lint` | formatting, imports, unused code, risky patterns |
| `pnpm typecheck` | strict TypeScript in every package |
| `pnpm test` | at least one passing suite per package |
| `pnpm build` | every entry builds and emits declarations |
| `pnpm check:conventions` | names, row ids, manifest fields, locales, icon, docs files, catalog |
| `pnpm check:docs` | relative links in user-facing Markdown |
| `pnpm pack:check` | publishable tarball contents and size |
| CI integration | install into a clean profile; composed schema imports |

## Definition of done

- [ ] Behavior implemented and tested.
- [ ] Manifest, patch, locale, icon, README, and changelog updated.
- [ ] `pnpm check` passes locally.
- [ ] Changeset added (or first publish of a new package).
- [ ] Installed into a real profile; capability exercised.
- [ ] Desktop-visible behavior verified or explicitly marked unverified.
- [ ] No secrets, no new unexplained dependency, no install script.
