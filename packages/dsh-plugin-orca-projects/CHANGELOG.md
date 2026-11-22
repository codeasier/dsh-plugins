# @codeasier/dsh-plugin-orca-projects

## 0.1.2

### Patch Changes

- 6d56b6e: Remove the pinned shelf's nested scrollbar so it expands naturally within the outer sidebar scroller, and add View options font (system, monospace, JetBrains Mono) and text-size (10px, 11px, 12px) preferences. The default is monospace at 10px, with chips, section headers, and row heights scaling alongside.

  Session titles are renameable from the session menu: the Host writes the durable title first, and a local title plus a **Restore the Host title** action cover the case where the Host refuses because the session already has an active write handle.

## 0.1.1

### Patch Changes

- cd71965: Refine the Orca-like sidebar with unified compact session containers, lightweight folding project/group cards, a bounded pinned shelf, clearer current-session navigation, and accessible disclosure and live-status semantics.

## 0.1.0

- Keep migrated active sessions under their matched project; reveal pinned
  unassigned sessions in their original workspace or directory group.
- Recheck the previewed migration matches before applying them, and preserve
  hidden manual-order positions when dragging filtered projects or sessions.
- Read the shipped sidebar entry's top-level locale when bridging session search,
  with regression fixtures matching the DSH slot-entry contract.
- Validate discovered worktrees' `.git` backlinks before listing them, excluding
  stale records whose checkout path has been reused by an ordinary directory or
  another repository.
- Prioritize waiting-for-user status over running, retain loose sessions in
  grouped/tree views, and enable sorting and dragging without custom groups.
- Keep complete repository membership and main-workspace action targets when
  filtering active sessions; use resolved checkout identities for session chips.
- Distinguish non-Git directories from missing/error resolution results before
  path fallback, and preserve the mount prefix in repository-resolution URLs.
- Bridge the shipped session-search command to open and focus the replacement
  sidebar's search field.
- Add the Orca-like project sidebar: project-first rows, custom groups with
  drag-and-drop, a pinned session shelf, local search, archived filters, manual
  ordering, and a compact reimplementation of the workspace, tree, and flat
  grouping modes.
- Add worktree labels for sessions (`main` or the named worktree), a
  two-line cross-project row, and a **Show in project** action in the pinned
  row's menu. Opening a pinned session leaves its project collapsed.
- Match the shipped sidebar's 14px project and session titles, add a clearer
  group/project/session hierarchy, and keep light and dark theme support.
- Render sessions as compact two-line cards with project and worktree chips, and
  add live status indicators (yellow running spinner, amber waiting, green
  finished-unviewed, gray idle).
- Add an Orca-like **Active sessions only** filter that hides non-active
  sessions and projects and restores them from its empty state.
- Consolidate a Git repository's main checkout and linked worktrees into one
  project. A small Host half reads `.git` and `commondir` behind an authenticated
  fetch route, so worktrees in arbitrary directories (including Orca's
  `~/orca/workspaces/<project>/<name>`) join their repository. Project rows show
  a worktree count, the project menu starts a session in a chosen worktree, and
  project labels, groups, and ordering operate on the consolidated row.
- Localize the Plugin Manager detail description: `locale/zh.json` declares
  `meta.detail` for `README.zh.md`, so Chinese shows the Chinese plugin
  description while English keeps `README.md`.
- Discover every checkout recorded under `.git/worktrees`, even when DSH has no
  workspace for it. Unregistered worktrees join the project's worktree count and
  menu, and starting a session there registers the directory on demand.
- Present sessions outside every registered workspace in an **Unassigned
  sessions** section instead of a synthetic **Ungrouped** project, so the bucket
  is not mistaken for a project that can be moved into a group.
- Group sessions in the **Unassigned sessions** section by workspace/directory
  with collapsible headers instead of rendering one flat list, and omit the
  redundant project chip on those rows. Pinned rows stay in the group, grayed
  with an **已置顶** badge and their project chip, and also appear in the pinned
  shelf, matching pinned sessions under registered projects.
- Add an external `sessionId → projectId` overlay and a **Migrate unassigned
  sessions…** tool. It matches sessions outside every workspace to projects by
  `cwd`, previews matched/unmatched counts, persists the mapping in
  `localStorage`, and can be undone. DSH workspaces and `sessionIds` are not
  modified.
