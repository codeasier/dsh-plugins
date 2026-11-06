# Security Policy

## Supported versions

Security fixes are released for the latest minor of each package.

| Package | Supported |
|---|---|
| `@codeasier/dsh-plugin-hello` `0.1.x` | yes |
| Older lines | upgrade to the latest minor |

Each plugin is released independently, so a fix ships without waiting for other
plugins.

## Reporting a vulnerability

Do not open a public issue.

Use GitHub's private vulnerability reporting:

1. Open this repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include the affected package and version, reproduction steps, impact, and any
   suggested fix.

If private reporting is unavailable, open an issue asking for a private channel
without details or proof-of-concept code.

Expect an acknowledgement within 7 days, a severity assessment, a remediation
plan, and coordinated disclosure after a fixed release. Credit is given unless
you prefer to remain anonymous.

## Trust model

DeepSeek Harness plugins run **in-process with the DSH user's permissions**.
There is no plugin sandbox. A plugin can read and write files, use the network,
read profile configuration, and register tools the model may call.

Installing a plugin is executing third-party code. Review the source, install
specific versions, and remove plugins you no longer use.

## What this repository does

- Publishes from reviewed, tagged commits through GitHub Actions.
- Requests npm provenance so the registry records the source repository, commit,
  and workflow.
- Ships no install scripts and asks users to approve none.
- Keeps `@deepseek-ai/dsh-*` packages as peers, so plugins share the runtime's
  single instance.
- Checks manifests and real tarball contents in CI.

## Handling secrets

- Never put a secret in `cordis.patch.yml`, tests, fixtures, screenshots, or
  logs. Profile configuration is readable and often pasted into issues.
- Use a credential reference that DSH resolves at runtime. On Desktop, prefer a
  file-based credential over an environment variable: a Dock/Finder launch
  inherits no shell environment.
- If a secret reaches a commit or a tarball, revoke and reissue it. Deleting the
  commit is not sufficient.

## Scope

In scope: this repository's code, build workflow, and published packages; an
install path that grants a plugin more capability than documented.

Out of scope: vulnerabilities in DeepSeek Harness itself or in a DSH package
this repository merely imports. Report those upstream.

## More detail

The repository's fuller security model, supply-chain policy, and maintainer
incident runbook are in [docs/security.md](docs/security.md).
