# Security

DeepSeek Harness plugins execute **in the host process** with the permissions of
the user running DSH. Installing a plugin is executing third-party code. There
is no plugin sandbox, and this repository cannot add one.

That is the premise for every rule here.

## Trust model

A plugin can, without additional approval:

- read and write files the DSH user can access;
- make network requests;
- read environment variables and profile configuration;
- register tools that the model can call;
- add UI that looks like part of the application.

A bundle patch also decides which code the Harness loads at startup. Review a
plugin the way you would review a native dependency, not a stylesheet.

## What this repository does about it

- **Public source.** Every published package ships from this repository and is
  built from tagged commits.
- **Reviewed releases.** Changes reach npm through a Version Packages pull
  request and a release workflow, not from a laptop.
- **Provenance.** The release workflow publishes with npm provenance, so npm
  shows which repository, commit, and workflow produced a tarball.
- **No install scripts.** pnpm 11 blocks dependency lifecycle scripts, and this
  repository does not ask users to approve any. A plugin that needs one must
  justify it in review.
- **Minimal dependencies.** The shared kit has no runtime dependencies and is
  compiled into each plugin. Plugins should prefer the standard library and DSH
  services.
- **Small surface.** Each plugin is its own package; there is no omnibus package
  that quietly gains new capabilities.
- **Machine checks.** Manifests, patches, file lists, and tarballs are checked in
  CI, so an unintended file does not ride along with a release.

## Installing safely

1. Install a specific version (`@codeasier/dsh-plugin-x@0.1.0`) rather than a
   loose range when stability matters.
2. Check npm's provenance badge and the linked commit.
3. Review the package's `cordis.patch.yml` and what it inserts. A bundle can add
   rows beyond its own plugin.
4. Read the plugin's README for its network and file access.
5. Remove plugins you no longer use; unpublished code cannot run.

## Secrets

- **Never put a secret in `cordis.patch.yml`.** The profile file is readable by
  the user and is often copied into bug reports. Use a credential reference that
  DSH resolves at runtime.
- **Never put a secret in tests, fixtures, screenshots, or logs.** A tool error
  is shown to the model and may be stored in the session log.
- **Prefer credential references over environment variables on Desktop.** A
  Dock/Finder launch inherits no shell environment, so an environment-variable
  secret silently fails there. File-based credentials still resolve.
- **Rotate, don't hide.** If a token reaches a commit or a tarball, revoke and
  reissue it. Deleting the commit is not enough.

## Supply chain

- npm organization members must use 2FA.
- Publish tokens are scoped automation tokens stored as repository secrets;
  rotate them after a maintainer leaves.
- Prefer npm trusted publishing once configured; it removes the long-lived token
  from CI.
- Dependabot alerts and security updates are enabled. Routine npm version
  updates are deliberate rather than automated, so a toolchain change lands in
  its own reviewed pull request; grouped Actions updates arrive monthly.
- The lockfile is committed. CI installs with `--frozen-lockfile`.

## Supported versions

Security fixes are released for the latest minor of each package. Because each
plugin is independent, an affected plugin gets a patch release without touching
the others.

| Package line | Supported |
|---|---|
| `@codeasier/dsh-plugin-hello` `0.1.x` | yes |
| Older lines | upgrade to the latest minor |

## Reporting a vulnerability

Do **not** open a public issue for a vulnerability.

Use GitHub's private vulnerability reporting:

1. Open the repository's **Security** tab.
2. Choose **Report a vulnerability**.
3. Include the affected package and version, reproduction steps, impact, and any
   suggested fix.

If private reporting is unavailable, open a minimal issue asking the maintainers
for a private channel, without details or proof-of-concept code.

You can expect:

- an acknowledgement within 7 days;
- a severity assessment and a remediation plan;
- a coordinated disclosure date, usually after a fixed release is available;
- credit in the advisory and changelog unless you prefer to stay anonymous.

## Scope

In scope:

- this repository's code and build workflow;
- published `@codeasier/dsh-plugin-*` packages;
- an install path that grants a plugin more capability than documented.

Out of scope here (report upstream to DeepSeek Harness):

- a platform-level sandbox escape or permission-model flaw;
- a vulnerability in a DSH package that this repository merely imports;
- social engineering that requires the user to ignore an explicit warning.

## Incident response for maintainers

1. Confirm and scope the issue; avoid discussing it in public channels.
2. Rotate any exposed token or secret.
3. Prepare a patch release; test it in a clean profile.
4. Deprecate the affected version on npm with a reason.
5. Publish the fix and a GitHub Security Advisory.
6. If code execution was possible, notify users through the repository's
   security advisories and the release notes.

See the [Maintainer runbook](maintainers.md#security-incidents).
