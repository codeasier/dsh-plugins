window.__ModuleLoader__.load({
  id: '@codeasier/dsh-plugin-orca-projects',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'orcaSidebar'
    const STORAGE_KEY = 'dsh.orca-projects.v1'
    const UNGROUPED = '__ungrouped__'
    const MODES = ['orca', 'workspace', 'workspace-tree', 'flat']
    const FILTERS = ['hide', 'all', 'only']
    const EMPTY_STATUS = new Map()
    const SessionStatusContext = React.createContext(null)
    const WorkspacePathContext = React.createContext(null)

    const en = {
      'title.projects': 'Projects',
      'title.workspaces': 'Workspaces',
      'title.sessions': 'Sessions',
      'action.search': 'Search',
      'action.viewOptions': 'View options',
      'action.add': 'Add',
      'action.addProject': 'Add project…',
      'action.addWorkspace': 'Add workspace…',
      'action.newGroup': 'New group…',
      'action.clear': 'Clear',
      'action.refresh': 'Refresh',
      'placeholder.search': 'Search projects or sessions',
      'section.groupBy': 'Group by',
      'group.workspace': 'Workspace',
      'group.workspaceTree': 'Workspace tree',
      'group.flat': 'Single list',
      'group.orca': 'Orca-like',
      'order.label': 'Sort by',
      'order.manual': 'Manual',
      'order.updated': 'Last updated',
      'filter.label': 'Filter sessions',
      'filter.hide': 'Hide archived',
      'filter.all': 'All conversations (show archived)',
      'filter.only': 'Archived only',
      'filter.activeOnly': 'Active sessions only',
      'active.empty': 'No active sessions',
      'active.hint': 'Turn off Active sessions only to see every session.',
      'active.showAll': 'Show all sessions',
      'pinned.title': 'Pinned',
      'pinned.empty': 'Pinned sessions collect here, above every project.',
      'pinned.hint': 'Pinned',
      'pinned.short': 'Pinned',
      'pinned.pin': 'Pin session',
      'pinned.unpin': 'Unpin session',
      'group.ungrouped': 'Ungrouped',
      'group.empty': 'Drop a project here, or use a project menu.',
      'group.drop': 'Move to group',
      'group.rename': 'Rename group',
      'group.delete': 'Delete group',
      'group.deleteConfirm': 'Delete “{name}”? Its projects return to Ungrouped.',
      'group.name': 'Group name',
      'group.namePlaceholder': 'e.g. Client work',
      'group.created': 'Group “{name}” created',
      'group.deleted': 'Group deleted',
      'group.moved': 'Moved “{name}” to {group}',
      'project.newSession': 'New session',
      'project.newSessionIn': 'New session in {name}',
      'project.open': 'Open workspace',
      'project.move': 'Move to group',
      'project.rename': 'Rename project',
      'project.delete': 'Delete project',
      'project.deleteConfirm':
        'Remove “{name}” from the workspace list? Files and sessions are kept.',
      'project.deleteConfirmMany':
        'Remove “{name}” and its {n} worktree workspaces from DSH? Files and sessions are kept.',
      'project.renamePlaceholder': 'Project name',
      'project.ungrouped': 'Ungrouped',
      'project.sessions': '{n} sessions',
      'loose.title': 'Unassigned sessions',
      'loose.hint': 'Sessions outside every registered workspace.',
      'project.worktrees': '{n} worktrees',
      'project.worktreesTitle': 'Worktrees: {list}',
      'project.worktreesSection': 'Worktrees',
      'project.worktreeMain': 'main',
      'project.added': 'Workspace “{name}” added',
      'project.autoExpand': 'Show sessions',
      'session.open': 'Open',
      'session.reveal': 'Show in project',
      'session.pin': 'Pin session',
      'session.unpin': 'Unpin session',
      'session.archive': 'Archive session',
      'session.unarchive': 'Restore session',
      'session.copyId': 'Copy session ID',
      'session.copied': 'Session ID copied',
      'session.copyFailed': 'Copy failed',
      'session.archivedHint': 'Archived',
      'session.archivedNotOpenable': 'Restore this session before opening it.',
      'session.new': 'New session',
      'session.untitled': 'Untitled',
      'session.stopArchive': 'Stop and archive',
      'session.stopArchiveTitle': 'Stop this session and archive it?',
      'session.stopArchiveDesc':
        '“{name}” still has work running. Archiving stops that work first.',
      'session.pinned': 'Pinned “{name}”',
      'session.unpinned': 'Unpinned “{name}”',
      'session.archived': 'Archived “{name}”',
      'session.unarchived': 'Restored “{name}”',
      'session.actionFailed': 'Could not update the session.',
      'dialog.cancel': 'Cancel',
      'dialog.create': 'Create',
      'dialog.save': 'Save',
      'dialog.delete': 'Delete',
      'dialog.close': 'Close',
      'toast.noPicker': 'No directory picker is available.',
      'toast.workspaceFailed': 'Could not add the workspace.',
      'toast.projectFailed': 'Could not update the workspace.',
      'toast.pinFailed': 'Could not update the pin.',
      'toast.archiveFailed': 'Could not archive the session.',
      'empty.projects': 'No projects yet',
      'empty.projectsHint': 'Add a folder to start a project.',
      'empty.sessions': 'No sessions',
      'sessions.expand': 'Show {n} more sessions',
      'sessions.collapsed': 'Show fewer',
      'empty.noMatches': 'No matching sessions',
      'empty.archivedOnly': 'No archived sessions',
      'empty.viewOthers': 'View other sessions',
      loading: 'Loading workspaces…',
      'new': 'New',
    }

    const zh = {
      'title.projects': '项目',
      'title.workspaces': '工作区',
      'title.sessions': '会话',
      'action.search': '搜索',
      'action.viewOptions': '视图选项',
      'action.add': '添加',
      'action.addProject': '添加项目…',
      'action.addWorkspace': '添加工作区…',
      'action.newGroup': '新建分组…',
      'action.clear': '清除',
      'action.refresh': '刷新',
      'placeholder.search': '搜索项目或会话',
      'section.groupBy': '分组方式',
      'group.workspace': '按工作区',
      'group.workspaceTree': '按工作区树',
      'group.flat': '单列表',
      'group.orca': 'Orca-like',
      'order.label': '排序方式',
      'order.manual': '手动排序',
      'order.updated': '最近更新',
      'filter.label': '筛选会话',
      'filter.hide': '隐藏已归档',
      'filter.all': '全部对话（显示已归档）',
      'filter.only': '仅显示已归档',
      'filter.activeOnly': '仅活跃会话',
      'active.empty': '暂无活跃会话',
      'active.hint': '关闭“仅活跃会话”可查看全部会话。',
      'active.showAll': '查看全部会话',
      'pinned.title': '已置顶',
      'pinned.empty': '置顶的会话会集中显示在这里。',
      'pinned.hint': '已置顶',
      'pinned.short': '置顶',
      'pinned.pin': '置顶会话',
      'pinned.unpin': '取消置顶',
      'group.ungrouped': '未分组',
      'group.empty': '将项目拖到这里，或使用项目菜单。',
      'group.drop': '移动到分组',
      'group.rename': '重命名分组',
      'group.delete': '删除分组',
      'group.deleteConfirm': '删除“{name}”？其中的项目会回到未分组。',
      'group.name': '分组名称',
      'group.namePlaceholder': '例如：客户项目',
      'group.created': '已创建分组“{name}”',
      'group.deleted': '分组已删除',
      'group.moved': '已将“{name}”移动到{group}',
      'project.newSession': '新建会话',
      'project.newSessionIn': '在 {name} 中新建会话',
      'project.open': '打开工作区',
      'project.move': '移动到分组',
      'project.rename': '重命名项目',
      'project.delete': '删除项目',
      'project.deleteConfirm': '将“{name}”从工作区列表移除？文件夹与会话会保留。',
      'project.deleteConfirmMany':
        '将“{name}”及其 {n} 个 worktree 工作区从 DSH 移除？文件夹与会话会保留。',
      'project.renamePlaceholder': '项目名称',
      'project.ungrouped': '未分组',
      'project.sessions': '{n} 个会话',
      'loose.title': '未归属会话',
      'loose.hint': '这些会话不属于任何已注册工作区。',
      'project.worktrees': '{n} 个工作树',
      'project.worktreesTitle': '工作树：{list}',
      'project.worktreesSection': '工作树',
      'project.worktreeMain': 'main',
      'project.added': '已添加工作区“{name}”',
      'project.autoExpand': '展开会话',
      'session.open': '打开',
      'session.reveal': '在项目中显示',
      'session.pin': '置顶会话',
      'session.unpin': '取消置顶',
      'session.archive': '归档会话',
      'session.unarchive': '取消归档',
      'session.copyId': '复制 Session ID',
      'session.copied': 'Session ID 已复制',
      'session.copyFailed': '复制失败',
      'session.archivedHint': '已归档',
      'session.archivedNotOpenable': '请先取消归档再打开。',
      'session.new': '新会话',
      'session.untitled': '未命名',
      'session.stopArchive': '停止并归档',
      'session.stopArchiveTitle': '停止并归档此会话？',
      'session.stopArchiveDesc': '“{name}”仍有正在进行的工作。归档会先停止这些工作。',
      'session.pinned': '已置顶“{name}”',
      'session.unpinned': '已取消置顶“{name}”',
      'session.archived': '已归档“{name}”',
      'session.unarchived': '已取消归档“{name}”',
      'session.actionFailed': '无法更新该会话。',
      'dialog.cancel': '取消',
      'dialog.create': '创建',
      'dialog.save': '保存',
      'dialog.delete': '删除',
      'dialog.close': '关闭',
      'toast.noPicker': '目录选择器不可用。',
      'toast.workspaceFailed': '无法添加工作区。',
      'toast.projectFailed': '无法更新工作区。',
      'toast.pinFailed': '无法更新置顶状态。',
      'toast.archiveFailed': '无法归档该会话。',
      'empty.projects': '暂无项目',
      'empty.projectsHint': '添加一个文件夹来开始项目。',
      'empty.sessions': '暂无会话',
      'sessions.expand': '显示其余 {n} 个会话',
      'sessions.collapsed': '收起',
      'empty.noMatches': '无匹配会话',
      'empty.archivedOnly': '暂无已归档会话',
      'empty.viewOthers': '查看其他会话',
      loading: '正在加载工作区…',
      'new': '新',
    }

    function cx(...parts) {
      let value = ''
      for (const part of parts) {
        if (part) value += (value ? ' ' : '') + part
      }
      return value
    }

    const ICONS = {
      search: [
        ['circle', { cx: 7, cy: 7, r: 4.4 }],
        ['path', { d: 'M10.3 10.3 14 14' }],
      ],
      sliders: [
        ['path', { d: 'M2.5 4.5h3.2M9.3 4.5h4.2M2.5 8h6.1M12.4 8h1.1M2.5 11.5h1.7M7.9 11.5h5.6' }],
        ['circle', { cx: 7.3, cy: 4.5, r: 1.4 }],
        ['circle', { cx: 10.3, cy: 8, r: 1.4 }],
        ['circle', { cx: 6.2, cy: 11.5, r: 1.4 }],
      ],
      plus: [['path', { d: 'M8 3v10M3 8h10' }]],
      minus: [['path', { d: 'M3 8h10' }]],
      chevron: [['path', { d: 'm6 3.5 4.5 4.5L6 12.5' }]],
      folder: [
        [
          'path',
          {
            d: 'M2.2 4.6a1.1 1.1 0 0 1 1.1-1.1h3.1l1.3 1.5h5a1.1 1.1 0 0 1 1.1 1.1v5.8a1.1 1.1 0 0 1-1.1 1.1H3.3a1.1 1.1 0 0 1-1.1-1.1Z',
          },
        ],
      ],
      folderOpen: [
        ['path', { d: 'M2.2 4.6a1.1 1.1 0 0 1 1.1-1.1h3.1l1.3 1.5h4.5' }],
        ['path', { d: 'M2.2 6.2h11.3l-1.2 6.3H3.4Z' }],
      ],
      pin: [
        ['path', { d: 'M9.9 2.2 13.8 6.1 12.2 7.7l-.1 2.2-2.5 2.5-4.9-4.9 2.5-2.5 2.2-.1Z' }],
        ['path', { d: 'M6.3 9.7 2.4 13.6' }],
      ],
      pinFilled: [
        [
          'path',
          {
            d: 'M9.9 2.2 13.8 6.1 12.2 7.7l-.1 2.2-2.5 2.5-4.9-4.9 2.5-2.5 2.2-.1Z',
            fill: 'currentColor',
            stroke: 'none',
          },
        ],
        ['path', { d: 'M6.3 9.7 2.4 13.6' }],
      ],
      more: [
        ['circle', { cx: 3.2, cy: 8, r: 1.05, fill: 'currentColor', stroke: 'none' }],
        ['circle', { cx: 8, cy: 8, r: 1.05, fill: 'currentColor', stroke: 'none' }],
        ['circle', { cx: 12.8, cy: 8, r: 1.05, fill: 'currentColor', stroke: 'none' }],
      ],
      close: [['path', { d: 'm4 4 8 8M12 4l-8 8' }]],
      check: [['path', { d: 'm3 8.2 3.2 3.2L13 4.6' }]],
      trash: [
        [
          'path',
          {
            d: 'M3.2 4.5h9.6M6.2 4.5V3.2h3.6v1.3M4.4 4.5l.6 8.2a1 1 0 0 0 1 .9h4a1 1 0 0 0 1-.9l.6-8.2',
          },
        ],
        ['path', { d: 'M6.6 7v4M9.4 7v4' }],
      ],
      edit: [
        ['path', { d: 'm10.6 2.9 2.5 2.5-7.4 7.4-3.2.7.7-3.2Z' }],
        ['path', { d: 'm9.4 4.1 2.5 2.5' }],
      ],
      layers: [
        ['path', { d: 'm8 2.2 6 3.3-6 3.3-6-3.3Z' }],
        ['path', { d: 'm2.6 8.2 5.4 3 5.4-3M2.6 11.2l5.4 3 5.4-3' }],
      ],
      groupAdd: [
        ['path', { d: 'M2.2 4.6a1.1 1.1 0 0 1 1.1-1.1h3.1l1.3 1.5h5a1.1 1.1 0 0 1 1.1 1.1v3' }],
        ['path', { d: 'M2.2 5.8v6.1h7.2M11 10.4v4.1M8.95 12.45h4.1' }],
      ],
      archive: [
        ['path', { d: 'M2.4 5.6h11.2v7.9H2.4Z' }],
        ['path', { d: 'M1.9 3.2h12.2v2.4H1.9ZM6.2 8.5h3.6' }],
      ],
      restore: [
        ['path', { d: 'M3.4 6.2A5 5 0 1 1 3 9.6' }],
        ['path', { d: 'M3.4 2.8v3.4h3.4' }],
      ],
      copy: [
        ['rect', { x: 5.3, y: 5.3, width: 8.2, height: 8.2, rx: 1.2 }],
        [
          'path',
          {
            d: 'M10.7 5.3V3.7a1.2 1.2 0 0 0-1.2-1.2H3.7a1.2 1.2 0 0 0-1.2 1.2v5.8a1.2 1.2 0 0 0 1.2 1.2h1.6',
          },
        ],
      ],
      open: [
        ['path', { d: 'M9.2 2.8h4v4M13.2 2.8 7.6 8.4' }],
        ['path', { d: 'M12.4 9.4v3.4H3.2V3.6h3.4' }],
      ],
      chat: [
        [
          'path',
          {
            d: 'M2.4 3.5a1 1 0 0 1 1-1h9.2a1 1 0 0 1 1 1v6.2a1 1 0 0 1-1 1H7.1l-3.3 2.7v-2.7H3.4a1 1 0 0 1-1-1Z',
          },
        ],
      ],
      inbox: [
        ['path', { d: 'M2.2 8.6 4.1 3.3h7.8l1.9 5.3v3.4a1 1 0 0 1-1 1H3.2a1 1 0 0 1-1-1Z' }],
        ['path', { d: 'M2.2 8.6h3.3l.8 1.5h3.4l.8-1.5h3.3' }],
      ],
      warning: [
        ['path', { d: 'M8 2.5 14 13H2Z' }],
        ['path', { d: 'M8 6.2v3.1M8 11.2v.1' }],
      ],
      dot: [['circle', { cx: 8, cy: 8, r: 3.1, fill: 'currentColor', stroke: 'none' }]],
    }

    function Icon({ name, size = 14, className }) {
      const parts = ICONS[name] || []
      return h(
        'svg',
        {
          className,
          width: size,
          height: size,
          viewBox: '0 0 16 16',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
          focusable: 'false',
        },
        parts.map(([tag, attributes], index) => h(tag, { key: index, ...attributes })),
      )
    }

    function normalizePath(value) {
      const text = String(value || '')
      const normalized = text.replace(/\\/g, '/').replace(/\/+$/u, '')
      return normalized === '' ? '/' : normalized
    }

    function baseName(value) {
      const path = normalizePath(value)
      const index = path.lastIndexOf('/')
      return index >= 0 ? path.slice(index + 1) || path : path
    }

    function isAncestor(parent, child) {
      const left = normalizePath(parent)
      const right = normalizePath(child)
      if (left === right) return false
      if (left === '/') return right.startsWith('/')
      return right.startsWith(`${left}/`)
    }

    function worktreeFromPath(value) {
      const path = normalizePath(value)
      const marker = path.match(/\/(?:\.worktrees?|worktrees?)\/([^/]+)/i)
      if (marker?.[1]) return { label: marker[1], main: false }
      const orca = path.match(/\/orca\/workspaces\/[^/]+\/([^/]+)(?:\/|$)/i)
      if (orca?.[1]) return { label: orca[1], main: false }
      return { label: 'main', main: true }
    }

    function repositoryWorktree(repo, path) {
      if (!repo || repo.main === true) return 'main'
      if (repo.worktree) return repo.worktree
      const derived = worktreeFromPath(path)
      if (!derived.main) return derived.label
      return baseName(path) || 'main'
    }

    function sessionWorktree(session, project) {
      if (!session || !project?.path) return null
      const root = normalizePath(project.path)
      const cwd = session.cwd ? normalizePath(session.cwd) : null
      const worktrees = Array.isArray(project.worktrees) ? project.worktrees : []
      const checkout =
        worktrees
          .filter(
            (entry) => cwd && (normalizePath(entry.path) === cwd || isAncestor(entry.path, cwd)),
          )
          .sort(
            (left, right) => normalizePath(right.path).length - normalizePath(left.path).length,
          )[0] || worktrees.find((entry) => normalizePath(entry.path) === root)
      if (checkout) return { label: checkout.label, main: checkout.main === true }
      const rootWorktree = worktreeFromPath(root)
      if (!cwd || cwd === root) return rootWorktree
      if (isAncestor(root, cwd)) {
        const relative = cwd.slice(root.length + 1)
        const segments = relative.split('/').filter(Boolean)
        const index = segments.findIndex((segment) =>
          /^(?:\.worktrees?|worktrees?)$/i.test(segment),
        )
        if (index >= 0 && segments[index + 1]) return { label: segments[index + 1], main: false }
        return rootWorktree
      }
      const cwdWorktree = worktreeFromPath(cwd)
      if (!cwdWorktree.main) return cwdWorktree
      return { label: baseName(cwd), main: false }
    }

    function repoFromPathFallback(value) {
      const path = normalizePath(value)
      const nested = path.match(/^(.*?)\/(?:\.worktrees?|worktrees)\/([^/]+)(?:\/|$)/i)
      if (nested?.[1] && nested[2]) {
        const root = normalizePath(nested[1])
        return {
          key: root,
          root,
          title: baseName(root),
          main: false,
          worktree: nested[2],
        }
      }
      const orca = path.match(/^(.*\/orca\/workspaces\/([^/]+))\/[^/]+(?:\/|$)/i)
      if (orca?.[1] && orca[2]) {
        const root = normalizePath(orca[1])
        return {
          key: `orca:${root}`,
          root,
          title: orca[2],
          main: false,
          worktree: baseName(path),
        }
      }
      return null
    }

    function workspaceRepo(workspace, repoMap) {
      const path = normalizePath(workspace?.path)
      const entry = repoMap && typeof repoMap.get === 'function' ? repoMap.get(path) : undefined
      if (
        entry &&
        entry.status !== 'missing' &&
        entry.status !== 'error' &&
        typeof entry.key === 'string' &&
        entry.key
      ) {
        const key = normalizePath(entry.key)
        const root = normalizePath(entry.root || entry.key)
        return {
          key,
          root,
          title: entry.title || baseName(root) || path,
          main: entry.main === true,
          worktree: repositoryWorktree(entry, path),
          worktrees: Array.isArray(entry.worktrees) ? entry.worktrees : [],
        }
      }
      return (
        repoFromPathFallback(path) || {
          key: path,
          root: path,
          title: workspace?.title || baseName(path),
          main: true,
          worktree: worktreeFromPath(path).label,
        }
      )
    }

    function projectWorktrees(group) {
      const found = new Map()
      for (const member of group.members) {
        for (const entry of member.repo.worktrees || []) {
          if (!entry || typeof entry.path !== 'string') continue
          const path = normalizePath(entry.path)
          if (!path || found.has(path)) continue
          found.set(path, {
            workspaceId: null,
            path,
            label: entry.label || worktreeFromPath(path).label || baseName(path),
            main: entry.main === true,
            branch: entry.branch,
            title: baseName(path),
            sessionCount: 0,
            registered: false,
          })
        }
        const discovered = (member.repo.worktrees || []).find(
          (entry) => normalizePath(entry.path) === member.path,
        )
        found.set(member.path, {
          workspaceId: member.workspace.workspaceId,
          path: member.path,
          label: repositoryWorktree(member.repo, member.path),
          main: member.repo.main === true || member.path === normalizePath(member.repo.root),
          branch: discovered?.branch,
          title: member.workspace.title || baseName(member.path),
          sessionCount: member.sessions.length,
          registered: true,
        })
      }
      return [...found.values()].sort((left, right) => {
        if (left.main !== right.main) return left.main ? -1 : 1
        return String(left.label).localeCompare(String(right.label))
      })
    }

    function worktreeForSession(session, project, workspaceBySession) {
      const workspacePath =
        workspaceBySession && typeof workspaceBySession.get === 'function'
          ? workspaceBySession.get(session.id)
          : undefined
      if (workspacePath) {
        const checkout = project?.worktrees?.find(
          (entry) => normalizePath(entry.path) === normalizePath(workspacePath),
        )
        if (checkout) return { label: checkout.label, main: checkout.main === true }
        return sessionWorktree(session, { path: workspacePath, worktrees: project?.worktrees })
      }
      if (project?.path) return sessionWorktree(session, project)
      return session?.cwd ? worktreeFromPath(session.cwd) : null
    }

    async function fetchRepositories(paths, signal) {
      const response = await fetch('api/orca-projects/resolve', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ paths }),
        ...(signal === undefined ? {} : { signal }),
      })
      if (!response.ok) return null
      const value = await response.json()
      const repositories = value?.repositories
      return Array.isArray(repositories) ? repositories : null
    }

    function defaultState() {
      return {
        version: 1,
        mode: 'orca',
        orderBy: 'updated',
        archivedFilter: 'hide',
        activeOnly: false,
        groups: [],
        assignments: {},
        projectNames: {},
        projectOrder: {},
        sessionOrder: {},
        collapsed: {},
      }
    }

    function asStringArray(value) {
      if (!Array.isArray(value)) return []
      return value.filter((entry) => typeof entry === 'string')
    }

    function sanitizeState(raw) {
      const next = defaultState()
      if (!raw || typeof raw !== 'object' || raw.version !== 1) return next
      if (MODES.includes(raw.mode)) next.mode = raw.mode
      if (raw.orderBy === 'manual' || raw.orderBy === 'updated') next.orderBy = raw.orderBy
      if (FILTERS.includes(raw.archivedFilter)) next.archivedFilter = raw.archivedFilter
      if (typeof raw.activeOnly === 'boolean') next.activeOnly = raw.activeOnly

      if (Array.isArray(raw.groups)) {
        const seen = new Set()
        for (const entry of raw.groups) {
          if (!entry || typeof entry !== 'object') continue
          const id = typeof entry.id === 'string' ? entry.id : ''
          const name = typeof entry.name === 'string' ? entry.name.trim() : ''
          if (!id || !name || seen.has(id) || next.groups.length >= 50) continue
          seen.add(id)
          next.groups.push({ id, name })
        }
      }

      if (raw.assignments && typeof raw.assignments === 'object') {
        for (const [key, value] of Object.entries(raw.assignments)) {
          if (typeof key === 'string' && typeof value === 'string' && value)
            next.assignments[key] = value
        }
      }

      if (raw.projectNames && typeof raw.projectNames === 'object') {
        let count = 0
        for (const [key, value] of Object.entries(raw.projectNames)) {
          if (count >= 200) break
          if (typeof key !== 'string' || typeof value !== 'string') continue
          const name = value.trim()
          if (!name || name.length > 80) continue
          next.projectNames[key] = name
          count += 1
        }
      }

      if (raw.projectOrder && typeof raw.projectOrder === 'object') {
        for (const [key, value] of Object.entries(raw.projectOrder)) {
          if (typeof key === 'string') next.projectOrder[key] = asStringArray(value)
        }
      }

      if (raw.sessionOrder && typeof raw.sessionOrder === 'object') {
        for (const [key, value] of Object.entries(raw.sessionOrder)) {
          if (typeof key === 'string') next.sessionOrder[key] = asStringArray(value)
        }
      }

      if (raw.collapsed && typeof raw.collapsed === 'object') {
        for (const [key, value] of Object.entries(raw.collapsed)) {
          if (typeof key === 'string' && typeof value === 'boolean') next.collapsed[key] = value
        }
      }

      return next
    }

    function loadState() {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return defaultState()
        return sanitizeState(JSON.parse(raw))
      } catch {
        return defaultState()
      }
    }

    function saveState(state) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      } catch {
        // The browser may deny storage; the in-memory state still works.
      }
    }

    function nextGroupId() {
      return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
    }

    function withAssignments(state, path, groupId, memberPaths) {
      const assignments = { ...(state.assignments || {}) }
      if (Array.isArray(memberPaths)) {
        for (const member of memberPaths) {
          if (typeof member === 'string' && member !== path) delete assignments[member]
        }
      }
      if (groupId) assignments[path] = groupId
      else delete assignments[path]
      return assignments
    }

    function assignProject(state, path, groupId) {
      return { ...state, assignments: withAssignments(state, path, groupId) }
    }

    function renameProject(state, key, name) {
      const projectNames = { ...(state.projectNames || {}) }
      const trimmed = typeof name === 'string' ? name.trim() : ''
      if (trimmed) projectNames[key] = trimmed
      else delete projectNames[key]
      return { ...state, projectNames }
    }

    function createGroup(state, id, name) {
      const groups = Array.isArray(state.groups) ? state.groups.slice() : []
      groups.push({ id, name })
      return { ...state, groups }
    }

    function deleteGroup(state, id) {
      const groups = (Array.isArray(state.groups) ? state.groups : []).filter(
        (group) => group.id !== id,
      )
      const assignments = { ...(state.assignments || {}) }
      for (const [path, groupId] of Object.entries(assignments)) {
        if (groupId === id) delete assignments[path]
      }
      const projectOrder = { ...(state.projectOrder || {}) }
      delete projectOrder[id]
      const collapsed = { ...(state.collapsed || {}) }
      delete collapsed[`g:${id}`]
      return { ...state, groups, assignments, projectOrder, collapsed }
    }

    function renameGroup(state, id, name) {
      return {
        ...state,
        groups: (state.groups || []).map((group) => (group.id === id ? { ...group, name } : group)),
      }
    }

    function moveProjectInOrder(
      state,
      path,
      groupId,
      orderedKeys,
      anchorKey,
      position,
      memberPaths,
    ) {
      const order = (Array.isArray(orderedKeys) ? orderedKeys : []).filter((key) => key !== path)
      let index = anchorKey ? order.indexOf(anchorKey) : -1
      if (index < 0) index = order.length
      else if (position === 'after') index += 1
      order.splice(index, 0, path)
      const orderKey = groupId || UNGROUPED
      return {
        ...state,
        assignments: withAssignments(state, path, groupId, memberPaths),
        projectOrder: { ...(state.projectOrder || {}), [orderKey]: order },
      }
    }

    function moveSessionInOrder(state, projectKey, sessionId, orderedIds, anchorId, position) {
      const order = (Array.isArray(orderedIds) ? orderedIds : []).filter((id) => id !== sessionId)
      let index = anchorId ? order.indexOf(anchorId) : -1
      if (index < 0) index = order.length
      else if (position === 'after') index += 1
      order.splice(index, 0, sessionId)
      return {
        ...state,
        orderBy: 'manual',
        sessionOrder: { ...(state.sessionOrder || {}), [projectKey]: order },
      }
    }

    function isCollapsed(state, key, defaultExpanded) {
      const stored = state.collapsed ? state.collapsed[key] : undefined
      return stored === undefined ? !defaultExpanded : stored === true
    }

    function toggleCollapsed(state, key, defaultExpanded) {
      const collapsed = { ...(state.collapsed || {}) }
      collapsed[key] = !isCollapsed(state, key, defaultExpanded)
      return { ...state, collapsed }
    }

    function archivedSetOf(snapshot) {
      return new Set(
        snapshot && Array.isArray(snapshot.archivedSessionIds) ? snapshot.archivedSessionIds : [],
      )
    }

    function sessionVisible(summary, archived, filter, currentId) {
      if (!summary) return false
      if (summary.origin === 'subagent') return false
      if (summary.blank && summary.id !== currentId) return false
      const isArchived = archived.has(summary.id)
      if (filter === 'hide' && isArchived) return false
      if (filter === 'only' && !isArchived) return false
      return true
    }

    function isActiveSession(summary, statusMap) {
      if (!summary) return false
      const status =
        statusMap && typeof statusMap.get === 'function' ? statusMap.get(summary.id) : undefined
      if (status) {
        if (status.running === true || status.pendingInteraction != null) return true
        if (status.running === false) return false
      }
      return summary.running === true
    }

    function _sessionHasPendingInteraction(summary, statusMap) {
      const status =
        statusMap && typeof statusMap.get === 'function' ? statusMap.get(summary.id) : undefined
      return Boolean(status?.pendingInteraction)
    }

    function compareSessions(left, right) {
      const delta = (Number(right.updatedAt) || 0) - (Number(left.updatedAt) || 0)
      if (delta !== 0) return delta
      return String(left.displayTitle || '').localeCompare(String(right.displayTitle || ''))
    }

    function orderForProject(orderMap, projectKey, memberPaths) {
      if (orderMap && Array.isArray(orderMap[projectKey])) return orderMap[projectKey]
      for (const path of memberPaths || []) {
        if (orderMap && Array.isArray(orderMap[path])) return orderMap[path]
      }
      return null
    }

    function orderIndexForProject(order, project) {
      let index = order.indexOf(project.key)
      if (index !== -1) return index
      for (const path of project.memberPaths || []) {
        index = order.indexOf(path)
        if (index !== -1) return index
      }
      return -1
    }

    function sortSessions(list, state, projectKey, memberPaths) {
      const order =
        state.orderBy === 'manual'
          ? orderForProject(state.sessionOrder, projectKey, memberPaths)
          : null
      return list.slice().sort((left, right) => {
        if (order) {
          const li = order.indexOf(left.id)
          const ri = order.indexOf(right.id)
          if (li !== -1 || ri !== -1) {
            return (
              (li === -1 ? Number.MAX_SAFE_INTEGER : li) -
              (ri === -1 ? Number.MAX_SAFE_INTEGER : ri)
            )
          }
        }
        return compareSessions(left, right)
      })
    }

    function pinFirst(list, pinned) {
      return list.slice().sort((left, right) => {
        const lp = pinned.has(left.id) ? 0 : 1
        const rp = pinned.has(right.id) ? 0 : 1
        return lp - rp
      })
    }

    function sortProjects(list, state, orderKey) {
      const order =
        state.orderBy === 'manual' ? state.projectOrder[orderKey || UNGROUPED] || [] : null
      list.sort((left, right) => {
        if (order) {
          const li = orderIndexForProject(order, left)
          const ri = orderIndexForProject(order, right)
          if (li !== -1 || ri !== -1) {
            return (
              (li === -1 ? Number.MAX_SAFE_INTEGER : li) -
              (ri === -1 ? Number.MAX_SAFE_INTEGER : ri)
            )
          }
        }
        const delta = (Number(right.updatedAt) || 0) - (Number(left.updatedAt) || 0)
        if (delta !== 0) return delta
        return String(left.title || '').localeCompare(String(right.title || ''))
      })
      return list
    }

    function assignmentForProject(state, project) {
      const assignments =
        state.assignments && typeof state.assignments === 'object' ? state.assignments : {}
      const groupIds = new Set((Array.isArray(state.groups) ? state.groups : []).map((g) => g.id))
      for (const candidate of [project.key, ...(project.memberPaths || [])]) {
        const groupId = assignments[candidate]
        if (typeof groupId === 'string' && groupIds.has(groupId)) return groupId
      }
      return null
    }

    function buildTree(projects) {
      const nodes = new Map()
      for (const project of projects) nodes.set(project.key, { project, children: [] })
      const roots = []
      for (const project of projects) {
        let parent = null
        for (const candidate of projects) {
          if (candidate === project) continue
          if (!candidate.path || !project.path) continue
          if (!isAncestor(candidate.path, project.path)) continue
          if (!parent || normalizePath(candidate.path).length > normalizePath(parent.path).length)
            parent = candidate
        }
        if (parent) nodes.get(parent.key).children.push(nodes.get(project.key))
        else roots.push(nodes.get(project.key))
      }
      const sortNodes = (list) => {
        list.sort((left, right) => {
          const delta =
            (Number(right.project.updatedAt) || 0) - (Number(left.project.updatedAt) || 0)
          if (delta !== 0) return delta
          return String(left.project.title || '').localeCompare(String(right.project.title || ''))
        })
        for (const node of list) sortNodes(node.children)
      }
      sortNodes(roots)
      return roots
    }

    function searchSessions(query, projects, pinned) {
      const results = []
      for (const project of projects) {
        const projectText = String(`${project.title || ''} ${project.path || ''}`).toLowerCase()
        for (const session of project.sessions) {
          const text = [session.displayTitle, session.title, session.cwd]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
          if (!text.includes(query) && !projectText.includes(query)) continue
          results.push({ session, project })
        }
      }
      results.sort((left, right) => {
        const lp = pinned.has(left.session.id) ? 0 : 1
        const rp = pinned.has(right.session.id) ? 0 : 1
        if (lp !== rp) return lp - rp
        return compareSessions(left.session, right.session)
      })
      return results.slice(0, 80)
    }

    function buildView(input) {
      const snapshot = input.workspaceSnapshot || {
        items: [],
        archivedSessionIds: [],
        pinnedSessionIds: [],
        phase: 'pending',
      }
      const sessionSnapshot = input.sessionSnapshot || { ids: [], byId: {} }
      const state = input.state || defaultState()
      const statusMap = input.statusMap
      const currentId = input.currentId
      const query = typeof input.query === 'string' ? input.query : ''
      const activeOnly = state.activeOnly === true && state.mode === 'orca'
      const filter = FILTERS.includes(state.archivedFilter) ? state.archivedFilter : 'hide'
      const archived = archivedSetOf(snapshot)
      const pinnedIds = Array.isArray(snapshot.pinnedSessionIds) ? snapshot.pinnedSessionIds : []
      const pinned = new Set(pinnedIds)
      const summaries = sessionSnapshot.byId || {}
      const sessionIds = Array.isArray(sessionSnapshot.ids) ? sessionSnapshot.ids : []
      const items = Array.isArray(snapshot.items) ? snapshot.items : []
      const projects = []
      const accounted = new Set()
      const workspaceBySession = new Map()
      const consolidate = state.mode === 'orca'
      const repoMap = input.repoMap
      const groupsByKey = new Map()

      for (const workspace of items) {
        const sessions = []
        for (const id of workspace.sessionIds || []) {
          accounted.add(id)
          const summary = summaries[id]
          if (!summary || !sessionVisible(summary, archived, filter, currentId)) continue
          if (activeOnly && !isActiveSession(summary, statusMap)) continue
          sessions.push(summary)
        }
        const path = normalizePath(workspace.path)
        const repo = workspaceRepo(workspace, repoMap)
        const key = consolidate ? repo.key : path
        let group = groupsByKey.get(key)
        if (!group) {
          group = {
            key,
            root: consolidate ? repo.root : path,
            title: consolidate ? repo.title : workspace.title || baseName(path),
            mainWorkspace: null,
            members: [],
          }
          groupsByKey.set(key, group)
        }
        group.members.push({ workspace, path, repo, sessions })
        if (!group.mainWorkspace && (repo.main === true || path === normalizePath(repo.root))) {
          group.mainWorkspace = workspace
        }
        for (const session of sessions) {
          if (!workspaceBySession.has(session.id)) workspaceBySession.set(session.id, path)
        }
      }

      for (const group of groupsByKey.values()) {
        const all = []
        const seen = new Set()
        for (const member of group.members) {
          for (const session of member.sessions) {
            if (seen.has(session.id)) continue
            seen.add(session.id)
            all.push(session)
          }
        }
        if (activeOnly && all.length === 0) continue
        const projectKey = normalizePath(group.key)
        const memberPaths = group.members.map((member) => member.path)
        const ordered = sortSessions(all, state, projectKey, memberPaths)
        const mainWorkspace = group.mainWorkspace
        const primary = mainWorkspace || group.members[0]?.workspace || null
        const customTitle =
          state.projectNames && typeof state.projectNames === 'object'
            ? state.projectNames[projectKey]
            : undefined
        const title =
          (typeof customTitle === 'string' && customTitle) ||
          mainWorkspace?.title ||
          group.title ||
          group.members[0]?.workspace?.title ||
          baseName(projectKey)
        const worktrees = projectWorktrees(group)
        const updatedAt =
          ordered.reduce((value, session) => Math.max(value, Number(session.updatedAt) || 0), 0) ||
          group.members.reduce(
            (value, member) => Math.max(value, Date.parse(member.workspace.updatedAt || '') || 0),
            0,
          )
        projects.push({
          key: projectKey,
          workspaceId: primary ? primary.workspaceId : null,
          workspaceIds: group.members.map((member) => member.workspace.workspaceId),
          memberPaths,
          worktrees,
          groupId: null,
          title,
          path: group.root || primary?.path || null,
          sessions: ordered,
          pinnedFirst: pinFirst(ordered, pinned),
          updatedAt,
          isUngrouped: false,
        })
      }

      const loose = []
      for (const id of sessionIds) {
        if (accounted.has(id)) continue
        const summary = summaries[id]
        if (!summary) continue
        if (summary.origin === 'subagent') continue
        if (!sessionVisible(summary, archived, filter, currentId)) continue
        if (activeOnly && !isActiveSession(summary, statusMap)) continue
        loose.push(summary)
      }
      if (loose.length > 0) {
        const ordered = sortSessions(loose, state, UNGROUPED)
        projects.push({
          key: UNGROUPED,
          workspaceId: null,
          workspaceIds: [],
          memberPaths: [],
          worktrees: [],
          groupId: null,
          title: null,
          path: null,
          sessions: ordered,
          pinnedFirst: pinFirst(ordered, pinned),
          updatedAt: ordered.reduce(
            (value, session) => Math.max(value, Number(session.updatedAt) || 0),
            0,
          ),
          isUngrouped: true,
        })
      }

      const projectBySession = new Map()
      for (const project of projects) {
        for (const session of project.sessions) {
          if (!projectBySession.has(session.id)) projectBySession.set(session.id, project)
        }
      }

      const pinnedSessions = []
      for (const id of pinnedIds) {
        const summary = summaries[id]
        if (!summary) continue
        if (summary.origin === 'subagent') continue
        if (!sessionVisible(summary, archived, filter, currentId)) continue
        if (activeOnly && !isActiveSession(summary, statusMap)) continue
        pinnedSessions.push({ session: summary, project: projectBySession.get(id) || null })
      }

      const groups = []
      const configured = Array.isArray(state.groups) ? state.groups : []
      const groupIds = new Set(configured.map((group) => group.id))
      const assigned = new Map()
      for (const project of projects) {
        if (project.isUngrouped) continue
        const groupId = assignmentForProject(state, project)
        project.groupId = groupId
        if (typeof groupId === 'string' && groupIds.has(groupId)) {
          if (!assigned.has(groupId)) assigned.set(groupId, [])
          assigned.get(groupId).push(project)
        }
      }
      for (const group of configured) {
        const list = assigned.get(group.id) || []
        sortProjects(list, state, group.id)
        groups.push({ id: group.id, name: group.name, projects: list })
      }

      const ungroupedProjects = projects.filter((project) => {
        if (project.isUngrouped) return false
        return !project.groupId
      })
      sortProjects(ungroupedProjects, state, UNGROUPED)

      const flat = []
      for (const project of projects) {
        for (const session of project.sessions) flat.push({ session, project })
      }
      flat.sort((left, right) => {
        const lp = pinned.has(left.session.id) ? 0 : 1
        const rp = pinned.has(right.session.id) ? 0 : 1
        if (lp !== rp) return lp - rp
        return compareSessions(left.session, right.session)
      })

      const trimmed = query.trim().toLowerCase()
      return {
        projects,
        groups,
        ungroupedProjects,
        pinned: pinnedSessions,
        tree: buildTree(projects.filter((project) => !project.isUngrouped)),
        flat,
        searchResults: trimmed ? searchSessions(trimmed, projects, pinned) : [],
        projectBySession,
        workspaceBySession,
        counts: {
          projects: projects.filter((project) => !project.isUngrouped).length,
          sessions: projects.reduce((value, project) => value + project.sessions.length, 0),
          pinned: pinnedSessions.length,
        },
        hasProjects: projects.length > 0,
        phase: snapshot.phase || 'pending',
      }
    }

    function useSource(source) {
      const subscribe = React.useCallback(
        (listener) => (source ? source.subscribe(listener) : () => {}),
        [source],
      )
      const read = React.useCallback(() => (source ? source.getSnapshot() : undefined), [source])
      return React.useSyncExternalStore(subscribe, read, read)
    }

    function findCurrentId(sessionSnapshot) {
      if (!sessionSnapshot) return undefined
      const ids = Array.isArray(sessionSnapshot.ids)
        ? sessionSnapshot.ids
        : Object.keys(sessionSnapshot.byId || {})
      for (const id of ids) {
        const summary = sessionSnapshot.byId ? sessionSnapshot.byId[id] : undefined
        if (summary?.retainedBy && summary.retainedBy.mainView > 0) return id
      }
      return undefined
    }

    function sessionLabel(session, currentId, t) {
      if (!session) return t('session.untitled')
      if (session.blank && session.id === currentId) return t('session.new')
      return session.displayTitle || session.title || t('session.untitled')
    }

    function errorMessage(error) {
      if (!error) return ''
      if (typeof error === 'string') return error
      if (typeof error.message === 'string' && error.message) return error.message
      if (error.rpcError && typeof error.rpcError.message === 'string')
        return error.rpcError.message
      return ''
    }

    function isActiveWorkRefusal(error) {
      return Boolean(
        error &&
          error.name === 'WorkspaceArchiveError' &&
          error.rpcError &&
          error.rpcError.code === 'workspace/session-active',
      )
    }

    function stopEvent(event) {
      if (!event) return
      event.preventDefault()
      event.stopPropagation()
    }

    function clearDropIndicators() {
      for (const element of document.querySelectorAll('[data-orca-drop]')) {
        delete element.dataset.orcaDrop
      }
    }

    function setDropIndicator(element, position) {
      if (!element) return
      clearDropIndicators()
      element.dataset.orcaDrop = position
    }

    let dragPayload = null

    function IconButton({ icon, label, onClick, active, danger, disabled, size = 22 }) {
      return h(
        'button',
        {
          type: 'button',
          className: cx('orca-icon-button', active && 'is-active', danger && 'is-danger'),
          'aria-label': label,
          title: label,
          disabled,
          onClick: (event) => {
            stopEvent(event)
            if (!disabled && onClick) onClick(event)
          },
        },
        h(Icon, { name: icon, size: size === 22 ? 14 : size }),
      )
    }

    function SessionStatusIndicator({ running, completed, pending, archived }) {
      if (archived) {
        return h('span', { className: 'orca-status-dot is-archived', 'aria-hidden': 'true' })
      }
      if (pending) {
        return h('span', { className: 'orca-status-dot is-pending', 'aria-hidden': 'true' })
      }
      if (running) {
        return h('span', { className: 'orca-spinner', 'aria-hidden': 'true' })
      }
      if (completed) {
        return h('span', { className: 'orca-status-dot is-completed', 'aria-hidden': 'true' })
      }
      return h('span', { className: 'orca-status-dot', 'aria-hidden': 'true' })
    }

    function CountBadge({ children }) {
      return h('span', { className: 'orca-count' }, children)
    }

    function Chevron({ open }) {
      return h(
        'span',
        { className: cx('orca-chevron', open && 'is-open') },
        h(Icon, { name: 'chevron', size: 11 }),
      )
    }

    function SessionRow(props) {
      const {
        session,
        project,
        t,
        actions,
        variant,
        depth = 0,
        drag,
        pinned,
        archived,
        current,
      } = props
      const statusMap = React.useContext(SessionStatusContext)
      const workspaceBySession = React.useContext(WorkspacePathContext)
      const worktree = worktreeForSession(session, project, workspaceBySession)
      const liveStatus =
        statusMap && typeof statusMap.get === 'function' ? statusMap.get(session.id) : undefined
      const running =
        !archived &&
        (liveStatus && liveStatus.running !== undefined
          ? liveStatus.running === true
          : session.running === true)
      const completed = !archived && Boolean(liveStatus?.completionUnread)
      const pending = !archived && Boolean(liveStatus?.pendingInteraction)
      const pinHint = Boolean(props.pinHint)
      const title = sessionLabel(session, props.currentId, t)
      const showMeta = variant === 'pinned' || variant === 'flat' || variant === 'search'
      const meta = showMeta
        ? project
          ? project.isUngrouped
            ? session.cwd
              ? baseName(session.cwd)
              : t('project.ungrouped')
            : project.title
          : session.cwd
            ? baseName(session.cwd)
            : null
        : null
      const showPinnedHint = pinHint && pinned
      const showPinGlyph = pinned && !pinHint
      const worktreeBadge = worktree
        ? h(
            'span',
            {
              className: cx('orca-worktree', worktree.main && 'is-main'),
              title: session.cwd ? `${worktree.label} — ${session.cwd}` : worktree.label,
            },
            worktree.label,
          )
        : null
      const pinnedHint = showPinnedHint
        ? h(
            'span',
            { className: 'orca-session-hint' },
            h(Icon, { name: 'pinFilled', size: 9 }),
            t('pinned.hint'),
          )
        : null
      const archivedBadge = archived
        ? h('span', { className: 'orca-session-hint is-archived' }, t('session.archivedHint'))
        : null
      const projectBadge =
        meta && !(worktree && worktree.label === meta)
          ? h(
              'span',
              { className: 'orca-session-project' },
              h(Icon, { name: 'folder', size: 10, className: 'orca-session-project-icon' }),
              h('span', { className: 'orca-session-meta', title: meta }, meta),
            )
          : null
      const pinGlyph = showPinGlyph
        ? h(Icon, { name: 'pinFilled', size: 10, className: 'orca-session-pin' })
        : null
      const titleBadge = h('span', { className: 'orca-session-title', title }, title)

      const main = h(
        'div',
        {
          className: cx('orca-session-main', current && 'is-current'),
          role: 'button',
          tabIndex: 0,
          draggable: drag ? true : undefined,
          style: { marginLeft: variant === 'tree' ? depth * 13 : 0 },
          onClick: () => actions.open(session, variant),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              stopEvent(event)
              actions.open(session, variant)
            }
          },
          onDragStart: drag ? (event) => drag.start(event, session) : undefined,
          onDragOver: drag ? (event) => drag.over(event, session) : undefined,
          onDrop: drag ? (event) => drag.drop(event, session) : undefined,
          onDragEnd: drag ? drag.end : undefined,
        },
        h(
          'div',
          { className: 'orca-session-line' },
          h(SessionStatusIndicator, { running, completed, pending, archived }),
          pinGlyph,
          titleBadge,
        ),
        h(
          'div',
          { className: 'orca-session-subline' },
          worktreeBadge,
          projectBadge,
          pinnedHint,
          archivedBadge,
        ),
      )

      const hover = h(
        'div',
        { className: 'orca-session-actions' },
        !archived
          ? h(IconButton, {
              icon: pinned ? 'pinFilled' : 'pin',
              label: pinned ? t('pinned.unpin') : t('pinned.pin'),
              active: pinned,
              onClick: () => (pinned ? actions.unpin(session) : actions.pin(session)),
            })
          : h(IconButton, {
              icon: 'restore',
              label: t('session.unarchive'),
              onClick: () => actions.unarchive(session),
            }),
        h(IconButton, {
          icon: 'more',
          label: t('action.viewOptions'),
          onClick: (event) => actions.menu(event, session, pinned, archived, variant),
        }),
      )

      return h(
        'div',
        {
          className: cx(
            'orca-session',
            `orca-session--${variant}`,
            pinned && pinHint && 'is-pinned-ref',
            archived && 'is-archived',
            current && 'is-current',
          ),
          'data-session-id': session.id,
        },
        main,
        hover,
      )
    }

    function ProjectRow(props) {
      const {
        project,
        t,
        actions,
        variant,
        depth = 0,
        groupId,
        siblings,
        collapsed,
        onToggle,
        allowDrag,
        beforeSessions,
        currentId,
        pinnedSet,
        archivedSet,
        drag,
      } = props
      const expanded = !collapsed
      const guided = variant === 'orca'
      const [sessionLimit, setSessionLimit] = React.useState(8)
      const sessions = variant === 'orca' ? project.sessions : project.pinnedFirst
      const visibleSessions = sessions.filter(
        (session, index) =>
          index < sessionLimit || session.id === currentId || pinnedSet.has(session.id),
      )
      const hiddenSessions = sessions.length - visibleSessions.length
      const title = project.title || t('project.ungrouped')
      const canManage = project.workspaceId !== null && project.workspaceId !== undefined
      const worktrees = Array.isArray(project.worktrees) ? project.worktrees : []
      const worktreeBadge =
        worktrees.length > 1
          ? h(
              'span',
              {
                className: 'orca-project-worktrees',
                title: t('project.worktreesTitle', {
                  list: worktrees.map((entry) => entry.label).join(', '),
                }),
                'aria-label': t('project.worktrees', { n: worktrees.length }),
              },
              h(Icon, { name: 'layers', size: 9 }),
              String(worktrees.length),
            )
          : null

      const head = h(
        'div',
        {
          className: 'orca-project-head',
          role: 'button',
          tabIndex: 0,
          draggable: allowDrag ? true : undefined,
          style: { paddingLeft: 5 + depth * 13 },
          onClick: onToggle,
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              stopEvent(event)
              onToggle()
            }
          },
          onDragStart: allowDrag && drag ? (event) => drag.start(event, project) : undefined,
          onDragOver: allowDrag && drag ? (event) => drag.over(event, project) : undefined,
          onDragLeave: allowDrag && drag ? drag.leave : undefined,
          onDrop:
            allowDrag && drag ? (event) => drag.drop(event, project, groupId, siblings) : undefined,
          onDragEnd: allowDrag && drag ? drag.end : undefined,
        },
        h(Chevron, { open: expanded }),
        h(Icon, {
          name: expanded ? 'folderOpen' : 'folder',
          size: 14,
          className: 'orca-project-folder',
        }),
        h('span', { className: 'orca-project-title', title: project.path || title }, title),
        worktreeBadge,
        h(CountBadge, null, String(project.sessions.length)),
      )

      const hover = canManage
        ? h(
            'div',
            { className: 'orca-project-actions' },
            h(IconButton, {
              icon: 'chat',
              label: t('project.newSession'),
              onClick: () => actions.startSession(project),
            }),
            h(IconButton, {
              icon: 'more',
              label: t('action.viewOptions'),
              onClick: (event) => actions.projectMenu(event, project, groupId),
            }),
          )
        : null

      return h(
        'div',
        { className: 'orca-project', 'data-project-key': project.key },
        h('div', { className: 'orca-project-row' }, head, hover),
        expanded
          ? h(
              'div',
              { className: cx('orca-project-body', guided && 'is-guided') },
              beforeSessions || null,
              sessions.length > 0
                ? visibleSessions.map((session) =>
                    h(SessionRow, {
                      key: session.id,
                      session,
                      project,
                      t,
                      actions,
                      variant: variant === 'tree' ? 'tree' : 'project',
                      depth: depth + 1,
                      pinned: pinnedSet.has(session.id),
                      pinHint: variant === 'orca',
                      archived: archivedSet.has(session.id),
                      current: currentId === session.id,
                      currentId,
                      guided,
                      drag:
                        variant === 'orca' && drag
                          ? {
                              start: (event) => drag.startSession(event, session, project),
                              over: (event) => drag.overSession(event, session, project),
                              drop: (event) =>
                                drag.dropSession(
                                  event,
                                  session,
                                  project,
                                  sessions.map((entry) => entry.id),
                                ),
                              end: drag.end,
                            }
                          : undefined,
                    }),
                  )
                : h('div', { className: 'orca-empty-inline' }, t('empty.sessions')),
              hiddenSessions > 0
                ? h(
                    'button',
                    {
                      type: 'button',
                      className: 'orca-show-more',
                      style: {
                        paddingLeft: (guided ? 10 : 25) + (depth + 1) * (guided ? 12 : 13),
                      },
                      onClick: () => setSessionLimit(sessionLimit + 8),
                    },
                    t('sessions.expand', { n: hiddenSessions }),
                  )
                : null,
            )
          : null,
      )
    }

    function PinnedGroup(props) {
      const { entries, t, actions, collapsed, onToggle, currentId, archivedSet, emptyHint } = props
      return h(
        'section',
        { className: cx('orca-pinned-group', collapsed && 'is-collapsed') },
        h(
          'div',
          {
            className: 'orca-group-head orca-pinned-head',
            role: 'button',
            tabIndex: 0,
            onClick: onToggle,
            onKeyDown: (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                stopEvent(event)
                onToggle()
              }
            },
          },
          h(Chevron, { open: !collapsed }),
          h(Icon, { name: 'pinFilled', size: 12, className: 'orca-pinned-icon' }),
          h('span', { className: 'orca-group-title' }, t('pinned.title')),
          h(CountBadge, null, String(entries.length)),
        ),
        collapsed
          ? null
          : h(
              'div',
              { className: 'orca-pinned-body' },
              entries.length > 0
                ? entries.map((entry) =>
                    h(SessionRow, {
                      key: entry.session.id,
                      session: entry.session,
                      project: entry.project,
                      t,
                      actions,
                      variant: 'pinned',
                      pinned: true,
                      archived: archivedSet.has(entry.session.id),
                      current: currentId === entry.session.id,
                      currentId,
                    }),
                  )
                : h('div', { className: 'orca-empty-inline' }, emptyHint || t('pinned.empty')),
            ),
      )
    }

    function LooseSessions(props) {
      const { project, t, actions, collapsed, onToggle, currentId, pinnedSet, archivedSet } = props
      if (!project || project.sessions.length === 0) return null
      return h(
        'section',
        { className: 'orca-group orca-group--loose' },
        h(
          'div',
          { className: 'orca-group-row' },
          h(
            'div',
            {
              className: 'orca-group-head',
              role: 'button',
              tabIndex: 0,
              title: t('loose.hint'),
              onClick: onToggle,
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  stopEvent(event)
                  onToggle()
                }
              },
            },
            h(Chevron, { open: !collapsed }),
            h(Icon, { name: 'chat', size: 12, className: 'orca-group-icon' }),
            h('span', { className: 'orca-group-title' }, t('loose.title')),
            h(CountBadge, null, String(project.sessions.length)),
          ),
        ),
        collapsed
          ? null
          : h(
              'div',
              { className: 'orca-group-body' },
              project.sessions.map((session) =>
                h(SessionRow, {
                  key: session.id,
                  session,
                  project,
                  t,
                  actions,
                  variant: 'flat',
                  pinned: pinnedSet.has(session.id),
                  archived: archivedSet.has(session.id),
                  current: currentId === session.id,
                  currentId,
                }),
              ),
            ),
      )
    }

    function GroupSection(props) {
      const {
        group,
        projects,
        t,
        actions,
        state,
        toggleGroup,
        onToggle,
        drag,
        currentId,
        pinnedSet,
        archivedSet,
        emptyHint,
      } = props
      const groupId = group ? group.id : null
      const name = group ? group.name : t('group.ungrouped')
      const collapsed = onToggle.collapsed
      const canManage = Boolean(group)
      const projectKeys = projects.map((project) => project.key)

      const head = h(
        'div',
        {
          className: 'orca-group-head',
          role: 'button',
          tabIndex: 0,
          onClick: () => toggleGroup(),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              stopEvent(event)
              toggleGroup()
            }
          },
        },
        h(Chevron, { open: !collapsed }),
        h(Icon, { name: canManage ? 'layers' : 'inbox', size: 12, className: 'orca-group-icon' }),
        h('span', { className: 'orca-group-title' }, name),
        h(CountBadge, null, String(projects.length)),
      )

      const hover = canManage
        ? h(
            'div',
            { className: 'orca-group-actions' },
            h(IconButton, {
              icon: 'more',
              label: t('action.viewOptions'),
              onClick: (event) => actions.groupMenu(event, group),
            }),
          )
        : null

      const sectionDrop = drag
        ? {
            onDragOver: (event) => {
              if (dragPayload?.kind !== 'project') return
              event.preventDefault()
              event.stopPropagation()
              setDropIndicator(event.currentTarget, 'group')
            },
            onDragLeave: (event) => {
              if (event.currentTarget.contains(event.relatedTarget)) return
              if (event.currentTarget.dataset.orcaDrop) delete event.currentTarget.dataset.orcaDrop
            },
            onDrop: (event) => {
              if (dragPayload?.kind !== 'project') return
              stopEvent(event)
              drag.dropOnGroup(event, groupId, projectKeys)
            },
          }
        : null

      return h(
        'section',
        { className: cx('orca-group', !group && 'orca-group--ungrouped'), ...sectionDrop },
        h('div', { className: 'orca-group-row' }, head, hover),
        collapsed
          ? null
          : h(
              'div',
              { className: 'orca-group-body' },
              projects.length > 0
                ? projects.map((project) =>
                    h(ProjectRow, {
                      key: project.key,
                      project,
                      t,
                      actions,
                      variant: 'orca',
                      depth: 0,
                      groupId,
                      siblings: projectKeys,
                      collapsed: isCollapsed(
                        state,
                        `p:${project.key}`,
                        project.key === props.currentProjectKey,
                      ),
                      onToggle: () =>
                        actions.toggleProject(project.key, project.key === props.currentProjectKey),
                      allowDrag: Boolean(drag) && !project.isUngrouped,
                      currentId,
                      pinnedSet,
                      archivedSet,
                      drag,
                    }),
                  )
                : h('div', { className: 'orca-empty-inline' }, emptyHint || t('group.empty')),
            ),
      )
    }

    function TreeNode(props) {
      const { node, depth, t, actions, state, currentId, pinnedSet, archivedSet } = props
      const project = node.project
      const key = `p:${project.key}`
      const defaultExpanded = true
      const collapsed = isCollapsed(state, key, defaultExpanded)
      const children = collapsed
        ? null
        : node.children.length > 0
          ? h(
              'div',
              null,
              node.children.map((child) =>
                h(TreeNode, {
                  key: child.project.key,
                  node: child,
                  depth: depth + 1,
                  t,
                  actions,
                  state,
                  currentId,
                  pinnedSet,
                  archivedSet,
                }),
              ),
            )
          : null
      return h(ProjectRow, {
        project,
        t,
        actions,
        variant: 'tree',
        depth,
        collapsed,
        onToggle: () => actions.toggleProject(project.key, defaultExpanded),
        beforeSessions: children,
        currentId,
        pinnedSet,
        archivedSet,
      })
    }

    function EmptyState({ icon, title, hint, actionLabel, onAction }) {
      return h(
        'div',
        { className: 'orca-empty' },
        h('div', { className: 'orca-empty-glyph' }, h(Icon, { name: icon, size: 20 })),
        h('div', { className: 'orca-empty-title' }, title),
        hint ? h('div', { className: 'orca-empty-hint' }, hint) : null,
        actionLabel
          ? h(
              'button',
              {
                type: 'button',
                className: 'orca-text-button',
                onClick: onAction,
              },
              actionLabel,
            )
          : null,
      )
    }

    function OrcaView(props) {
      const {
        view,
        state,
        t,
        actions,
        currentProjectKey,
        currentId,
        pinnedSet,
        archivedSet,
        drag,
      } = props
      const pinnedCollapsed = isCollapsed(state, 'pinned', true)
      const hasGroups = view.groups.length > 0
      const activeOnly = state.activeOnly === true
      const emptyHint = activeOnly ? t('active.empty') : t('group.empty')
      if (activeOnly && view.pinned.length === 0 && !view.hasProjects) {
        return h(
          'div',
          { className: 'orca-view' },
          h(EmptyState, {
            icon: 'chat',
            title: t('active.empty'),
            hint: t('active.hint'),
            actionLabel: t('active.showAll'),
            onAction: () => actions.setActiveOnly(false),
          }),
        )
      }
      return h(
        'div',
        { className: 'orca-view' },
        h(PinnedGroup, {
          entries: view.pinned,
          t,
          actions,
          collapsed: pinnedCollapsed,
          onToggle: () => actions.toggleGroup('pinned', true),
          currentId,
          archivedSet,
          emptyHint: activeOnly ? t('active.empty') : t('pinned.empty'),
        }),
        hasGroups
          ? [
              ...view.groups.map((group) =>
                h(GroupSection, {
                  key: group.id,
                  group,
                  projects: group.projects,
                  t,
                  actions,
                  state,
                  toggleGroup: () => actions.toggleGroup(`g:${group.id}`, true),
                  onToggle: { collapsed: isCollapsed(state, `g:${group.id}`, true) },
                  currentProjectKey,
                  currentId,
                  pinnedSet,
                  archivedSet,
                  emptyHint,
                  drag,
                }),
              ),
              h(GroupSection, {
                key: 'ungrouped',
                group: null,
                projects: view.ungroupedProjects,
                t,
                actions,
                state,
                toggleGroup: () => actions.toggleGroup(`g:${UNGROUPED}`, true),
                onToggle: { collapsed: isCollapsed(state, `g:${UNGROUPED}`, true) },
                currentProjectKey,
                currentId,
                pinnedSet,
                archivedSet,
                emptyHint,
                drag,
              }),
            ]
          : view.ungroupedProjects.map((project) =>
              h(ProjectRow, {
                key: project.key,
                project,
                t,
                actions,
                variant: 'orca',
                depth: 0,
                groupId: null,
                siblings: view.ungroupedProjects.map((entry) => entry.key),
                collapsed: isCollapsed(
                  state,
                  `p:${project.key}`,
                  project.key === currentProjectKey,
                ),
                onToggle: () =>
                  actions.toggleProject(project.key, project.key === currentProjectKey),
                allowDrag: Boolean(drag),
                currentId,
                pinnedSet,
                archivedSet,
                drag,
              }),
            ),
        view.projects
          .filter((project) => project.isUngrouped)
          .map((project) =>
            h(LooseSessions, {
              key: project.key,
              project,
              t,
              actions,
              collapsed: isCollapsed(state, 'loose', false),
              onToggle: () => actions.toggleGroup('loose', false),
              currentId,
              pinnedSet,
              archivedSet,
            }),
          ),
        !view.hasProjects
          ? h(EmptyState, {
              icon: activeOnly ? 'chat' : 'folder',
              title: activeOnly ? t('active.empty') : t('empty.projects'),
              hint: activeOnly ? t('active.hint') : t('empty.projectsHint'),
              actionLabel: activeOnly ? t('active.showAll') : t('action.addProject'),
              onAction: activeOnly
                ? () => actions.setActiveOnly(false)
                : (event) => actions.addMenu(event, null),
            })
          : null,
      )
    }

    function WorkspaceView(props) {
      const { view, state, t, actions, currentId, pinnedSet, archivedSet } = props
      const list = React.useMemo(() => {
        const copy = view.projects.filter((project) => !project.isUngrouped)
        sortProjects(copy, state, '__workspace__')
        return copy
      }, [view.projects, state.orderBy, state.projectOrder])
      const loose = view.projects.find((project) => project.isUngrouped)
      return h(
        'div',
        { className: 'orca-view' },
        list.map((project) =>
          h(ProjectRow, {
            key: project.key,
            project,
            t,
            actions,
            variant: 'workspace',
            depth: 0,
            collapsed: isCollapsed(state, `p:${project.key}`, true),
            onToggle: () => actions.toggleProject(project.key, true),
            allowDrag: false,
            currentId,
            pinnedSet,
            archivedSet,
          }),
        ),
        loose
          ? h(LooseSessions, {
              key: loose.key,
              project: loose,
              t,
              actions,
              collapsed: isCollapsed(state, 'loose', false),
              onToggle: () => actions.toggleGroup('loose', false),
              currentId,
              pinnedSet,
              archivedSet,
            })
          : null,
        list.length === 0 && !loose
          ? h(EmptyState, {
              icon: 'folder',
              title: t('empty.projects'),
              hint: t('empty.projectsHint'),
              actionLabel: t('action.addWorkspace'),
              onAction: (event) => actions.addMenu(event, null),
            })
          : null,
      )
    }

    function TreeView(props) {
      const { view, state, t, actions, currentId, pinnedSet, archivedSet } = props
      const loose = view.projects.find((project) => project.isUngrouped)
      return h(
        'div',
        { className: 'orca-view' },
        view.tree.map((node) =>
          h(TreeNode, {
            key: node.project.key,
            node,
            depth: 0,
            t,
            actions,
            state,
            currentId,
            pinnedSet,
            archivedSet,
          }),
        ),
        loose
          ? h(LooseSessions, {
              key: loose.key,
              project: loose,
              t,
              actions,
              collapsed: isCollapsed(state, 'loose', false),
              onToggle: () => actions.toggleGroup('loose', false),
              currentId,
              pinnedSet,
              archivedSet,
            })
          : null,
        view.tree.length === 0 && !loose
          ? h(EmptyState, {
              icon: 'folder',
              title: t('empty.projects'),
              hint: t('empty.projectsHint'),
              actionLabel: t('action.addWorkspace'),
              onAction: (event) => actions.addMenu(event, null),
            })
          : null,
      )
    }

    function FlatView(props) {
      const { view, t, actions, currentId, archivedSet } = props
      return h(
        'div',
        { className: 'orca-view orca-flat' },
        view.flat.map((entry) =>
          h(SessionRow, {
            key: entry.session.id,
            session: entry.session,
            project: entry.project,
            t,
            actions,
            variant: 'flat',
            pinned: view.pinned.some((pinned) => pinned.session.id === entry.session.id),
            archived: archivedSet.has(entry.session.id),
            current: currentId === entry.session.id,
            currentId,
          }),
        ),
        view.flat.length === 0
          ? h(EmptyState, {
              icon: 'chat',
              title: t('empty.sessions'),
              hint: t('empty.projectsHint'),
              actionLabel: t('action.addWorkspace'),
              onAction: (event) => actions.addMenu(event, null),
            })
          : null,
      )
    }

    function SearchView(props) {
      const { view, t, actions, currentId, archivedSet, query, onClear } = props
      return h(
        'div',
        { className: 'orca-view orca-search' },
        view.searchResults.map((entry) =>
          h(SessionRow, {
            key: entry.session.id,
            session: entry.session,
            project: entry.project,
            t,
            actions,
            variant: 'search',
            pinned: view.pinned.some((pinned) => pinned.session.id === entry.session.id),
            archived: archivedSet.has(entry.session.id),
            current: currentId === entry.session.id,
            currentId,
          }),
        ),
        view.searchResults.length === 0
          ? h(EmptyState, {
              icon: 'search',
              title: t('empty.noMatches'),
              hint: query,
              actionLabel: t('action.clear'),
              onAction: onClear,
            })
          : null,
      )
    }

    function Header(props) {
      const { t, mode, query, searchOpen, count, onSearchToggle, onQuery, onViewMenu, onAddMenu } =
        props
      const inputRef = React.useRef(null)
      React.useEffect(() => {
        if (searchOpen && inputRef.current) inputRef.current.focus()
      }, [searchOpen])
      return h(
        'div',
        { className: 'orca-header' },
        h(
          'div',
          { className: 'orca-title-row' },
          h(
            'span',
            { className: 'orca-title' },
            mode === 'orca'
              ? t('title.projects')
              : mode === 'flat'
                ? t('title.sessions')
                : t('title.workspaces'),
          ),
          count > 0 ? h(CountBadge, null, String(count)) : null,
          h(
            'div',
            { className: 'orca-head-actions' },
            h(IconButton, {
              icon: 'search',
              label: t('action.search'),
              active: searchOpen,
              onClick: onSearchToggle,
            }),
            h(IconButton, {
              icon: 'sliders',
              label: t('action.viewOptions'),
              onClick: onViewMenu,
            }),
            h(IconButton, {
              icon: 'plus',
              label: t('action.add'),
              onClick: onAddMenu,
            }),
          ),
        ),
        searchOpen
          ? h(
              'div',
              { className: 'orca-search-field' },
              h(Icon, { name: 'search', size: 13, className: 'orca-search-icon' }),
              h('input', {
                ref: inputRef,
                type: 'text',
                value: query,
                placeholder: t('placeholder.search'),
                'aria-label': t('action.search'),
                onChange: (event) => onQuery(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Escape') {
                    stopEvent(event)
                    onSearchToggle(true)
                  }
                },
              }),
              query
                ? h(IconButton, {
                    icon: 'close',
                    label: t('action.clear'),
                    onClick: () => onQuery(''),
                    size: 20,
                  })
                : null,
            )
          : null,
      )
    }

    function MenuLayer(props) {
      const { menu, onClose } = props
      const ref = React.useRef(null)
      React.useEffect(() => {
        const onPointerDown = (event) => {
          if (!ref.current || ref.current.contains(event.target)) return
          onClose()
        }
        const onKeyDown = (event) => {
          if (event.key === 'Escape') onClose()
        }
        const onScroll = (event) => {
          if (ref.current && event.target instanceof Node && ref.current.contains(event.target))
            return
          onClose()
        }
        document.addEventListener('pointerdown', onPointerDown, true)
        document.addEventListener('keydown', onKeyDown, true)
        window.addEventListener('resize', onScroll)
        window.addEventListener('scroll', onScroll, true)
        return () => {
          document.removeEventListener('pointerdown', onPointerDown, true)
          document.removeEventListener('keydown', onKeyDown, true)
          window.removeEventListener('resize', onScroll)
          window.removeEventListener('scroll', onScroll, true)
        }
      }, [onClose])

      return h(
        'div',
        {
          ref,
          className: 'orca-menu',
          role: 'menu',
          style: { left: menu.x, top: menu.y, width: menu.width },
        },
        menu.items.map((item, index) => {
          if (item.divider)
            return h('div', {
              key: `divider-${index}`,
              className: 'orca-menu-divider',
              role: 'separator',
            })
          if (item.section)
            return h(
              'div',
              { key: `section-${index}`, className: 'orca-menu-section' },
              item.section,
            )
          return h(
            'button',
            {
              key: `item-${index}`,
              type: 'button',
              role: 'menuitem',
              className: cx(
                'orca-menu-item',
                item.danger && 'is-danger',
                item.disabled && 'is-disabled',
              ),
              disabled: item.disabled,
              onClick: () => {
                if (item.disabled) return
                onClose()
                if (item.onSelect) item.onSelect()
              },
            },
            h(
              'span',
              { className: 'orca-menu-icon' },
              item.icon ? h(Icon, { name: item.icon, size: 13 }) : null,
            ),
            h('span', { className: 'orca-menu-label' }, item.label),
            item.badge ? h('span', { className: 'orca-menu-badge' }, item.badge) : null,
            item.checked
              ? h(Icon, { name: 'check', size: 13, className: 'orca-menu-check' })
              : null,
          )
        }),
      )
    }

    function DialogLayer(props) {
      const { dialog, t, onCancel, onConfirm } = props
      const [value, setValue] = React.useState(dialog.value || '')
      const inputRef = React.useRef(null)
      const primaryRef = React.useRef(null)
      React.useEffect(() => {
        if (dialog.input && inputRef.current) {
          inputRef.current.focus()
          inputRef.current.select()
        } else if (primaryRef.current) {
          primaryRef.current.focus()
        }
      }, [dialog.input])
      const canConfirm = !dialog.input || value.trim().length > 0
      const submit = () => {
        if (!canConfirm) return
        onConfirm(dialog.input ? value.trim() : null)
      }
      return h(
        'div',
        {
          className: 'orca-dialog-overlay',
          role: 'presentation',
          onPointerDown: (event) => {
            if (event.target === event.currentTarget) onCancel()
          },
        },
        h(
          'div',
          {
            className: 'orca-dialog',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': dialog.title,
          },
          h('div', { className: 'orca-dialog-title' }, dialog.title),
          dialog.description
            ? h('div', { className: 'orca-dialog-description' }, dialog.description)
            : null,
          dialog.input
            ? h('input', {
                ref: inputRef,
                className: 'orca-dialog-input',
                type: 'text',
                value,
                placeholder: dialog.placeholder || '',
                'aria-label': dialog.title,
                onChange: (event) => setValue(event.target.value),
                onKeyDown: (event) => {
                  if (event.key === 'Enter') {
                    stopEvent(event)
                    submit()
                  } else if (event.key === 'Escape') {
                    stopEvent(event)
                    onCancel()
                  }
                },
              })
            : null,
          h(
            'div',
            { className: 'orca-dialog-actions' },
            h(
              'button',
              { type: 'button', className: 'orca-button', onClick: onCancel },
              t('dialog.cancel'),
            ),
            h(
              'button',
              {
                ref: primaryRef,
                type: 'button',
                className: cx(
                  'orca-button',
                  dialog.danger ? 'orca-button--danger' : 'orca-button--primary',
                ),
                disabled: !canConfirm,
                onClick: submit,
              },
              dialog.confirm,
            ),
          ),
        ),
      )
    }

    function ToastLayer({ toast }) {
      return h(
        'div',
        { className: cx('orca-toast', toast.tone === 'error' && 'is-error'), role: 'status' },
        h(Icon, { name: toast.tone === 'error' ? 'warning' : 'check', size: 13 }),
        h('span', null, toast.message),
      )
    }

    const EMPTY_WORKSPACES = {
      items: [],
      archivedSessionIds: [],
      pinnedSessionIds: [],
      phase: 'pending',
    }
    const EMPTY_SESSIONS = { ids: [], byId: {} }

    function OrcaBrowser(props) {
      const {
        t,
        wide,
        expandSidebar,
        workspaceSource,
        sessionSource,
        sessionStatusSource,
        layoutSource,
        searchRequestSource,
        resolveRepositories,
        openSession: openSessionService,
        startSession: startSessionService,
        openWorkspace: openWorkspaceService,
        pickDirectory,
        createWorkspace,
        deleteWorkspace,
        pinSession: pinSessionService,
        unpinSession: unpinSessionService,
        archiveSession: archiveSessionService,
        unarchiveSession: unarchiveSessionService,
      } = props

      const [state, setState] = React.useState(loadState)
      const [query, setQuery] = React.useState('')
      const [searchOpen, setSearchOpen] = React.useState(false)
      const [menu, setMenu] = React.useState(null)
      const [dialog, setDialog] = React.useState(null)
      const [toast, setToast] = React.useState(null)
      const [repoMap, setRepoMap] = React.useState(null)
      const toastTimer = React.useRef(undefined)
      const searchRoot = React.useRef(null)
      const lastSearchRequest = React.useRef(0)
      const searchFocusPending = React.useRef(false)
      const searchRequest = useSource(searchRequestSource) || 0

      React.useEffect(() => {
        if (searchRequest === 0 || searchRequest === lastSearchRequest.current) return
        lastSearchRequest.current = searchRequest
        searchFocusPending.current = true
        setSearchOpen(true)
        if (wide === false || searchRoot.current?.closest('[inert]')) expandSidebar?.()
      }, [searchRequest, wide, expandSidebar])

      // Drawer visibility can change while wide stays true; retry only pending focus.
      React.useEffect(() => {
        if (!searchFocusPending.current || !searchOpen || wide === false) return
        const input = searchRoot.current?.querySelector('.orca-search-field input')
        if (!input || input.closest('[inert]')) return
        input.focus({ preventScroll: true })
        searchFocusPending.current = false
      })

      const workspaceSnapshot = useSource(workspaceSource)
      const sessionSnapshot = useSource(sessionSource)
      const sessionStatusSnapshot = useSource(sessionStatusSource)
      const layoutSnapshot = useSource(layoutSource)
      const workspaceState = workspaceSnapshot || EMPTY_WORKSPACES
      const sessionState = sessionSnapshot || EMPTY_SESSIONS
      const statusMap = sessionStatusSnapshot || EMPTY_STATUS
      const workspacePathsKey = React.useMemo(
        () =>
          (workspaceState.items || [])
            .map((workspace) => normalizePath(workspace.path))
            .filter(Boolean)
            .sort()
            .join('\n'),
        [workspaceState],
      )

      React.useEffect(() => {
        if (typeof resolveRepositories !== 'function') {
          setRepoMap(null)
          return undefined
        }
        const paths = workspacePathsKey ? workspacePathsKey.split('\n').filter(Boolean) : []
        if (paths.length === 0) {
          setRepoMap(null)
          return undefined
        }
        const controller = new AbortController()
        let cancelled = false
        resolveRepositories(paths, controller.signal)
          .then((repositories) => {
            if (cancelled) return
            if (!Array.isArray(repositories)) {
              setRepoMap(null)
              return
            }
            const next = new Map()
            for (const repository of repositories) {
              if (!repository || typeof repository.key !== 'string') continue
              next.set(normalizePath(repository.path), repository)
            }
            setRepoMap(next)
          })
          .catch((error) => {
            if (cancelled || error?.name === 'AbortError') return
            setRepoMap(null)
          })
        return () => {
          cancelled = true
          controller.abort()
        }
      }, [workspacePathsKey, resolveRepositories])

      React.useEffect(() => {
        saveState(state)
      }, [state])

      React.useEffect(
        () => () => {
          if (toastTimer.current) window.clearTimeout(toastTimer.current)
        },
        [],
      )

      const showToast = React.useCallback((message, tone) => {
        if (!message) return
        setToast({ message, tone: tone || 'info', key: Date.now() })
        if (toastTimer.current) window.clearTimeout(toastTimer.current)
        toastTimer.current = window.setTimeout(() => setToast(null), 3000)
      }, [])

      const fail = React.useCallback(
        (error, fallbackKey) => {
          showToast(errorMessage(error) || t(fallbackKey), 'error')
        },
        [showToast, t],
      )

      const currentId = findCurrentId(sessionState)
      const activePanel =
        layoutSnapshot &&
        layoutSnapshot.activePanelId !== null &&
        layoutSnapshot.activePanelId !== undefined
      const currentForView = activePanel ? undefined : currentId
      const view = React.useMemo(
        () =>
          buildView({
            workspaceSnapshot: workspaceState,
            sessionSnapshot: sessionState,
            statusMap,
            state,
            currentId,
            query,
            repoMap,
          }),
        [workspaceState, sessionState, statusMap, state, currentId, query, repoMap],
      )
      const archivedSet = React.useMemo(() => archivedSetOf(workspaceState), [workspaceState])
      const pinnedSet = React.useMemo(
        () =>
          new Set(
            Array.isArray(workspaceState.pinnedSessionIds) ? workspaceState.pinnedSessionIds : [],
          ),
        [workspaceState],
      )
      const currentProject = currentId ? view.projectBySession.get(currentId) : undefined
      const currentProjectKey = currentProject ? currentProject.key : undefined

      const closeMenu = React.useCallback(() => setMenu(null), [])
      const closeDialog = React.useCallback(() => setDialog(null), [])

      const openMenuAtRect = React.useCallback((rect, items, width) => {
        const menuWidth = Math.min(width || 248, Math.max(180, window.innerWidth - 16))
        const estimated = items.reduce(
          (sum, item) => sum + (item.section ? 26 : item.divider ? 9 : 31),
          8,
        )
        const x = Math.min(Math.max(8, rect.right - menuWidth), window.innerWidth - menuWidth - 8)
        let y = rect.bottom + 4
        if (y + estimated > window.innerHeight - 8) y = Math.max(8, rect.top - estimated - 4)
        setMenu({ x, y, width: menuWidth, items, key: Date.now() })
      }, [])

      const toggleSearch = (force) => {
        if (force === true || searchOpen) {
          setSearchOpen(false)
          setQuery('')
          return
        }
        setSearchOpen(true)
      }

      const setMode = (mode) => {
        if (!MODES.includes(mode)) return
        setState((prev) => ({ ...prev, mode }))
      }
      const setOrderBy = (orderBy) => {
        setState((prev) => ({ ...prev, orderBy }))
      }
      const setFilter = (archivedFilter) => {
        setState((prev) => ({ ...prev, archivedFilter }))
      }
      const setActiveOnly = (activeOnly) => {
        setState((prev) => ({ ...prev, activeOnly: Boolean(activeOnly) }))
      }

      const toggleGroup = (key, defaultExpanded) => {
        setState((prev) => toggleCollapsed(prev, key, defaultExpanded))
      }
      const toggleProject = (key, isCurrent) => {
        setState((prev) => toggleCollapsed(prev, `p:${key}`, isCurrent))
      }

      const openSession = (session, fromVariant) => {
        if (archivedSet.has(session.id)) {
          showToast(t('session.archivedNotOpenable'), 'error')
          return
        }
        const project = view.projectBySession.get(session.id)
        if (project) {
          const key = `p:${project.key}`
          setState((prev) => {
            const collapsed = isCollapsed(prev, key, project.key === currentProjectKey)
            let groupCollapsed = false
            if (prev.mode === 'orca' && prev.groups.length > 0) {
              const assigned = assignmentForProject(prev, project)
              const valid = assigned && prev.groups.some((group) => group.id === assigned)
              groupCollapsed = isCollapsed(prev, `g:${valid ? assigned : UNGROUPED}`, true)
            }
            if (fromVariant === 'pinned') {
              if (!collapsed && !groupCollapsed) return prev
              return { ...prev, collapsed: { ...prev.collapsed, [key]: true } }
            }
            if (!collapsed) return prev
            return { ...prev, collapsed: { ...prev.collapsed, [key]: false } }
          })
        }
        openSessionService(session.id)
      }

      const revealSession = (session) => {
        const project = view.projectBySession.get(session.id)
        if (!project) return
        setState((prev) => {
          const collapsed = { ...(prev.collapsed || {}) }
          if (prev.mode === 'orca' && Array.isArray(prev.groups) && prev.groups.length > 0) {
            const assigned = assignmentForProject(prev, project)
            const valid = assigned && prev.groups.some((group) => group.id === assigned)
            collapsed[`g:${valid ? assigned : UNGROUPED}`] = false
          }
          collapsed[`p:${project.key}`] = false
          return { ...prev, collapsed }
        })
        const selector = `.orca-session--project[data-session-id="${session.id}"], .orca-session--tree[data-session-id="${session.id}"]`
        let attempts = 0
        const scrollToRow = () => {
          const row = document.querySelector(selector)
          if (row) {
            row.scrollIntoView({ block: 'nearest' })
            return
          }
          attempts += 1
          if (attempts < 30) window.setTimeout(scrollToRow, 100)
        }
        window.setTimeout(scrollToRow, 50)
      }

      const pin = async (session) => {
        try {
          await pinSessionService(session.id)
          showToast(t('session.pinned', { name: sessionLabel(session, currentId, t) }))
        } catch (error) {
          fail(error, 'toast.pinFailed')
        }
      }
      const unpin = async (session) => {
        try {
          await unpinSessionService(session.id)
          showToast(t('session.unpinned', { name: sessionLabel(session, currentId, t) }))
        } catch (error) {
          fail(error, 'toast.pinFailed')
        }
      }
      const archiveById = async (sessionId, sessionTitle, stopActivity) => {
        try {
          await archiveSessionService(sessionId, { stopActivity: Boolean(stopActivity) })
          showToast(t('session.archived', { name: sessionTitle }))
        } catch (error) {
          if (!stopActivity && isActiveWorkRefusal(error)) {
            setDialog({
              key: `d${Date.now()}`,
              kind: 'archive-confirm',
              sessionId,
              sessionTitle,
              title: t('session.stopArchiveTitle'),
              description: t('session.stopArchiveDesc', { name: sessionTitle }),
              confirm: t('session.stopArchive'),
              danger: true,
            })
            return
          }
          fail(error, 'toast.archiveFailed')
        }
      }
      const archive = (session) => {
        archiveById(session.id, sessionLabel(session, currentId, t), false)
      }
      const unarchive = async (session) => {
        try {
          await unarchiveSessionService(session.id)
          showToast(t('session.unarchived', { name: sessionLabel(session, currentId, t) }))
        } catch (error) {
          fail(error, 'toast.archiveFailed')
        }
      }
      const copy = async (session) => {
        try {
          await navigator.clipboard.writeText(session.id)
          showToast(t('session.copied'))
        } catch {
          showToast(t('session.copyFailed'), 'error')
        }
      }

      const startSession = (project) => {
        if (!project.workspaceId) return
        startSessionService(project.workspaceId)
      }
      const startSessionIn = async (worktree) => {
        if (!worktree) return
        try {
          if (worktree.workspaceId) {
            startSessionService(worktree.workspaceId)
            return
          }
          const path = normalizePath(worktree.path)
          const existing = (workspaceState.items || []).find(
            (workspace) => normalizePath(workspace.path) === path,
          )
          if (existing?.workspaceId) {
            startSessionService(existing.workspaceId)
            return
          }
          const created = await createWorkspace(worktree.path)
          if (!created?.workspaceId) {
            showToast(t('toast.workspaceFailed'), 'error')
            return
          }
          startSessionService(created.workspaceId)
        } catch (error) {
          fail(error, 'toast.workspaceFailed')
        }
      }
      const openWorkspace = (project) => {
        if (!project.workspaceId) return
        openWorkspaceService(project.workspaceId)
      }

      const addWorkspace = async (groupId) => {
        try {
          const path = await pickDirectory()
          if (!path) return
          const workspace = await createWorkspace(path)
          if (!workspace?.path) return
          const key = normalizePath(workspace.path)
          if (groupId) {
            setState((prev) => {
              const target = view.groups.find((group) => group.id === groupId)
              const keys = target ? target.projects.map((project) => project.key) : []
              return moveProjectInOrder(prev, key, groupId, keys, null, 'after')
            })
          }
          showToast(t('project.added', { name: workspace.title || baseName(workspace.path) }))
        } catch (error) {
          fail(error, 'toast.workspaceFailed')
        }
      }

      const createGroupNow = (name, assignPath) => {
        const id = nextGroupId()
        setState((prev) => {
          let next = createGroup(prev, id, name)
          if (assignPath) {
            const project = view.projects.find((entry) => entry.key === assignPath)
            next = moveProjectInOrder(next, assignPath, id, [], null, 'after', project?.memberPaths)
          }
          return next
        })
        showToast(t('group.created', { name }))
      }
      const renameGroupNow = (id, name) => {
        setState((prev) => renameGroup(prev, id, name))
      }
      const deleteGroupNow = (id) => {
        setState((prev) => deleteGroup(prev, id))
        showToast(t('group.deleted'))
      }
      const moveProject = (path, groupId, orderedKeys, anchorKey, position) => {
        if (anchorKey && path === anchorKey) return
        const project = view.projects.find((entry) => entry.key === path)
        const previousGroup = project ? project.groupId : null
        const nextGroup = groupId || null
        setState((prev) =>
          moveProjectInOrder(
            prev,
            path,
            groupId,
            orderedKeys,
            anchorKey,
            position,
            project?.memberPaths,
          ),
        )
        if (project && previousGroup !== nextGroup) {
          const groupName = groupId
            ? state.groups.find((group) => group.id === groupId)?.name || t('group.ungrouped')
            : t('group.ungrouped')
          showToast(t('group.moved', { name: project.title, group: groupName }))
        }
      }
      const moveProjectToGroup = (path, groupId) => {
        const target = groupId
          ? view.groups.find((group) => group.id === groupId)?.projects || []
          : view.ungroupedProjects
        const keys = target.map((project) => project.key).filter((key) => key !== path)
        moveProject(path, groupId, keys, null, 'after')
      }
      const moveSession = (projectKey, sessionId, orderedIds, anchorId, position) => {
        if (sessionId === anchorId) return
        setState((prev) =>
          moveSessionInOrder(prev, projectKey, sessionId, orderedIds, anchorId, position),
        )
      }

      const drag = {
        start(event, project) {
          if (!event) return
          dragPayload = { kind: 'project', path: project.key }
          try {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/orca-project', project.key)
          } catch {
            // Some browsers refuse custom drag data; the in-memory payload still works.
          }
        },
        startSession(event, session, project) {
          if (!event) return
          dragPayload = { kind: 'session', id: session.id, projectKey: project.key }
          try {
            event.dataTransfer.effectAllowed = 'move'
            event.dataTransfer.setData('text/orca-session', session.id)
          } catch {
            // The in-memory payload remains the source of truth.
          }
        },
        over(event, project) {
          if (dragPayload?.kind !== 'project') return
          if (dragPayload.path === project.key) return
          event.preventDefault()
          event.stopPropagation()
          const row = event.currentTarget.parentElement || event.currentTarget
          const rect = row.getBoundingClientRect()
          const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
          setDropIndicator(row, position)
        },
        drop(event, project, groupId, siblings) {
          if (dragPayload?.kind !== 'project') return
          stopEvent(event)
          const rect = event.currentTarget.getBoundingClientRect()
          const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
          const path = dragPayload.path
          dragPayload = null
          clearDropIndicators()
          if (path && path !== project.key)
            moveProject(path, groupId, siblings || [], project.key, position)
        },
        dropOnGroup(event, groupId, projectKeys) {
          if (dragPayload?.kind !== 'project') return
          stopEvent(event)
          const path = dragPayload.path
          dragPayload = null
          clearDropIndicators()
          if (path) moveProject(path, groupId, projectKeys || [], null, 'after')
        },
        overSession(event, session, project) {
          if (dragPayload?.kind !== 'session') return
          if (dragPayload.projectKey !== project.key) return
          if (dragPayload.id === session.id) return
          event.preventDefault()
          event.stopPropagation()
          const row = event.currentTarget.parentElement
          if (!row) return
          const rect = row.getBoundingClientRect()
          const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
          setDropIndicator(row, position)
        },
        dropSession(event, session, project, orderedIds) {
          if (dragPayload?.kind !== 'session') return
          if (dragPayload.projectKey !== project.key) return
          stopEvent(event)
          const row = event.currentTarget.parentElement
          const rect = row ? row.getBoundingClientRect() : { top: 0, height: 0 }
          const position = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after'
          const id = dragPayload.id
          dragPayload = null
          clearDropIndicators()
          if (id && id !== session.id)
            moveSession(project.key, id, orderedIds || [], session.id, position)
        },
        leave(event) {
          if (!event?.currentTarget) return
          if (event.currentTarget.contains(event.relatedTarget)) return
          if (event.currentTarget.dataset.orcaDrop) delete event.currentTarget.dataset.orcaDrop
        },
        end() {
          dragPayload = null
          clearDropIndicators()
        },
      }

      const openSessionMenu = (event, session, pinned, archived, variant) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const items = []
        if (!archived) {
          items.push({
            label: pinned ? t('pinned.unpin') : t('pinned.pin'),
            icon: pinned ? 'pinFilled' : 'pin',
            onSelect: () => (pinned ? unpin(session) : pin(session)),
          })
        }
        if (variant === 'pinned') {
          items.push({
            label: t('session.reveal'),
            icon: 'folderOpen',
            onSelect: () => revealSession(session),
          })
        }
        items.push({
          label: t('session.open'),
          icon: 'open',
          onSelect: () => openSession(session, variant),
        })
        items.push({ divider: true })
        items.push({ label: t('session.copyId'), icon: 'copy', onSelect: () => copy(session) })
        items.push(
          archived
            ? { label: t('session.unarchive'), icon: 'restore', onSelect: () => unarchive(session) }
            : {
                label: t('session.archive'),
                icon: 'archive',
                danger: true,
                onSelect: () => archive(session),
              },
        )
        openMenuAtRect(rect, items)
      }

      const openMoveMenu = (rect, project) => {
        const current = project.groupId
        const items = [
          { section: t('group.drop') },
          {
            label: t('group.ungrouped'),
            checked: !current,
            onSelect: () => moveProjectToGroup(project.key, null),
          },
          ...state.groups.map((group) => ({
            label: group.name,
            checked: current === group.id,
            onSelect: () => moveProjectToGroup(project.key, group.id),
          })),
          { divider: true },
          {
            label: t('action.newGroup'),
            icon: 'groupAdd',
            onSelect: () => openNewGroupDialog(project.key),
          },
        ]
        openMenuAtRect(rect, items)
      }

      const openProjectMenu = (event, project) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const worktrees = Array.isArray(project.worktrees) ? project.worktrees : []
        const items = []
        if (worktrees.length > 1) {
          items.push({ section: t('project.worktreesSection') })
          for (const worktree of worktrees) {
            items.push({
              label: t('project.newSessionIn', {
                name: worktree.label === 'main' ? t('project.worktreeMain') : worktree.label,
              }),
              icon: 'chat',
              onSelect: () => startSessionIn(worktree),
            })
          }
        } else {
          items.push({
            label: t('project.newSession'),
            icon: 'chat',
            onSelect: () => startSession(project),
          })
        }
        items.push(
          { label: t('project.open'), icon: 'open', onSelect: () => openWorkspace(project) },
          { divider: true },
          {
            label: t('project.move'),
            icon: 'groupAdd',
            onSelect: () => openMoveMenu(rect, project),
          },
          {
            label: t('project.rename'),
            icon: 'edit',
            onSelect: () => openRenameProjectDialog(project),
          },
          {
            label: t('project.delete'),
            icon: 'trash',
            danger: true,
            onSelect: () => openDeleteProjectDialog(project),
          },
        )
        openMenuAtRect(rect, items)
      }

      const openGroupMenu = (event, group) => {
        const rect = event.currentTarget.getBoundingClientRect()
        openMenuAtRect(rect, [
          { label: t('group.rename'), icon: 'edit', onSelect: () => openRenameGroupDialog(group) },
          { label: t('action.addProject'), icon: 'plus', onSelect: () => addWorkspace(group.id) },
          { divider: true },
          {
            label: t('group.delete'),
            icon: 'trash',
            danger: true,
            onSelect: () => openDeleteGroupDialog(group),
          },
        ])
      }

      const openAddMenu = (event, groupId) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const items = [
          {
            label: state.mode === 'orca' ? t('action.addProject') : t('action.addWorkspace'),
            icon: 'plus',
            onSelect: () => addWorkspace(groupId),
          },
        ]
        if (state.mode === 'orca') {
          items.push({
            label: t('action.newGroup'),
            icon: 'groupAdd',
            onSelect: () => openNewGroupDialog(),
          })
        }
        openMenuAtRect(rect, items)
      }

      const openViewMenu = (event) => {
        const rect = event.currentTarget.getBoundingClientRect()
        const items = [
          { section: t('section.groupBy') },
          {
            label: t('group.workspace'),
            checked: state.mode === 'workspace',
            onSelect: () => setMode('workspace'),
          },
          {
            label: t('group.workspaceTree'),
            checked: state.mode === 'workspace-tree',
            onSelect: () => setMode('workspace-tree'),
          },
          {
            label: t('group.flat'),
            checked: state.mode === 'flat',
            onSelect: () => setMode('flat'),
          },
          {
            label: t('group.orca'),
            checked: state.mode === 'orca',
            badge: t('new'),
            onSelect: () => setMode('orca'),
          },
          { divider: true },
          { section: t('order.label') },
          {
            label: t('order.manual'),
            checked: state.orderBy === 'manual',
            onSelect: () => setOrderBy('manual'),
          },
          {
            label: t('order.updated'),
            checked: state.orderBy === 'updated',
            onSelect: () => setOrderBy('updated'),
          },
          { divider: true },
          { section: t('filter.label') },
          {
            label: t('filter.hide'),
            checked: state.archivedFilter === 'hide',
            onSelect: () => setFilter('hide'),
          },
          {
            label: t('filter.all'),
            checked: state.archivedFilter === 'all',
            onSelect: () => setFilter('all'),
          },
          {
            label: t('filter.only'),
            checked: state.archivedFilter === 'only',
            onSelect: () => setFilter('only'),
          },
        ]
        if (state.mode === 'orca') {
          items.push({ divider: true })
          items.push({
            label: t('filter.activeOnly'),
            icon: 'dot',
            checked: state.activeOnly === true,
            onSelect: () => setActiveOnly(!state.activeOnly),
          })
          items.push({ divider: true })
          items.push({
            label: t('action.newGroup'),
            icon: 'groupAdd',
            onSelect: () => openNewGroupDialog(),
          })
        }
        openMenuAtRect(rect, items, 228)
      }

      const openNewGroupDialog = (assignPath) => {
        setDialog({
          key: `d${Date.now()}`,
          kind: 'group-new',
          assignPath,
          title: t('action.newGroup'),
          input: true,
          value: '',
          placeholder: t('group.namePlaceholder'),
          confirm: t('dialog.create'),
        })
      }
      const openRenameGroupDialog = (group) => {
        setDialog({
          key: `d${Date.now()}`,
          kind: 'group-rename',
          id: group.id,
          title: t('group.rename'),
          input: true,
          value: group.name,
          placeholder: t('group.name'),
          confirm: t('dialog.save'),
        })
      }
      const openDeleteGroupDialog = (group) => {
        setDialog({
          key: `d${Date.now()}`,
          kind: 'group-delete',
          id: group.id,
          title: t('group.delete'),
          description: t('group.deleteConfirm', { name: group.name }),
          confirm: t('dialog.delete'),
          danger: true,
        })
      }
      const openRenameProjectDialog = (project) => {
        setDialog({
          key: `d${Date.now()}`,
          kind: 'project-rename',
          projectKey: project.key,
          title: t('project.rename'),
          input: true,
          value: project.title || '',
          placeholder: t('project.renamePlaceholder'),
          confirm: t('dialog.save'),
        })
      }
      const openDeleteProjectDialog = (project) => {
        const workspaceIds = Array.isArray(project.workspaceIds)
          ? project.workspaceIds.filter(Boolean)
          : project.workspaceId
            ? [project.workspaceId]
            : []
        const many = workspaceIds.length > 1
        setDialog({
          key: `d${Date.now()}`,
          kind: 'project-delete',
          workspaceIds,
          title: t('project.delete'),
          description: many
            ? t('project.deleteConfirmMany', {
                name: project.title || t('project.ungrouped'),
                n: workspaceIds.length,
              })
            : t('project.deleteConfirm', {
                name: project.title || t('project.ungrouped'),
              }),
          confirm: t('dialog.delete'),
          danger: true,
        })
      }

      const confirmDialog = (value) => {
        const current = dialog
        if (!current) return
        setDialog(null)
        if (current.kind === 'group-new') {
          createGroupNow(value, current.assignPath)
        } else if (current.kind === 'group-rename') {
          renameGroupNow(current.id, value)
        } else if (current.kind === 'group-delete') {
          deleteGroupNow(current.id)
        } else if (current.kind === 'project-rename') {
          setState((prev) => renameProject(prev, current.projectKey, value))
        } else if (current.kind === 'project-delete') {
          const workspaceIds = Array.isArray(current.workspaceIds)
            ? current.workspaceIds
            : current.workspaceId
              ? [current.workspaceId]
              : []
          Promise.all(workspaceIds.map((workspaceId) => deleteWorkspace(workspaceId))).catch(
            (error) => fail(error, 'toast.projectFailed'),
          )
        } else if (current.kind === 'archive-confirm') {
          archiveById(current.sessionId, current.sessionTitle, true)
        }
      }

      const actions = {
        open: openSession,
        pin,
        unpin,
        archive,
        unarchive,
        copy,
        menu: openSessionMenu,
        startSession,
        openWorkspace,
        projectMenu: openProjectMenu,
        groupMenu: openGroupMenu,
        addMenu: openAddMenu,
        toggleGroup,
        toggleProject,
        setActiveOnly,
        moveProject,
        moveSession,
      }

      if (wide === false) return null

      const count = state.mode === 'orca' ? view.counts.projects : view.counts.sessions

      const content = h(
        'div',
        { ref: searchRoot, className: 'orca-root', 'data-mode': state.mode },
        h(Header, {
          t,
          mode: state.mode,
          query,
          searchOpen,
          count,
          onSearchToggle: toggleSearch,
          onQuery: setQuery,
          onViewMenu: openViewMenu,
          onAddMenu: (event) => openAddMenu(event, null),
        }),
        h(
          'div',
          { className: 'orca-scroll' },
          query.trim()
            ? h(SearchView, {
                view,
                t,
                actions,
                currentId: currentForView,
                archivedSet,
                query,
                onClear: () => {
                  setQuery('')
                },
              })
            : state.mode === 'orca'
              ? h(OrcaView, {
                  view,
                  state,
                  t,
                  actions,
                  currentProjectKey,
                  currentId: currentForView,
                  pinnedSet,
                  archivedSet,
                  drag,
                })
              : state.mode === 'workspace'
                ? h(WorkspaceView, {
                    view,
                    state,
                    t,
                    actions,
                    currentProjectKey,
                    currentId: currentForView,
                    pinnedSet,
                    archivedSet,
                  })
                : state.mode === 'workspace-tree'
                  ? h(TreeView, {
                      view,
                      state,
                      t,
                      actions,
                      currentId: currentForView,
                      pinnedSet,
                      archivedSet,
                    })
                  : h(FlatView, {
                      view,
                      t,
                      actions,
                      currentId: currentForView,
                      archivedSet,
                    }),
        ),
        menu ? h(MenuLayer, { key: menu.key, menu, onClose: closeMenu }) : null,
        dialog
          ? h(DialogLayer, {
              key: dialog.key,
              dialog,
              t,
              onCancel: closeDialog,
              onConfirm: confirmDialog,
            })
          : null,
        toast ? h(ToastLayer, { toast }) : null,
      )

      return h(
        SessionStatusContext.Provider,
        { value: statusMap },
        h(WorkspacePathContext.Provider, { value: view.workspaceBySession }, content),
      )
    }

    const ORCA_CSS = `
      .orca-root,
      .orca-root *,
      .orca-root *::before,
      .orca-root *::after {
        box-sizing: border-box;
      }
      .orca-root {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
        height: 100%;
        color: var(--dsw-alias-label-primary);
        font-size: 14px;
        line-height: 1.4;
      }
      .orca-header {
        flex: none;
        padding: 2px 2px 0;
      }
      .orca-title-row {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        min-width: 0;
      }
      .orca-title {
        margin-left: 5px;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .orca-head-actions {
        display: flex;
        align-items: center;
        gap: 1px;
        margin-left: auto;
      }
      .orca-icon-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        padding: 0;
        border: 0;
        border-radius: var(--dsw-radius-sm, 6px);
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        cursor: pointer;
        flex: none;
      }
      .orca-icon-button:hover {
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
        color: var(--dsw-alias-label-primary);
      }
      .orca-icon-button.is-active {
        color: var(--dsw-alias-brand-primary);
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 11%, transparent);
      }
      .orca-icon-button.is-danger {
        color: var(--dsw-alias-state-error-primary);
      }
      .orca-icon-button:disabled {
        opacity: 0.35;
        cursor: default;
      }
      .orca-icon-button:focus-visible,
      .orca-project-head:focus-visible,
      .orca-group-head:focus-visible,
      .orca-session-main:focus-visible,
      .orca-text-button:focus-visible,
      .orca-menu-item:focus-visible,
      .orca-button:focus-visible {
        outline: 1px solid var(--dsw-alias-brand-primary);
        outline-offset: -1px;
      }
      .orca-search-field {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        margin: 3px 0 6px;
        padding: 0 4px 0 9px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: var(--dsw-radius-sm, 6px);
        background: color-mix(in srgb, var(--dsw-alias-bg-base) 45%, transparent);
      }
      .orca-search-field:focus-within {
        border-color: var(--dsw-alias-brand-primary);
      }
      .orca-search-icon {
        flex: none;
        color: var(--dsw-alias-label-secondary);
      }
      .orca-search-field input {
        flex: 1;
        min-width: 0;
        height: 100%;
        padding: 0;
        border: 0;
        outline: 0;
        background: transparent;
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 13px;
      }
      .orca-search-field input::placeholder {
        color: var(--dsw-alias-label-secondary);
      }
      .orca-scroll {
        flex: 1;
        min-height: 0;
        overflow-x: hidden;
        overflow-y: auto;
        padding: 4px 6px 16px;
        scrollbar-width: thin;
        scrollbar-color: var(--dsw-alias-scrollbar-bg-l2, transparent) transparent;
      }
      .orca-view {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .orca-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 17px;
        height: 17px;
        padding: 0 5px;
        border-radius: 999px;
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent);
        color: var(--dsw-alias-label-secondary);
        font-size: 10px;
        font-weight: 500;
        line-height: 1;
        flex: none;
      }
      .orca-project-worktrees {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        flex: none;
        height: 16px;
        padding: 0 4px;
        border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 24%, transparent);
        border-radius: 999px;
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 7%, transparent);
        color: var(--dsw-alias-brand-primary);
        font-size: 10px;
        font-weight: 500;
        line-height: 1;
      }
      .orca-chevron {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 13px;
        height: 13px;
        color: var(--dsw-alias-label-secondary);
        transform: rotate(0deg);
        transition: transform 120ms ease;
        flex: none;
      }
      .orca-chevron.is-open {
        transform: rotate(90deg);
      }
      .orca-pinned-group {
        margin: 2px 0 10px;
        padding: 4px;
        border: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 24%, var(--dsw-alias-border-l1));
        border-radius: 11px;
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 6%, transparent);
      }
      .orca-pinned-head {
        height: 30px;
        padding: 0 6px;
        border-bottom: 1px solid color-mix(in srgb, var(--dsw-alias-brand-primary) 14%, transparent);
        border-radius: 7px 7px 0 0;
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 5%, transparent);
      }
      .orca-pinned-group.is-collapsed .orca-pinned-head {
        border-bottom-color: transparent;
      }
      .orca-pinned-icon {
        color: var(--dsw-alias-brand-primary);
      }
      .orca-pinned-body {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 4px 1px 1px;
      }
      .orca-group {
        border-radius: 8px;
      }
      .orca-group + .orca-group {
        margin-top: 8px;
      }
      .orca-group--loose {
        margin-top: 8px;
      }
      .orca-group-row {
        position: relative;
      }
      .orca-group-head {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 30px;
        min-width: 0;
        padding: 0 8px;
        border: 1px solid transparent;
        border-radius: 7px;
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent);
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.02em;
        cursor: pointer;
        user-select: none;
      }
      .orca-group-head:hover {
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
        color: var(--dsw-alias-label-primary);
      }
      .orca-group-icon {
        flex: none;
        opacity: 0.85;
      }
      .orca-group-title {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .orca-group-actions {
        position: absolute;
        top: 3px;
        right: 4px;
        display: none;
        align-items: center;
        background: var(--dsw-specific-sidebar-fill);
        border-radius: var(--dsw-radius-sm, 6px);
      }
      .orca-group-row:hover .orca-group-actions,
      .orca-group-row:focus-within .orca-group-actions {
        display: flex;
      }
      .orca-group-body {
        display: flex;
        flex-direction: column;
        gap: 1px;
        margin: 2px 0 0 10px;
        padding: 2px 0 4px 8px;
        border-left: 1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 10%, transparent);
      }
      .orca-group--ungrouped {
        margin-top: 10px;
      }
      .orca-group--ungrouped .orca-group-head {
        height: 32px;
        padding-top: 3px;
        border-top: 1px solid var(--dsw-alias-border-l1);
        border-radius: 0;
        background: transparent;
      }
      .orca-group--ungrouped .orca-group-head:hover {
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 5%, transparent);
      }
      .orca-project {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .orca-project + .orca-project {
        margin-top: 1px;
      }
      .orca-project-row {
        position: relative;
      }
      .orca-project-head {
        display: flex;
        align-items: center;
        gap: 6px;
        height: 32px;
        padding: 0 56px 0 4px;
        border-radius: var(--dsw-radius-sm, 6px);
        color: var(--dsw-alias-label-primary);
        font-size: 14px;
        font-weight: 500;
        line-height: 20px;
        cursor: pointer;
        user-select: none;
      }
      .orca-project-head:hover {
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent);
      }
      .orca-project-folder {
        flex: none;
        color: var(--dsw-alias-label-secondary);
      }
      .orca-project-title {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .orca-project-actions {
        position: absolute;
        top: 3px;
        right: 4px;
        display: none;
        align-items: center;
        gap: 1px;
        background: var(--dsw-specific-sidebar-fill);
        border-radius: var(--dsw-radius-sm, 6px);
      }
      .orca-project-row:hover .orca-project-actions,
      .orca-project-row:focus-within .orca-project-actions {
        display: flex;
      }
      .orca-project-body {
        display: flex;
        flex-direction: column;
        gap: 1px;
        padding: 1px 0 2px;
      }
      .orca-project-body.is-guided {
        margin-left: 14px;
        padding: 2px 0 4px 6px;
        border-left: 1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
      }
      .orca-session {
        position: relative;
        display: flex;
        align-items: stretch;
        min-width: 0;
        min-height: 50px;
        margin: 2px 0;
        border: 1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 8%, transparent);
        border-radius: 8px;
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 2.5%, transparent);
      }
      .orca-session:hover {
        border-color: color-mix(in srgb, var(--dsw-alias-label-primary) 14%, transparent);
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 4.5%, transparent);
      }
      .orca-session.is-current {
        border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 11%, transparent);
        box-shadow: inset 2px 0 0 var(--dsw-alias-brand-primary);
      }
      .orca-session-main {
        display: flex;
        flex-direction: column;
        justify-content: center;
        gap: 3px;
        min-width: 0;
        width: 100%;
        padding: 5px 8px;
        border-radius: 7px;
        color: var(--dsw-alias-label-primary);
        font-size: 14px;
        line-height: 20px;
        cursor: pointer;
        user-select: none;
      }
      .orca-session-line {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        padding-right: 52px;
      }
      .orca-session-subline {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        padding-left: 15px;
        overflow: hidden;
      }
      .orca-session-title {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .orca-session-pin {
        flex: none;
        color: var(--dsw-alias-brand-primary);
      }
      .orca-session-project {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        flex: none;
        max-width: 46%;
        height: 16px;
        padding: 0 5px;
        border: 1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 11%, transparent);
        border-radius: 999px;
        overflow: hidden;
        color: var(--dsw-alias-label-secondary);
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent);
        font-size: 10px;
        line-height: 14px;
      }
      .orca-session-project-icon {
        flex: none;
      }
      .orca-session-meta {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: inherit;
        font-size: 10px;
      }
      .orca-worktree {
        display: inline-flex;
        align-items: center;
        flex: none;
        max-width: 92px;
        height: 16px;
        padding: 0 5px;
        border: 1px solid color-mix(in srgb, var(--dsw-alias-label-primary) 12%, transparent);
        border-radius: 999px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: var(--dsw-alias-label-secondary);
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 4%, transparent);
        font-size: 10px;
        line-height: 14px;
      }
      .orca-worktree.is-main {
        color: var(--dsw-alias-label-secondary);
      }
      .orca-worktree:not(.is-main) {
        color: var(--dsw-alias-brand-primary);
        border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 26%, transparent);
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 8%, transparent);
      }
      .orca-session-hint {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        flex: none;
        height: 16px;
        padding: 0 4px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 999px;
        color: var(--dsw-alias-label-secondary);
        font-size: 10px;
        line-height: 1;
      }
      .orca-session-hint.is-archived {
        color: var(--dsw-alias-state-warn-primary);
        border-color: color-mix(in srgb, var(--dsw-alias-state-warn-primary) 35%, transparent);
      }
      .orca-session.is-pinned-ref {
        opacity: 0.55;
      }
      .orca-session.is-archived {
        opacity: 0.45;
      }
      .orca-session-actions {
        position: absolute;
        top: 5px;
        right: 4px;
        display: none;
        align-items: center;
        gap: 1px;
        background: var(--dsw-specific-sidebar-fill);
        border-radius: var(--dsw-radius-sm, 6px);
      }
      .orca-project-actions .orca-icon-button,
      .orca-session-actions .orca-icon-button,
      .orca-group-actions .orca-icon-button {
        width: 24px;
        height: 24px;
      }
      .orca-session:hover .orca-session-actions,
      .orca-session:focus-within .orca-session-actions {
        display: flex;
      }
      .orca-session:hover .orca-session-hint,
      .orca-session:focus-within .orca-session-hint {
        visibility: hidden;
      }
      .orca-status-dot {
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: var(--dsw-alias-state-idle-primary);
        opacity: 0.5;
        flex: none;
      }
      .orca-status-dot.is-completed {
        background: var(--dsw-alias-state-success-primary);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--dsw-alias-state-success-primary) 16%, transparent);
        opacity: 1;
      }
      .orca-status-dot.is-pending {
        background: var(--dsw-alias-state-warn-primary);
        opacity: 1;
      }
      .orca-status-dot.is-archived {
        background: var(--dsw-alias-state-idle-primary);
        opacity: 0.35;
      }
      .orca-spinner {
        width: 12px;
        height: 12px;
        border: 2px solid color-mix(in srgb, var(--dsw-alias-state-warn-primary) 22%, transparent);
        border-top-color: var(--dsw-alias-state-warn-primary);
        border-radius: 50%;
        animation: orca-spin 0.85s linear infinite;
        flex: none;
      }
      @keyframes orca-spin {
        to { transform: rotate(360deg); }
      }
      .orca-empty-inline {
        padding: 8px 12px;
        color: var(--dsw-alias-label-secondary);
        font-size: 12px;
        line-height: 1.5;
      }
      .orca-show-more {
        align-self: flex-start;
        margin: 1px 0 3px;
        padding-top: 3px;
        padding-right: 8px;
        padding-bottom: 3px;
        border: 0;
        border-radius: var(--dsw-radius-sm, 6px);
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font: inherit;
        font-size: 12px;
        text-align: left;
        cursor: pointer;
      }
      .orca-show-more:hover {
        color: var(--dsw-alias-label-primary);
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
      }
      .orca-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 28px 12px;
        text-align: center;
        color: var(--dsw-alias-label-secondary);
      }
      .orca-empty-glyph {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        margin-bottom: 2px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 50%;
        color: var(--dsw-alias-label-secondary);
      }
      .orca-empty-title {
        color: var(--dsw-alias-label-primary);
        font-size: 14px;
        font-weight: 500;
      }
      .orca-empty-hint {
        max-width: 190px;
        font-size: 12px;
        line-height: 1.5;
      }
      .orca-text-button {
        margin-top: 2px;
        padding: 5px 9px;
        border: 0;
        border-radius: var(--dsw-radius-sm, 6px);
        background: transparent;
        color: var(--dsw-alias-brand-primary);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .orca-text-button:hover {
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, transparent);
      }
      .orca-menu {
        position: fixed;
        z-index: 95;
        max-height: 72vh;
        overflow-y: auto;
        padding: 4px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 10px;
        background: var(--dsw-alias-bg-layer-1);
        box-shadow: 0 10px 30px color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent);
        font-size: 13px;
        scrollbar-width: thin;
      }
      .orca-menu-section {
        padding: 8px 8px 4px;
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
        font-weight: 600;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }
      .orca-menu-item {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        height: 32px;
        padding: 0 8px;
        border: 0;
        border-radius: var(--dsw-radius-sm, 6px);
        background: transparent;
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 13px;
        text-align: left;
        cursor: pointer;
      }
      .orca-menu-item:hover {
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 7%, transparent);
      }
      .orca-menu-item.is-danger {
        color: var(--dsw-alias-state-error-primary);
      }
      .orca-menu-item.is-disabled {
        opacity: 0.4;
        cursor: default;
      }
      .orca-menu-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 15px;
        flex: none;
        color: var(--dsw-alias-label-secondary);
      }
      .orca-menu-item.is-danger .orca-menu-icon {
        color: inherit;
      }
      .orca-menu-label {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .orca-menu-badge {
        flex: none;
        padding: 0 4px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 999px;
        color: var(--dsw-alias-label-secondary);
        font-size: 9px;
        line-height: 14px;
        text-transform: none;
        letter-spacing: 0;
      }
      .orca-menu-check {
        flex: none;
        color: var(--dsw-alias-brand-primary);
      }
      .orca-menu-divider {
        height: 1px;
        margin: 4px 2px;
        background: var(--dsw-alias-border-l1);
      }
      .orca-dialog-overlay {
        position: fixed;
        inset: 0;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 24%, transparent);
      }
      .orca-dialog {
        width: min(340px, calc(100vw - 32px));
        padding: 16px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 12px;
        background: var(--dsw-alias-bg-layer-1);
        box-shadow: 0 14px 40px color-mix(in srgb, var(--dsw-alias-label-primary) 22%, transparent);
      }
      .orca-dialog-title {
        color: var(--dsw-alias-label-primary);
        font-size: 14px;
        font-weight: 600;
        line-height: 1.4;
      }
      .orca-dialog-description {
        margin-top: 8px;
        color: var(--dsw-alias-label-secondary);
        font-size: 13px;
        line-height: 1.55;
      }
      .orca-dialog-input {
        width: 100%;
        height: 34px;
        margin-top: 13px;
        padding: 0 9px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: var(--dsw-radius-sm, 6px);
        outline: 0;
        background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 14px;
      }
      .orca-dialog-input:focus {
        border-color: var(--dsw-alias-brand-primary);
      }
      .orca-dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
      }
      .orca-button {
        height: 30px;
        padding: 0 13px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: var(--dsw-radius-sm, 6px);
        background: transparent;
        color: var(--dsw-alias-label-primary);
        font: inherit;
        font-size: 13px;
        cursor: pointer;
      }
      .orca-button:hover {
        background: color-mix(in srgb, var(--dsw-alias-label-primary) 6%, transparent);
      }
      .orca-button--primary {
        border-color: color-mix(in srgb, var(--dsw-alias-brand-primary) 35%, transparent);
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 12%, transparent);
        color: var(--dsw-alias-brand-primary);
      }
      .orca-button--danger {
        border-color: color-mix(in srgb, var(--dsw-alias-state-error-primary) 35%, transparent);
        background: color-mix(in srgb, var(--dsw-alias-state-error-primary) 10%, transparent);
        color: var(--dsw-alias-state-error-primary);
      }
      .orca-button:disabled {
        opacity: 0.45;
        cursor: default;
      }
      .orca-toast {
        position: fixed;
        left: 12px;
        bottom: 14px;
        z-index: 110;
        display: flex;
        align-items: flex-start;
        gap: 7px;
        width: 244px;
        max-width: calc(100vw - 24px);
        padding: 9px 10px;
        border: 1px solid var(--dsw-alias-border-l1);
        border-radius: 8px;
        background: var(--dsw-alias-bg-layer-1);
        box-shadow: 0 8px 24px color-mix(in srgb, var(--dsw-alias-label-primary) 18%, transparent);
        color: var(--dsw-alias-label-primary);
        font-size: 12px;
        line-height: 1.45;
      }
      .orca-toast.is-error {
        color: var(--dsw-alias-state-error-primary);
      }
      .orca-project-row[data-orca-drop="before"]::before,
      .orca-project-row[data-orca-drop="after"]::after,
      .orca-session[data-orca-drop="before"]::before,
      .orca-session[data-orca-drop="after"]::after {
        content: "";
        position: absolute;
        left: 6px;
        right: 6px;
        z-index: 2;
        height: 2px;
        border-radius: 2px;
        background: var(--dsw-alias-brand-primary);
        pointer-events: none;
      }
      .orca-project-row[data-orca-drop="before"]::before,
      .orca-session[data-orca-drop="before"]::before {
        top: -1px;
      }
      .orca-project-row[data-orca-drop="after"]::after,
      .orca-session[data-orca-drop="after"]::after {
        bottom: -1px;
      }
      [data-orca-drop="group"] {
        background: color-mix(in srgb, var(--dsw-alias-brand-primary) 9%, transparent);
        box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--dsw-alias-brand-primary) 45%, transparent);
      }
      @media (hover: none) {
        .orca-project-actions,
        .orca-session-actions,
        .orca-group-actions {
          display: flex;
        }
        .orca-session-hint {
          display: none;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .orca-chevron,
        .orca-spinner {
          transition: none;
          animation: none;
        }
      }
    `

    function installStyles() {
      const existing = document.querySelector('style[data-orca-projects="styles"]')
      if (existing?.parentNode) existing.parentNode.removeChild(existing)
      const tag = document.createElement('style')
      tag.dataset.orcaProjects = 'styles'
      tag.textContent = ORCA_CSS
      document.head.appendChild(tag)
      return () => {
        if (tag.parentNode) tag.parentNode.removeChild(tag)
      }
    }

    const inject = [
      'slots',
      'locale',
      'workspaces',
      'sessions',
      'uiSession',
      'uiWorkspace',
      'layout',
      'connection',
    ]

    function apply(ctx) {
      const workspaces = ctx.get('workspaces')
      const sessions = ctx.get('sessions')
      const uiSession = ctx.get('uiSession')
      const uiWorkspace = ctx.get('uiWorkspace')
      const layout = ctx.get('layout')

      const workspaceSource = {
        getSnapshot: () => workspaces.list.getSnapshot(),
        subscribe: (listener) => workspaces.list.subscribe(listener),
      }
      const sessionSource = {
        getSnapshot: () => sessions.list.getSnapshot(),
        subscribe: (listener) => sessions.list.subscribe(listener),
      }
      const sessionStatusSource = uiSession?.sessionStatus
        ? {
            getSnapshot: () => uiSession.sessionStatus.getSnapshot(),
            subscribe: (listener) => uiSession.sessionStatus.subscribe(listener),
          }
        : undefined
      const layoutSource = layout
        ? {
            getSnapshot: () => layout.panelInfo.getSnapshot(),
            subscribe: (listener) => layout.panelInfo.subscribe(listener),
          }
        : undefined
      ctx.effect(() => ctx.locale.register(NS, { en, zh }), 'orca-projects: dictionaries')
      ctx.effect(() => installStyles(), 'orca-projects: styles')

      let searchRequest = 0
      const searchListeners = new Set()
      const searchRequestSource = {
        getSnapshot: () => searchRequest,
        subscribe: (listener) => {
          searchListeners.add(listener)
          return () => searchListeners.delete(listener)
        },
      }
      ctx.effect(() => {
        let entry
        let unsubscribe = () => {}
        const reconcile = () => {
          // Raw entries retain the shadowed DSH browser's injected shortcut source.
          const next = ctx.slots
            .entries?.('sidebar.workspaces')
            .find(
              (candidate) =>
                candidate.locale === 'workspace' && typeof candidate.inject === 'function',
            )
          if (next === entry) return
          unsubscribe()
          unsubscribe = () => {}
          entry = next
          if (!entry) return
          try {
            const source = entry.inject().hooks?.workspaceShortcuts
            if (
              typeof source?.getSnapshot !== 'function' ||
              typeof source?.subscribe !== 'function'
            )
              return
            let lastRequest = source.getSnapshot().searchRequest
            unsubscribe = source.subscribe(() => {
              const request = source.getSnapshot().searchRequest
              if (request === lastRequest) return
              lastRequest = request
              if (!Number.isSafeInteger(request) || request <= 0) return
              searchRequest += 1
              for (const listener of searchListeners) listener()
            })
          } catch {
            // An unavailable/incompatible shipped entry must not break the replacement.
          }
        }
        const unsubscribeSlots = ctx.slots.subscribe?.('sidebar.workspaces', reconcile)
        reconcile()
        return () => {
          unsubscribeSlots?.()
          unsubscribe()
          searchListeners.clear()
        }
      }, 'orca-projects: search shortcuts')

      ctx.slots.inject('sidebar.workspaces', () =>
        ctx.slots.register(
          {
            name: 'sidebar.workspaces',
            priority: -1,
            locale: NS,
            inject: () => ({
              workspaceSource,
              sessionSource,
              sessionStatusSource,
              layoutSource,
              searchRequestSource,
              resolveRepositories: fetchRepositories,
              openSession: (sessionId) => uiWorkspace.openSession(sessionId),
              startSession: (workspaceId) => uiWorkspace.startSession(workspaceId),
              openWorkspace: (workspaceId) => uiWorkspace.openWorkspace(workspaceId),
              pickDirectory: () => uiWorkspace.pickDirectory(),
              createWorkspace: (path) => workspaces.create({ path }),
              deleteWorkspace: (workspaceId) => workspaces.delete(workspaceId),
              pinSession: (sessionId) => workspaces.pinSession(sessionId),
              unpinSession: (sessionId) => workspaces.unpinSession(sessionId),
              archiveSession: (sessionId, options) => workspaces.archiveSession(sessionId, options),
              unarchiveSession: (sessionId) => workspaces.unarchiveSession(sessionId),
            }),
          },
          OrcaBrowser,
        ),
      )
    }

    const internals = {
      defaultState,
      sanitizeState,
      buildView,
      assignProject,
      renameProject,
      createGroup,
      deleteGroup,
      renameGroup,
      moveProjectInOrder,
      moveSessionInOrder,
      isCollapsed,
      normalizePath,
      isAncestor,
      worktreeFromPath,
      sessionWorktree,
      workspaceRepo,
      repoFromPathFallback,
      worktreeForSession,
      repositoryWorktree,
      isActiveSession,
      findCurrentId,
      sessionLabel,
      sortProjects,
      sortSessions,
    }

    return {
      inject,
      apply,
      ...(globalThis.__ORCA_PROJECTS_TEST__ ? { __internals: internals } : {}),
    }
  },
})
