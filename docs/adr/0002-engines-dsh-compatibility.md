# 0002. `engines.dsh` is the compatibility contract

- Status: Accepted
- Date: 2026-11-06
- Deciders: @codeasier
- Supersedes: —
- Superseded by: —

## Context

DSH is pre-1.0 and moves quickly. Its plugin-facing packages change between
releases, and a plugin loaded into an incompatible runtime can fail late, in
ways that look like a bug in the plugin.

DSH already provides an admission mechanism. Before importing plugin code it
compares the plugin's declared requirement with the running version. When
`engines.dsh` is present, that range alone decides; when it is absent, every
`peerDependencies` range on `@deepseek-ai/dsh*` must match. Prereleases count.
The check runs at install, at startup, and at recomposition; an incompatible
bundle is skipped rather than imported.

## Decision

Every plugin in this repository declares `engines.dsh` with the range it was
actually tested against, and declares DSH packages as peer dependencies:

- keep the lower bound at the oldest tested DSH version;
- keep the upper bound at the next minor while DSH is pre-1.0;
- widen or narrow the range only in a released version, with a changelog entry;
- never put a `@deepseek-ai/dsh-*` package in `dependencies`;
- do not request, grant, or rely on exact-version exemptions in this repository.

Ordinary libraries, including `@deepseek-ai/schemastery`, remain dependencies
when a duplicate copy is harmless.

## Consequences

### Positive

- Incompatible plugins fail before their code runs, with a requirement the user
  can read.
- Users choose an update knowingly instead of discovering breakage at runtime.
- The tested range is visible on npm and in `--dump-config`.

### Negative

- Every DSH release that changes plugin behavior requires evaluating and
  possibly re-releasing affected plugins.
- A range is a promise about testing, not a proof; runtime behavior can still
  differ.
- Users who cannot upgrade DSH cannot install a plugin that narrows its range.

### Neutral

- The exemption mechanism remains available to users; the repository documents
  it as a risky last resort and does not automate it.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| No declared range | Silently loads incompatible code; the failure is harder to diagnose than a refusal. |
| Peer ranges only | More verbose, and DSH ignores them whenever `engines.dsh` is present. Mixing both without a policy invites drift. |
| Pin an exact DSH version | Every DSH patch or prerelease would break installation. |
| Bundle DSH packages | Duplicates services and breaks injection; also bloats every plugin. |

## References

- [Manifest reference § compatibility](../manifest-reference.md#compatibility)
- [Conventions § versions](../conventions.md#versions-and-compatibility)
- [Troubleshooting § incompatible-version](../troubleshooting.md#incompatible-version)
