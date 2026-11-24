---
'@codeasier/dsh-plugin-orca-projects': minor
---

Replace the three fixed Orca-like title sizes with any integer from 10 to 18px, chosen with a paired slider and numeric input that both update the sidebar immediately. Title line height and row density scale smoothly across the new range, stored `sm`/`md`/`lg` preferences migrate to 10/11/12px, and invalid numeric input falls back to the current size.
