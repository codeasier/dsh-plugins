# @codeasier/dsh-plugin-orca-projects

An Orca-like project sidebar for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(`dsh`) Web and Desktop client. It adds a fourth **Orca-like** grouping mode to
the sidebar view options: projects are the top-level rows, a pinned session
shelf sits above them, projects can be moved into custom groups, and a Git
repository's main checkout plus its linked worktrees collapse into one project.

This is a community plugin for
[codeasier/dsh-plugins](https://github.com/codeasier/dsh-plugins). It ships a
bundle patch, localized display metadata, an original icon, and an
[`engines.dsh`](https://github.com/codeasier/dsh-plugins/blob/main/docs/manifest-reference.md#compatibility)
compatibility range, so it installs, updates, and is versioned independently of
every other plugin in this repository.

## What it does

Open the sidebar view options (the sliders button next to **项目**), choose
**Orca-like**, then click a project row to reveal its sessions.

- **Project-first grouping.** The sidebar lists projects (Git repositories),
  not directory levels. The main checkout and every linked worktree, including
  Orca's `~/orca/workspaces/<project>/<name>` layout and nested
  `.worktrees/<name>` directories, appear under one project row. A layers badge
  shows how many worktrees feed that project, and the project menu can start a
  session in any one of them. The Host also discovers worktrees from
  `.git/worktrees` even when DSH has no workspace for them; starting a session
  in one registers its directory. A project's `...` menu also renames the
  project label locally and deletes every workspace registration that belongs
  to it.
- **Pinned shelf.** Pin a session from its hover pin button or its `...` menu.
  It moves into the **已置顶** group at the very top. Under its project the same
  session stays in place, grayed, with a **置顶** badge. Opening a pinned session
  does not expand its project; use the pinned row's `...` menu → **在项目中显示**
  to expand the project and scroll to the original row. Unpin it and it is an
  ordinary project session again.
- **Compact session cards.** Every session is a two-line card: a title line,
  then worktree and project chips. Project, pinned, flat, and search rows share
  the same card geometry, with the project chip only where the project is not
  already the surrounding header.
- **Worktree labels.** Session chips use the Host-resolved checkout identity,
  including worktrees in arbitrary directories. Ordinary subdirectories inherit
  their checkout's label. Without a resolved identity, the client recognizes
  paths such as `.worktrees/feature-a` or Orca's `workspaces/<project>/2.0-review`.
  Cross-project, pinned, and flat cards always show the label; project cards
  show a named worktree when it is not already the project title, and omit the
  implicit `main`. Unlike a path-only heuristic, the Host half reads the
  workspace root's `.git` file and its `commondir` pointer, so a worktree in an
  arbitrary directory still joins the repository it belongs to.
- **Live status and active filter.** Running sessions show an animated yellow
  spinner, waiting-for-user interactions an amber dot, finished-but-unviewed
  completions a green dot, and inactive sessions a gray dot. In Orca-like mode,
  View options → **仅活跃会话** hides every non-active session and project; the
  resulting empty state offers **查看全部会话** to switch the filter off. Waiting
  takes precedence over running. Filtering never changes a visible project's
  worktree membership, main workspace, or action targets.
- **Custom groups.** Use a project's `...` menu → **移动到分组** to create a group
  or move the project into one. You can also drag a project onto a group. Group
  headers can be renamed, deleted, and used to add projects; deleting a group
  returns its projects to **未分组**.
- **The other grouping modes remain available** in the same menu: **按工作区**,
  **按工作区树**, **单列表**, plus **Orca-like**. Sort by recent updates or manual
  order; filter archived sessions; search project and session titles. Orca-like
  sorting and dragging work before any custom group is created. Sessions outside
  registered workspaces remain accessible in grouped and workspace-tree views.
  In the **Unassigned sessions** section they are grouped by workspace (or by
  `cwd` when no workspace matches). Rows inside a group show only their checkout
  label because the group already names the workspace. In Orca-like mode,
  pinning one moves it to the **Pinned** shelf, where the project chip stays
  visible; unpinning returns it to its workspace group.
- **External session migration.** In Orca-like mode, **Migrate unassigned
  sessions…** matches those sessions to projects by `cwd` (longest project or
  worktree path) and previews the matched and unmatched counts. It writes only a
  browser-local `sessionId → projectId` mapping; DSH workspaces, `sessionIds`,
  and session ownership stay unchanged. **Undo session migration** clears the
  mapping.
- **Session actions** include pin/unpin, archive/unarchive, open, and copy the
  Session ID. Project actions include a new session (per worktree), open the
  main workspace, rename the project label, delete the project, and move it to
  a group.
- **Persistence.** Custom groups, assignments, manual project/session order,
  external session-to-project mappings, collapse state, and view options are
  saved in the browser's `localStorage`
  under `dsh.orca-projects.v1` for the current DSH origin. Pins and archived
  state are Host-owned and shared with every sidebar surface.

### How it fits

DSH exposes the sidebar's browsing region as a replaceable slot but has no
public "add a grouping mode" hook. The plugin therefore registers an alternative
occupant of `sidebar.workspaces` at priority `-1`, shadowing the shipped browser,
and re-creates the view-options menu with the extra mode. If this plugin crashes,
the slot renderer falls back to the shipped browser. The shipped browser's
per-row extension slots are not rendered by this sidebar in this version.
The plugin observes the shipped browser's injected shortcut source, so DSH's
`session.search` command opens and focuses this search field without replacing
its default or user-configured key bindings.

The browser cannot read `.git` directly. A small Host half registers one
authenticated fetch route, `/api/orca-projects/resolve`, through the existing
Connection service. It resolves each registered workspace path by reading
`.git` and `commondir` with Node's filesystem APIs, then returns the canonical
main-checkout path, title, and worktree name. The browser groups workspaces by
that key. The browser uses a document-relative URL so subpath deployments keep
DSH's mount prefix. The Host distinguishes confirmed non-repositories from
missing paths and resolution errors: existing non-Git directories stay separate,
while missing paths, errors, and an unavailable route retain the path-based
fallback for nested `.worktrees` directories and Orca workspace folders.

The migration tool is another overlay: it keeps `sessionId → projectId` in
`localStorage`, so an unassigned session can appear under a project without
being attached to that project's DSH workspace. Other clients and DSH's
workspace registry keep their original state.

## Install

### DeepSeek Harness CLI

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-orca-projects
```

Restart the app when the profile does not run with HMR.

### DeepSeek Harness Desktop

Open **Plugins** in the Desktop window and install
`@codeasier/dsh-plugin-orca-projects`, or use the command runtime bundled with
the app. The npm `dsh` CLI cannot manage the Electron-owned `desktop` profile.
See [Install on Desktop](https://github.com/codeasier/dsh-plugins/blob/main/docs/install/desktop.md).

### From this checkout

```sh
pnpm install && pnpm build
pnpm install:local dsh-plugin-orca-projects --profile web
```

## Configuration

The plugin has no Host `Config` schema and no tool. Its user state is
client-local:

| Storage | Key | Contents |
|---|---|---|
| `localStorage` | `dsh.orca-projects.v1` | Grouping mode, sort/filter, custom groups, project assignments, project names, external session mappings, project and session order, collapse state |

Pins and archived sessions are not stored here; they live in the workspace
controller and apply to every sidebar surface.

Disable the bundle row in the profile's `cordis.patch.yml` to return to the
shipped sidebar:

```yaml
- id: orca-projects
  name: '@codeasier/dsh-plugin-orca-projects'
  disabled: true
```

## Compatibility

| Plugin | DeepSeek Harness | Node.js |
|---|---|---|
| `0.1.x` | `>=0.2.2-rc.1 <0.3.0` | `>=22.18.0` |

The plugin has a Web client half plus a small Host half that resolves repository
identity. DeepSeek Harness Desktop serves the same Web client and Host services,
so a Desktop window gets the same sidebar. Verified in the Web client at DSH
0.2.2-rc.1; see [Verification](#verification).

## Verification

- `pnpm check` passes (lint, typecheck, tests, build, conventions, docs, packs).
- The client bundle registers the loader id, locale namespace, and
  `sidebar.workspaces` occupant; behavior tests cover the grouping model,
  pin-shelf duplication, custom-group move/delete, archived filters, blank
  sessions, search, manual order, persisted-state sanitization, worktree
  consolidation, group assignment through a member path, the path-based
  fallback, and project names. `src/repo.ts` is tested against temporary main
  checkouts and linked worktrees, including an Orca-style path.
- Review-follow-up regressions cover simultaneous running/waiting status, loose
  sessions in grouped/tree views, sorting/dragging without groups, stable active
  project membership, resolved checkout labels in all modes, explicit negative
  repository probes, subpath URLs, the shipped search-command bridge with the
  real slot-entry shape, and stale worktree records with missing or foreign
  checkout backlinks. These use server-rendered markup and fake service/shortcut
  sources; the final build was also reinstalled in a scratch Web profile to
  check the results in a real page.
- Earlier manual checks in a scratch Web profile at DSH 0.2.2-rc.1: Orca-like mode in the
  view-options menu; project expansion; pin → shelf and gray project row; unpin
  → restored row; create/rename/delete group; move project by menu and by drag;
  reload persistence; search; archive/unarchive; flat, workspace, and tree modes;
  light and dark themes; sidebar collapse/expand. Also checked: a pinned row
  opens without expanding its project, **在项目中显示** expands and scrolls to
  the original row, worktree badges resolve to `main`, `v0.16.1-patch`, and
  `2.0-review`, and the type scale matches the shipped sidebar's 14px project
  and session titles.
- Worktree consolidation was rendered with the real registered workspaces in a
  scratch profile: the `msinsight` main checkout and its four Orca worktrees
  formed one project with a `5` worktree badge, and `dsh-TUI` plus its four
  `.worktrees` entries formed another with a `5` badge. The `dsh-plugins`
  project had only its main workspace registered; the Host found its three
  additional `.git/worktrees` checkouts and the row showed a `4` badge with all
  four choices in the project menu, without creating workspaces just to list
  them. Sessions outside every registered workspace appeared in a separate,
  collapsed **Unassigned sessions** section, not as an unassignable project;
  expanding it showed 18 collapsible workspace groups (for example
  `cc-workspace` with 58 sessions) rather than one flat list, and expanding a
  group showed its checkout label with the project chip omitted; pinning one
  moved it to **Pinned** with its project chip, and unpinning returned it to the
  group. The migration dialog
  detected 183 of those 193 sessions across 10 projects, applied the external
  mapping (leaving 10 unmatched), and the Undo action restored all 193. The
  project menu listed
  each worktree, renaming the project label persisted, and moving the project
  into a custom group kept it as one row. The two stale `.worktrees` entries
  whose directories no longer exist still grouped through the fallback.
- The Desktop window was not driven separately in this checkout; it uses the
  same client artifact. Installing into the Electron-owned `desktop` profile is
  a separate user action.

## Limitations

- The plugin shadows the shipped workspace browser. The shipped browser's
  session-row action extension slot (`sidebar.workspaces.session.row.action`)
  and its hover cards are not rendered here.
- Search is local to the loaded session summaries (title, project path, and
  working directory). It does not query message content on the Host.
- Custom groups are browser-local and do not sync across devices or profiles.
- Worktree identity is read from a `.git` entry at the workspace root; the Host
  does not scan parent directories. A workspace without its own `.git` entry
  stays a separate project, and a submodule is not merged into its enclosing
  repository. Discovery of unregistered checkouts reads `.git/worktrees`; a
  checkout is listed only while its directory exists and its `.git` file points
  back to the same worktree record. Stale records are omitted even when their
  old path has been reused by an ordinary directory or another repository. If the
  Host route is unavailable, only the path patterns `.worktrees/`,
  `.worktree/`, `worktrees/`, and Orca's `workspaces/<project>/<worktree>`
  consolidate.
- Worktree consolidation and the external session migration apply to Orca-like
  mode. The workspace and workspace-tree modes intentionally keep DSH's
  directory-based grouping and ignore the migration mapping.
- The migration tool matches by `cwd` and only covers currently visible
  sessions; it is a browser-local overlay, not a change to DSH's
  `workspace.sessionIds`. It cannot attach an arbitrary session to a workspace
  whose path differs from the session's `cwd`.
- Deleting a consolidated project removes every workspace registration that
  belongs to it; files and sessions are kept. There is no per-worktree removal
  action in this version.
- Green marks a finished-but-unviewed completion; an idle session whose
  completion was already viewed returns to gray. **Active** for the filter means
  running or waiting for a user interaction, not merely completed.
- Adding a project requires a working `ctx.uiWorkspace.pickDirectory()`. A
  remote browser without the host directory picker cannot add projects.
- This version does not offer session rename, fork, or delete; use the
  conversation surface or re-enable the shipped sidebar for those actions.

## Develop

```sh
pnpm --filter @codeasier/dsh-plugin-orca-projects build
pnpm --filter @codeasier/dsh-plugin-orca-projects test
pnpm --filter @codeasier/dsh-plugin-orca-projects typecheck
```

Read [Plugin anatomy](https://github.com/codeasier/dsh-plugins/blob/main/docs/plugin-anatomy.md)
and [Client UI](https://github.com/codeasier/dsh-plugins/blob/main/docs/client-ui.md)
before extending the plugin. `client.js` is hand-written loader code; keep the
loader factory self-contained and run `node --check client.js` after editing it.

## License

MIT
