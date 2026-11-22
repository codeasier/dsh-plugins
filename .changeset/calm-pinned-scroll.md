---
"@codeasier/dsh-plugin-orca-projects": patch
---

Remove the pinned shelf's nested scrollbar so it expands naturally within the outer sidebar scroller, and add View options font (system, monospace, JetBrains Mono) and text-size (10px, 11px, 12px) preferences. The default is monospace at 10px, with chips, section headers, and row heights scaling alongside.

Session titles are renameable from the session menu: the Host writes the durable title first, and a local title plus a **Restore the Host title** action cover the case where the Host refuses because the session already has an active write handle.
