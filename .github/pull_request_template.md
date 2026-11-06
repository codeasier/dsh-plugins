## Summary

<!-- What changed and why. Link the issue: "Closes #123". -->

## Affected packages

<!-- List every package whose published artifact changes. Write "none" for docs/CI. -->

- [ ] `@codeasier/dsh-plugin-hello`
- [ ] `@codeasier/dsh-plugin-kit`
- [ ] Other: 
- [ ] No published package (docs, CI, tooling)

## Type of change

- [ ] Bug fix (`patch`)
- [ ] Feature (`minor`)
- [ ] Breaking change (describe the migration below)
- [ ] Documentation or tooling only

## Changeset

- [ ] `pnpm changeset` added for every published package that changed
- [ ] Not needed: this is the first publish of a new package
- [ ] Not needed: no published artifact changes

## Verification

- [ ] `pnpm check` passes locally
- [ ] `pnpm build` and `pnpm pack:check` pass
- [ ] Installed with `pnpm install:local <package> --profile web` (or Desktop)
- [ ] Exercised the added capability in a session
- [ ] UI checked in a real page in light and dark themes, or marked unverified

What was verified, and what was not:

## Compatibility and documentation

- [ ] `engines.dsh` still reflects tested DSH versions
- [ ] Locales, icon, README, and CHANGELOG updated (plugins)
- [ ] `pnpm sync:registry` run if packages were added or renamed
- [ ] `pnpm check:docs` passes
- [ ] No secrets, install scripts, or unexplained dependencies added
- [ ] DSH packages remain `peerDependencies`

## Notes for reviewers

<!-- Tradeoffs, follow-ups, or parts that need a second opinion. -->
