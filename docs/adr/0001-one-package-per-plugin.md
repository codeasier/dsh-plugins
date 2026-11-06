# 0001. One npm package per plugin in a pnpm monorepo

- Status: Accepted
- Date: 2026-11-06
- Deciders: @codeasier
- Supersedes: —
- Superseded by: —

## Context

The repository must host multiple DeepSeek Harness plugins that can be built,
released, updated, and installed independently. They also need shared code and
one review process. DSH installs a plugin as an npm package that carries a
bundle patch; the profile records a version and a bundle selection per package.

The main alternatives were:

1. one repository per plugin;
2. one npm package exposing plugins as subpath exports;
3. a pnpm monorepo with one publishable package per plugin.

A repository per plugin gives perfect isolation but makes shared changes,
consistent CI, and a single catalog expensive. Repository overhead dominates
when a plugin is a few hundred lines.

One npm package with subpaths makes installation a single dependency, but every
plugin shares one version, one changelog, and one install. A user cannot update
one plugin without the others, and a bundle patch must live somewhere outside the
package or insert many rows implicitly.

## Decision

Use a pnpm workspace with:

- one publishable package per plugin under `packages/dsh-plugin-<name>`;
- one shared, publishable library at `packages/plugin-kit` for helpers that have
  no DSH service dependency;
- a shared source package that each plugin's build inlines, so published
  tarballs have no workspace-only runtime dependency;
- Changesets for per-package versions, changelogs, tags, and independent npm
  releases;
- a generator and machine checks for package structure and catalog consistency.

A plugin is installed as its own npm package. There is no meta-package.

## Consequences

### Positive

- Each plugin has an independent version, changelog, tag, GitHub Release, and
  install command.
- Shared code is reviewed and versioned once, then compiled into every plugin
  that uses it.
- One CI, one review process, one catalog, one security policy.
- The published artifact is a normal npm package; the monorepo is invisible to
  users.

### Negative

- Contributors need pnpm workspace knowledge; installing a source directory into
  a profile fails until it is packed.
- A kit change reaches users only when each plugin that should ship it is
  rebuilt and released; there is no runtime range to update on its own.
- CI must build and check every package, which grows with the catalog.

### Neutral

- The catalog table is generated to keep the README and docs consistent.
- A future meta-package remains possible as an additive package, but it is not
  part of this decision.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| One repository per plugin | Duplicated CI, tooling, and docs; no shared kit; expensive cross-plugin changes. |
| One package with subpath exports | Coupled versions and installs; DSH's bundle selection is per package. |
| npm workspaces | pnpm's workspace filtering, strictness, and pack behavior fit the release model better. |
| A build/release service | Adds an external dependency to a repository that otherwise needs only npm and GitHub Actions. |

## References

- [Architecture](../architecture.md)
- [Build and release](../build-and-release.md)
- [Plugin anatomy](../plugin-anatomy.md)
