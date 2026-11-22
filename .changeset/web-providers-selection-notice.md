---
'@codeasier/dsh-plugin-web-providers': minor
---

Show a notice when the profile's `web` row does not select this plugin, and offer
a one-click fix.

The settings page edits this plugin's own row, while `web_search` and `web_fetch`
read `web.searchProvider`. When the two disagree — typically right after installing
or after a provider id change — every entry above saved cleanly and still never ran,
and the failure only appeared at call time as `configured web provider "custom" is
not registered`, which names nothing the user can act on. The page now reads the
`web` row, states the mismatch with the current value, and writes both fields on an
explicit click. Hosts that do not expose the `web` row show a short explanation
instead of a button, so read-only deployments are not offered a write that fails.
