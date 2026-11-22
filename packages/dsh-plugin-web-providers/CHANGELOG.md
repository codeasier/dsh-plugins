# @codeasier/dsh-plugin-web-providers

## 0.2.1

### Patch Changes

- a9601d8: Keep the routing panel out of the way once both routes already point here, and
  point a route automatically when a provider is chosen below.

  Selecting a provider in the list is the intent to use it, so the panel repeating
  both routes on every visit was noise; it now appears only while a route still
  disagrees. Choosing a provider also writes that capability's route, so the
  selection takes effect without a second confirmation of the same intent.

## 0.2.0

### Minor Changes

- 789d6a3: Show the configured search and fetch routes in Settings and let users switch
  either one to Web Providers without replacing the other. Switching applies
  immediately and requires a saved provider selection for that tool; it does not
  save a draft or imply that the provider can authenticate or return results.

Changes to this package are documented here by Changesets. See the repository
[CHANGELOG conventions](../../CONTRIBUTING.md#changesets).
