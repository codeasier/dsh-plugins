# @codeasier/dsh-plugin-orca-projects

## 0.1.0

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
