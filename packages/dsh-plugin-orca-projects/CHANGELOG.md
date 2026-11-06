# @codeasier/dsh-plugin-orca-projects

## 0.1.0

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
