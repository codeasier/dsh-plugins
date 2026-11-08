# Documentation

This repository hosts independent plugins for
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (`dsh`).
The docs are versioned with the code: a behavior described here is expected to
match the packages on `main`.

## Start here

| If you want to… | Read |
|---|---|
| Get a quick answer | [FAQ](faq.md) |
| Install a plugin into the CLI or Desktop | [Install on DSH CLI](install/dsh.md) · [Install on Desktop](install/desktop.md) |
| Read the Chinese quick start | [中文快速入门](zh/README.md) |
| Hack on the repository | [Getting started](getting-started.md) |
| Understand why the repo is shaped this way | [Architecture](architecture.md) |
| Add a plugin | [Getting started § add a plugin](getting-started.md#add-a-plugin) · [Conventions](conventions.md) |

## Understand the platform model

| Document | Covers |
|---|---|
| [Architecture](architecture.md) | Packages, profiles, bundles, patches, releases, and what is shared. |
| [Plugin anatomy](plugin-anatomy.md) | Every file and export a plugin needs, with the lifecycle rules. |
| [Manifest reference](manifest-reference.md) | Exact `package.json` fields, exports, `dsh` metadata, and version gates. |
| [Client UI](client-ui.md) | The browser half: loader format, slots, themes, modules, and verification. |
| [Plugins catalog](plugins.md) | Generated list of every plugin in this repository. |

## Operate and ship

| Document | Covers |
|---|---|
| [Build and release](build-and-release.md) | Local builds, Changesets, independent npm releases, provenance, rollback. |
| [Testing](testing.md) | Unit tests, pack checks, composition smoke tests, and the Desktop matrix. |
| [Troubleshooting](troubleshooting.md) | Version refusals, missing bundles, restart requirements, Desktop locks. |
| [Maintainer runbook](maintainers.md) | Repository settings, npm ownership, release duty, emergencies. |

## Contribute

| Document | Covers |
|---|---|
| [Contributing](../CONTRIBUTING.md) | Setup, workflow, review expectations, and the PR checklist. |
| [Conventions](conventions.md) | Naming, versions, dependencies, docs, and the machine-enforced rules. |
| [Security](security.md) | The trust model, secret handling, and reporting a vulnerability. |
| [ADR index](adr/README.md) | Accepted decisions and the template for new ones. |

## Canonical sources

Repository docs describe **this repo's** policy. For the platform itself, the
installed DSH packages and their READMEs are authoritative:

- A plugin's runtime modules ship under
  `$DSH_HOME/profiles/<profile>/node_modules/` (profile-installed bundles) or
  inside the DSH installation (shipped bundles).
- The DSH CLI exposes `dsh --dump-config`, `dsh --dump-config-schema`, and
  `dsh plugin --profile <name> <pnpm args>` for inspection and management.
- DSH's own package READMEs document composition, plugin management, client
  modules, and compatibility in more depth than this repo repeats.

When this repository and an installed DSH disagree, the installed DSH wins.
Open an issue so the docs can be corrected.
