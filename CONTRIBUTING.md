# Contributing

Thanks for helping. This repository ships plugins for DeepSeek Harness (`dsh`),
one independently released npm package per plugin. Contributions of code,
docs, tests, and bug reports are all welcome.

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
Contributions are licensed under the repository's [MIT license](LICENSE); there
is no separate CLA.

## Ways to contribute

- **Report a bug** with the bug report form: versions, exact command, and
  sanitized output.
- **Request a plugin or feature** with the feature request form. Describe the
  problem and the deployment (CLI or Desktop).
- **Improve docs** — corrections are valuable, especially when a DSH release
  changes behavior.
- **Send a pull request** — code, tests, and docs together.

For security issues, do not open a public issue; follow [SECURITY.md](SECURITY.md).

## Development setup

```sh
corepack enable
corepack prepare pnpm@11.21.0 --activate
git clone git@github.com:codeasier/dsh-plugins.git
cd dsh-plugins
pnpm install
pnpm check
```

Requirements: Node `>=22.18.0`, pnpm 11, git. A local DSH installation is needed
only for the composition and Desktop checks.

If you do not have write access, fork the repository and add your fork as a
remote.

## Workflow

1. Open or find an issue for anything larger than a typo.
2. Create a branch: `feat/hello-timeout`, `fix/kit-clamp`, `docs/install-desktop`.
3. Make one logical change. Refactors and behavior changes belong in separate
   pull requests.
4. Add or update tests and documentation.
5. Add a changeset if a published package changed.
6. Run `pnpm check`, then install the plugin into a profile and exercise it.
7. Open a pull request using the template. Link the issue.

Keep the branch rebased on `main`; do not squash-merge unrelated commits.

## Commit messages

Use Conventional Commit subjects with the package in parentheses:

```text
feat(hello): add maxNameLength config
fix(kit): keep surrogate pairs when clamping
docs(install): explain the Desktop profile owner
chore(ci): cache the pnpm store
```

The subject states what changed. The body explains why and notes migration or
risk. Commits are squashed on merge; the PR title becomes the commit subject, so
write it the same way.

## Adding a plugin

```sh
pnpm new my-plugin --description "What a user gains from this plugin."
```

For a browser half:

```sh
pnpm new my-panel --ui --description "Adds a status panel beside the composer."
```

Then:

1. Replace the generated echo tool with the real capability.
2. Update `locale/en.json`, `locale/zh.json`, `icon.svg`, and the README.
3. Add tests for success, invalid input, and error messages.
4. Set `engines.dsh` to the versions you actually tested.
5. Add a changeset. The first publish of a new package does not need one.
6. Install the packed tarball into a real profile and exercise the capability.

Use `pnpm install:local <pkg> --profile web`; a source directory cannot be
installed directly because it has no built `dist/` and is not a packed artifact.

Read [Plugin anatomy](docs/plugin-anatomy.md) and
[Client UI](docs/client-ui.md) before writing code. The
[conventions](docs/conventions.md) are the review checklist.

## Changesets

<a id="changesets"></a>

Every user-visible change to a published package needs a changeset:

```sh
pnpm changeset
```

- Select the smallest set of packages that actually changed.
- `patch` for fixes, `minor` for features. While `0.x`, a minor may contain a
  breaking change, but say so in the text.
- Write for a user: what changed, and what they must do differently.
- A `plugin-kit` change gets its own changeset. Plugins compile the kit into
  their tarballs, so every plugin that should ship the change needs its own
  changeset and release; there is no runtime range to bump.
- Do not commit `.changeset/pre.json` unless the repository is in prerelease
  mode.

CI, docs, tests, and repository-tooling changes do not need a changeset.

## Verification

A pull request states what was verified and what was not. At minimum:

- [ ] `pnpm check` passes locally.
- [ ] The plugin was installed into a profile (CLI or Desktop).
- [ ] The added capability was exercised, not just registered.
- [ ] UI work was checked in a real page in light and dark themes, or marked
      unverified.
- [ ] Disabling/removing the plugin leaves no UI or tool behind after the
      expected restart.

CI cannot boot Desktop or see a rendered page. Do not claim visual success from
a successful install.

## Pull request review

Reviewers check:

- The change solves the linked problem and does not expand scope silently.
- Conventions and machine checks pass; the catalog is regenerated.
- Tests cover behavior, not implementation details.
- Error messages are actionable and do not leak secrets or local paths.
- DSH packages remain peers; no install scripts; no unexplained dependency.
- Compatibility and changelog text are honest about what was tested.
- Docs and plugin README are updated.

A maintainer merges after CI is green and the checklist is satisfied. The
Version Packages PR is generated separately; never bump versions by hand in a
feature PR.

## Documentation

- Behavior changes update the plugin README and, when repository-wide, `docs/`.
- A decision affecting multiple packages gets an ADR in `docs/adr/`.
- The plugin catalog is generated; edit the source packages, then run
  `pnpm sync:registry`. Never edit between the catalog markers by hand.
- Run `pnpm check:docs` after moving files or renaming headings used in links.

## Release

Only maintainers publish. See
[Build and release](docs/build-and-release.md) and the
[maintainer runbook](docs/maintainers.md). A release happens by merging the
Version Packages PR; do not run `npm publish` from a feature branch.

## Getting help

- Usage questions: GitHub Discussions.
- Bugs and feature requests: issue forms.
- Security: [SECURITY.md](SECURITY.md).

Please keep discussions technical and assume good faith. A maintainer may close
a pull request that does not follow the conventions, with a pointer to the
specific rule.
