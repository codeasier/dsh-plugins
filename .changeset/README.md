# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).
Each file describes one user-visible change and the packages it affects. The
release workflow turns pending files into version bumps and changelog entries.

Create one with:

```sh
pnpm changeset
```

Rules:

- One package per plugin. A change belongs to the smallest package that needs it.
- `minor` while a package is `0.x` may include a breaking change, but call it out
  in the changeset text.
- A change to the shared `@codeasier/dsh-plugin-kit` needs its own changeset.
  The kit is compiled into plugins, so every plugin that should ship the change
  also needs its own changeset and release.
- Never edit a published version or a released changelog by hand.

Do not commit `.changeset/pre.json` unless the repository is deliberately in
prerelease mode.
