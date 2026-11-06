# Support

## Read the docs first

- [Getting started](docs/getting-started.md) — setup, commands, first install.
- [Troubleshooting](docs/troubleshooting.md) — version refusals, missing
  bundles, restart requirements, Desktop locks.
- [FAQ](docs/faq.md) — design questions, update behavior, compatibility.
- [Plugins catalog](docs/plugins.md) — every package and what it adds.

## Ask a question

Use [GitHub Discussions](https://github.com/codeasier/dsh-plugins/discussions)
for usage questions, setup help, and ideas that are not yet a concrete request.

## Report a bug

Open an issue with the bug report form. Include:

- package name and version, `dsh --version`;
- operating system, Node and pnpm versions;
- the exact command and its output;
- whether it reproduces on Desktop, the CLI, or both;
- `dsh --profile <name> --dump-config` when composition is involved, with
  secrets and personal paths removed.

## Request a feature or plugin

Use the feature request form. Describe the problem, who benefits, the deployment
(CLI or Desktop), and any API or data source involved. Requests that need no new
privileged capability and can be tested in CI are easiest to accept.

## Security issues

Do not open a public issue. Follow [SECURITY.md](SECURITY.md).

## What is not supported

- DSH versions outside a plugin's declared `engines.dsh` range.
- Unpublished forks or hand-edited copies of a package.
- Custom profile compositions that bypass `dsh plugin` or the Desktop Plugins
  page, unless the report identifies a plugin bug.

## Response expectations

This is a volunteer-maintained community project. Expect an initial response
within a week for a complete report. Security reports follow the timeline in
[SECURITY.md](SECURITY.md).
