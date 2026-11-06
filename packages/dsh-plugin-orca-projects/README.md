# @codeasier/dsh-plugin-orca-projects

An Orca-like project sidebar for the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(`dsh`) Web and Desktop client. It adds a fourth **Orca-like** grouping mode to
the sidebar view options: projects are the top-level rows, a pinned session
shelf sits above them, and projects can be moved into custom groups.

This is a community plugin for
[codeasier/dsh-plugins](https://github.com/codeasier/dsh-plugins). It ships a
bundle patch, localized display metadata, an original icon, and an
[`engines.dsh`](https://github.com/codeasier/dsh-plugins/blob/main/docs/manifest-reference.md#compatibility)
compatibility range, so it installs, updates, and is versioned independently of
every other plugin in this repository.

## What it does

Open the sidebar view options (the sliders button next to **项目**), choose
**Orca-like**, then click a project row to reveal its sessions.

- **Project-first grouping.** The sidebar lists projects (registered
  workspaces), not directory levels. Each project row expands to its sessions.
- **Pinned shelf.** Pin a session from its hover pin button or its `...` menu.
  It moves into the **已置顶** group at the very top. Under its project the same
  session stays in place, grayed, with a **置顶** badge. Opening a pinned session
  does not expand its project; use the pinned row's `...` menu → **在项目中显示**
  to expand the project and scroll to the original row. Unpin it and it is an
  ordinary project session again.
- **Worktree labels.** Every session carries `main` for the workspace root or
  the named worktree derived from its working directory, such as
  `.worktrees/feature-a` or Orca's `workspaces/<project>/2.0-review`.
  Cross-project, pinned, and flat rows always show the label; project rows show
  a named worktree when it is not already the project title, and omit the
  implicit `main`.
- **Custom groups.** Use a project's `...` menu → **移动到分组** to create a group
  or move the project into one. You can also drag a project onto a group. Group
  headers can be renamed, deleted, and used to add projects; deleting a group
  returns its projects to **未分组**.
- **The other grouping modes remain available** in the same menu: **按工作区**,
  **按工作区树**, **单列表**, plus **Orca-like**. Sort by recent updates or manual
  order; filter archived sessions; search project and session titles.
- **Session actions** include pin/unpin, archive/unarchive, open, and copy the
  Session ID. Workspace actions include a new session, open workspace, rename,
  delete, and move to a group.
- **Persistence.** Custom groups, assignments, manual project/session order,
  collapse state, and view options are saved in the browser's `localStorage`
  under `dsh.orca-projects.v1` for the current DSH origin. Pins and archived
  state are Host-owned and shared with every sidebar surface.

### How it fits

DSH exposes the sidebar's browsing region as a replaceable slot but has no
public "add a grouping mode" hook. The plugin therefore registers an alternative
occupant of `sidebar.workspaces` at priority `-1`, shadowing the shipped browser,
and re-creates the view-options menu with the extra mode. If this plugin crashes,
the slot renderer falls back to the shipped browser. The shipped browser's
per-row extension slots are not rendered by this sidebar in this version.

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
| `localStorage` | `dsh.orca-projects.v1` | Grouping mode, sort/filter, custom groups, project assignments and order, session order, collapse state |

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

The plugin is a Web client artifact. DeepSeek Harness Desktop serves the same
Web client, so a Desktop window gets the same sidebar. Verified in the Web
client at DSH 0.2.2-rc.1; see [Verification](#verification).

## Verification

- `pnpm check` passes (lint, typecheck, tests, build, conventions, docs, packs).
- The client bundle registers the loader id, locale namespace, and
  `sidebar.workspaces` occupant; behavior tests cover the grouping model,
  pin-shelf duplication, custom-group move/delete, archived filters, blank
  sessions, search, manual order, and persisted-state sanitization.
- Manual checks in a scratch Web profile at DSH 0.2.2-rc.1: Orca-like mode in the
  view-options menu; project expansion; pin → shelf and gray project row; unpin
  → restored row; create/rename/delete group; move project by menu and by drag;
  reload persistence; search; archive/unarchive; flat, workspace, and tree modes;
  light and dark themes; sidebar collapse/expand. Also checked: a pinned row
  opens without expanding its project, **在项目中显示** expands and scrolls to
  the original row, worktree badges resolve to `main`, `v0.16.1-patch`, and
  `2.0-review`, and the type scale matches the shipped sidebar's 14px project
  and session titles.
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
- Worktree labels are path-derived; the plugin does not inspect git metadata. A
  workspace path without a recognized worktree marker (`.worktrees/`,
  `.worktree/`, `worktrees/`, or Orca's `workspaces/<project>/<worktree>`) is
  labeled `main`.
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
