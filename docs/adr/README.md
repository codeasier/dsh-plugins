# Architecture decision records

An ADR records a decision that affects more than one package or the release
process. It is short, immutable after acceptance, and superseded rather than
rewritten.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-one-package-per-plugin.md) | One npm package per plugin in a pnpm monorepo | Accepted |
| [0002](0002-engines-dsh-compatibility.md) | `engines.dsh` is the compatibility contract | Accepted |

## When to write one

- A new repository-wide dependency or toolchain.
- A change to the release process, package layout, or compatibility policy.
- A decision a future contributor is likely to reverse without context.

Do not write one for a single plugin's internal design; document that in the
plugin's README.

## Process

1. Copy [0000-template.md](0000-template.md) to `NNNN-short-title.md`.
2. Fill in context, decision, and consequences. Keep it under two pages.
3. Open a pull request. Discussion happens on the PR.
4. On merge, update the table above and mark the status Accepted.

Supersede an accepted ADR with a new one; leave the old file in place and link
both ways.
