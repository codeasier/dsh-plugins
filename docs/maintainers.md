# Maintainer runbook

Operational tasks that keep the repository and the npm organization healthy.

## Repository settings

| Setting | Value |
|---|---|
| Description | `Community plugins for DeepSeek Harness (dsh), one independently released npm package per plugin.` |
| Topics | `dsh-plugin`, `deepseek-harness`, `dsh`, `cordis`, `plugin`, `monorepo` |
| Homepage | `https://github.com/codeasier/dsh-plugins#readme` |
| Discussions | enabled for usage questions; issues stay for actionable bugs and requests |
| Issues | issue forms enabled; blank issues disabled |
| Private vulnerability reporting | enabled |
| Dependabot alerts and security updates | enabled |
| Dependabot version updates | npm disabled (`open-pull-requests-limit: 0`); grouped Actions updates monthly |
| Actions → General | **Allow GitHub Actions to create and approve pull requests** enabled |
| Default branch | `main` |

## Branch protection

Protect `main` with:

- a pull request before merging (administrators keep a bypass for emergencies);
- these required checks: `Check (Node 22)`, `Check (Node 24)`, and
  `Install into a clean DSH profile`, with branches required to be up to date;
- conversation resolution required;
- force pushes and deletions disabled;
- linear history required.

A review is expected by convention, not enforced while the project has a single
maintainer. Enable required reviews when a second regular reviewer joins.

The Changesets bot opens the Version Packages PR; it does not need direct push
access to `main`. Tags are pushed by the release action and are not blocked by
branch rules.

## npm organization

- The `@codeasier` scope must be owned by the organization that owns this
  repository. Verify with `npm org ls codeasier` and `npm access ls-packages`.
- Require 2FA for organization members.
- Keep the number of publish-capable members small.
- Use a granular automation token stored as the `NPM_TOKEN` repository secret.
- Preferred end state: npm **trusted publishing** bound to this repository and
  `.github/workflows/release.yml`, which removes the long-lived token. Test with
  a patch release before removing the token.

## Release duty

When a Version Packages PR appears:

1. Read the changelogs. Fix unclear text in the underlying changeset and let the
   PR regenerate rather than editing versions by hand.
2. Confirm only intended packages are bumped.
3. Confirm `engines.dsh` still reflects tested DSH versions.
4. Merge the PR.
5. Watch the `Release` workflow; it publishes changed packages, creates tags, and
   creates one GitHub Release per published package.
6. Verify on npm: versions, file list, and a provenance badge when OIDC is
   configured.
7. Smoke-test one install in a clean profile.

If the workflow fails after a partial publish, do not re-run blindly. Inspect
which versions reached npm; `changeset publish` skips versions already present.
Fix the cause, then re-run.

## First release of a package

A new package starts at `0.1.0` with no changeset. Once it is on `main`, the next
release run publishes it. After a package's first publish:

- verify its npm page, repository link, and published file list;
- install the registry version into a clean profile and exercise the capability;
- check the README install commands and compatibility table;
- add it to the catalog with `pnpm sync:registry` if it is new.

If the workflow refuses, check that:

- the package is not `private`;
- `publishConfig.access` is `public`;
- the npm token can publish to the scope;
- the package name is not already taken.

## Deprecating a package or version

```sh
npm deprecate @codeasier/dsh-plugin-old "Superseded by @codeasier/dsh-plugin-new; no fixes planned."
```

- Deprecate, then publish a final version whose README points to the successor.
- Remove the package from the catalog only after it is deprecated, and say so in
  the root README files.
- Do not unpublish unless a security incident requires it and npm policy allows
  it.

## Security incidents

<a id="security-incidents"></a>

1. Acknowledge the private report within 7 days.
2. Rotate any exposed token, secret, or npm credential immediately.
3. Prepare and test a patch release in a clean profile.
4. Deprecate the affected version with a reason.
5. Publish the fix.
6. Publish a GitHub Security Advisory and link it from the changelog.
7. Review whether the same pattern exists in other packages.

## Adding maintainers

- Add the person to the GitHub repository with the least role that works.
- Add them to `CODEOWNERS` only for the areas they own.
- Add them to the npm organization only when they need to publish.
- Document the change in the next release notes if it affects release access.

Remove access in the reverse order when a maintainer steps away.

## Catalog and docs hygiene

- The plugin catalog is generated. Never edit between the `plugins:start` and
  `plugins:end` markers.
- After adding or renaming a package, run `pnpm sync:registry`.
- `pnpm check` fails when the catalog is stale, a relative link is broken, or a
  manifest rule is violated.
- Decisions that affect multiple packages get an ADR in `docs/adr/`.

## Emergency checklist

- [ ] Can users still install the last known-good version?
- [ ] Is the bad version deprecated?
- [ ] Is the secret rotated if one was involved?
- [ ] Is the fix released, not just committed?
- [ ] Does the advisory name affected and fixed versions?
- [ ] Are the docs and catalog consistent with the new state?
