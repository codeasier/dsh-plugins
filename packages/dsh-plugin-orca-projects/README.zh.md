# @codeasier/dsh-plugin-orca-projects

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）Web 与 Desktop 客户端的 Orca 风格项目侧栏。它在侧栏的视图选项中增加第四个 **Orca-like** 分组模式：项目是最上层的行，顶部有置顶会话架，项目可以移动到自定义分组；同一个 Git 仓库的主检出和所有 linked worktree 会收拢为一个项目。

这是 [codeasier/dsh-plugins](https://github.com/codeasier/dsh-plugins) 的社区插件。它包含 bundle patch、本地化显示元数据、原创图标和 [`engines.dsh`](https://github.com/codeasier/dsh-plugins/blob/main/docs/manifest-reference.md#compatibility) 兼容范围，可以独立安装、更新和发布。

## 功能

打开侧栏视图选项（**项目**旁的滑块按钮），选择 **Orca-like**，然后点击项目行展开会话。

- **按项目分组。**侧栏以项目（Git 仓库）为单位，而不是目录层级。主检出和每个 linked worktree 都归入同一个项目行，包括 Orca 的 `~/orca/workspaces/<project>/<name>` 布局和嵌套的 `.worktrees/<name>` 目录。layers 徽标显示该项目包含多少个 worktree；项目菜单可以在指定 worktree 中新建会话。项目的 `...` 菜单还可以本地重命名项目，或删除该项目名下的全部 workspace 注册。
- **置顶会话架。**在会话悬浮按钮或 `...` 菜单中选择置顶。会话会移动到最顶部的 **已置顶**分组；在所属项目中，原会话仍然保留，但显示为灰色并带有 **置顶**标记。打开置顶会话不会展开其所在项目；使用置顶行 `...` 菜单中的 **在项目中显示**才会展开项目并滚动到原位置。取消置顶后，它恢复为普通项目会话。
- **紧凑会话卡片。**每个会话是两行卡片：标题行，以及 worktree 和项目标签。项目、置顶、单列表和搜索结果使用同一套卡片布局；当项目已经是周围标题时，不再重复显示项目标签。
- **Worktree 标签。**每个会话显示 `main`（工作区根目录）或从工作区目录得到的 worktree 名称，例如 `.worktrees/feature-a` 或 Orca 的 `workspaces/<project>/2.0-review`。跨项目、置顶和单列表卡片始终显示该标签；项目卡片只在 worktree 名称与项目标题不同时显示，并省略隐含的 `main`。与纯路径推断不同，Host 半会读取工作区根目录的 `.git` 文件及其 `commondir` 指针，因此位于任意目录的 worktree 仍然会归入它所属的仓库。
- **实时状态与活跃过滤。**运行中的会话显示黄色动画 spinner，等待用户交互的会话显示琥珀色圆点，已完成但未查看的会话显示绿色圆点，未活跃会话显示灰色圆点。在 Orca-like 模式下，视图选项 → **仅活跃会话**会隐藏所有非活跃会话和项目；空状态提供 **查看全部会话**以关闭过滤。
- **自定义分组。**使用项目 `...` 菜单 → **移动到分组**创建分组或移动项目；也可以把项目拖到分组上。分组标题可以重命名、删除和用于添加项目；删除分组会把项目移回 **未分组**。
- **其他分组模式仍然可用。**同一菜单中还有 **按工作区**、**按工作区树**、**单列表** 和 **Orca-like**。可以按最近更新或手动排序、过滤已归档会话，以及搜索项目和会话标题。
- **会话操作。**置顶/取消置顶、归档/取消归档、打开、复制 Session ID。项目操作包括在指定 worktree 新建会话、打开主工作区、重命名项目标签、删除项目和移动到分组。
- **持久化。**自定义分组、分配、项目/会话手动顺序、折叠状态和视图选项保存在当前 DSH origin 的浏览器 `localStorage` 中，键为 `dsh.orca-projects.v1`。置顶和归档状态由 Host 管理，并在所有侧栏界面之间共享。

### 工作原理

DSH 把侧栏的浏览区域暴露为可替换 slot，但没有公开的“新增分组模式”钩子。插件因此在 `sidebar.workspaces` 上注册一个优先级为 `-1` 的替代占用者，遮蔽内置浏览器，并重新创建带额外模式的视图选项菜单。如果插件崩溃，slot 渲染器会回退到内置浏览器。内置浏览器的逐行操作扩展 slot 不会在这个版本中渲染。

浏览器无法直接读取 `.git`。一个很小的 Host 半通过现有 Connection 服务注册认证路由`/api/orca-projects/resolve`，使用 Node 文件系统 API 读取每个 workspace 路径的`.git` 和 `commondir`，返回规范的主检出路径、标题和 worktree 名称。浏览器按该 key合并 workspace。路由不可用时，客户端保留针对嵌套 `.worktrees` 目录和 Orca 工作区目录的路径兜底。

## 安装

### DeepSeek Harness CLI

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-orca-projects
```

如果 profile 没有启用 HMR，安装后请重启应用。

### DeepSeek Harness Desktop

在 Desktop 窗口中打开 **插件**并安装`@codeasier/dsh-plugin-orca-projects`，或使用应用内置的命令运行时。npm 的 `dsh` CLI 不能管理由 Electron 持有的 `desktop` profile。参见[安装到 Desktop](https://github.com/codeasier/dsh-plugins/blob/main/docs/install/desktop.md)。

### 从当前 checkout 安装

```sh
pnpm install && pnpm build
pnpm install:local dsh-plugin-orca-projects --profile web
```

## 配置

插件没有 Host `Config` schema，也没有工具。用户状态保存在客户端：

| 存储 | Key | 内容 |
|---|---|---|
| `localStorage` | `dsh.orca-projects.v1` | 分组模式、排序/过滤、自定义分组、项目分配、项目名称、项目/会话顺序、折叠状态 |

置顶和归档会话不保存在这里；它们位于 workspace controller，并作用于所有侧栏界面。

在 profile 的 `cordis.patch.yml` 中禁用 bundle 行即可回到内置侧栏：

```yaml
- id: orca-projects
  name: '@codeasier/dsh-plugin-orca-projects'
  disabled: true
```

## 兼容性

| 插件 | DeepSeek Harness | Node.js |
|---|---|---|
| `0.1.x` | `>=0.2.2-rc.1 <0.3.0` | `>=22.18.0` |

插件包含 Web 客户端半和一个小型 Host 半，用于解析仓库身份。DeepSeek Harness Desktop 提供相同的 Web 客户端和 Host 服务，因此 Desktop 窗口获得相同的侧栏。已在DSH 0.2.2-rc.1 的 Web 客户端验证；见 [验证](#验证)。

## 验证

- `pnpm check` 通过（lint、类型检查、测试、构建、约定、文档和打包检查）。
- 客户端 bundle 注册了 loader id、locale namespace 和 `sidebar.workspaces` 占用者；行为测试覆盖分组模型、置顶架重复显示、自定义分组移动/删除、归档过滤、空白会话、搜索、手动顺序、持久化状态清洗、worktree 合并、通过成员路径分组、路径兜底和项目名称。`src/repo.ts` 使用临时主检出和 linked worktree（包括 Orca 风格路径）测试。
- 在 DSH 0.2.2-rc.1 的临时 Web profile 中手动检查：视图选项中的 Orca-like 模式；项目展开；置顶 → 置顶架及原项目中的灰色行；取消置顶 → 恢复；创建/重命名/删除分组；通过菜单和拖拽移动项目；刷新后持久化；搜索；归档/取消归档；单列表、工作区和工作区树模式；浅色和深色主题；侧栏折叠/展开。另检查了置顶行打开时不展开项目、 **在项目中显示**会展开并滚动到原行、worktree 标签解析为 `main`、 `v0.16.1-patch` 和 `2.0-review`，以及字号与内置侧栏的 14px 项目和会话标题一致。
- 使用真实注册的 workspace 在临时 profile 中渲染 worktree 合并：`msinsight` 主检出加四个 Orca worktree 形成一个项目，显示 `5` 个 worktree；`dsh-TUI` 加四个 `.worktrees` 条目形成另一个，显示 `5` 个。项目菜单列出每个 worktree，重命名项目标签可持久化，把项目移入自定义分组后仍保持一行。两个目录已不存在的旧 `.worktrees` 条目仍通过兜底归入项目。
- 本次 checkout 没有单独驱动 Desktop 窗口；它使用同一个客户端 artifact。安装到 Electron 持有的 `desktop` profile 是单独的用户操作。

## 限制

- 插件遮蔽内置 workspace 浏览器。内置浏览器的会话行操作扩展 slot （`sidebar.workspaces.session.row.action`）和悬浮卡片不会在这里渲染。
- 搜索只针对已加载的会话摘要（标题、项目路径和工作目录），不会查询 Host 上的消息内容。
- 自定义分组保存在浏览器本地，不会跨设备或 profile 同步。
- worktree 身份只从 workspace 根目录的 `.git` 条目读取；Host 不会向上扫描父目录。没有自己 `.git` 条目的 workspace 仍然是独立项目，submodule 不会并入外层仓库。如果 Host 路由不可用，只有 `.worktrees/`、`.worktree/`、`worktrees/` 和 Orca 的 `workspaces/<project>/<worktree>` 路径模式会合并。
- worktree 合并只适用于 Orca-like 模式。工作区模式和工作区树模式仍然保留 DSH 的目录分组语义。
- 删除合并后的项目会移除它名下的全部 workspace 注册，文件和会话会保留。这个版本没有单独移除某个 worktree 的操作。
- 绿色表示已完成但未查看；已经查看过的 idle 会话会恢复为灰色。过滤中的 **活跃**指正在运行或等待用户交互，而不仅仅是已完成。
- 添加项目需要可用的 `ctx.uiWorkspace.pickDirectory()`。没有 Host 目录选择器的远程浏览器无法添加项目。
- 这个版本不提供会话重命名、fork 或删除；请使用对话界面，或重新启用内置侧栏。

## 开发

```sh
pnpm --filter @codeasier/dsh-plugin-orca-projects build
pnpm --filter @codeasier/dsh-plugin-orca-projects test
pnpm --filter @codeasier/dsh-plugin-orca-projects typecheck
```

扩展插件前请阅读 [Plugin anatomy](https://github.com/codeasier/dsh-plugins/blob/main/docs/plugin-anatomy.md)和 [Client UI](https://github.com/codeasier/dsh-plugins/blob/main/docs/client-ui.md)。`client.js` 是手写的 loader 代码；保持 loader factory 自包含，并在修改后运行`node --check client.js`。

## License

MIT
