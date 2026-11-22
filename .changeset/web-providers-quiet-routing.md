---
'@codeasier/dsh-plugin-web-providers': patch
---

Keep the routing panel out of the way once both routes already point here, and
point a route automatically when a provider is chosen below.

Selecting a provider in the list is the intent to use it, so the panel repeating
both routes on every visit was noise; it now appears only while a route still
disagrees. Choosing a provider also writes that capability's route, so the
selection takes effect without a second confirmation of the same intent.
