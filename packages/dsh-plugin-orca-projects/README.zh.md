# @codeasier/dsh-plugin-orca-projects

面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）Web 与 Desktop 客户端的 Orca 风格项目侧栏。它在侧栏的视图选项中增加第四个 **Orca-like** 分组模式：项目是最上层的行，顶部有置顶会话架，项目可以移动到自定义分组；同一个 Git 仓库的主检出和所有 linked worktree 会收拢为一个项目。

这是 [codeasier/dsh-plugins](https://github.com/codeasier/dsh-plugins) 的社区插件。它包含 bundle patch、本地化显示元数据、原创图标和 [`engines.dsh`](https://github.com/codeasier/dsh-plugins/blob/main/docs/manifest-reference.md#compatibility) 兼容范围，可以独立安装、更新和发布。

## 功能

打开侧栏视图选项（**项目**旁的滑块按钮），选择 **Orca-like**，再从二级菜单选择布局。新安装和旧配置升级后默认使用 **原生项目树**。

- **三种 Orca 布局。** **原生项目树**保留项目树、自定义分组和全局置顶架，使用透明的原生列表；**单项目切换**一次聚焦一个项目，跟随当前会话所在项目，提供会话、置顶和工作树三个标签页；**状态队列**把所有可见会话互斥地分为待处理、进行中、最近会话，并提供全局的全部／进行中／待处理筛选。布局选择和单项目布局最后选择的项目会保存在本地；只有单项目布局处于活动状态且外部当前会话切换项目时才自动跟随。状态队列首批渲染 40 条最近会话，其余按需分批展开。
- **按项目分组。**侧栏以项目（Git 仓库）为单位，而不是目录层级。主检出和每个 linked worktree 都归入同一个项目行，包括 Orca 的 `~/orca/workspaces/<project>/<name>` 布局和嵌套的 `.worktrees/<name>` 目录。layers 徽标显示该项目包含多少个 worktree；项目菜单可以在指定 worktree 中新建会话。Host 还会从 `.git/worktrees` 发现 DSH 尚未注册的 worktree；在其中新建会话时会注册该目录。项目的 `...` 菜单还可以本地重命名项目，或删除该项目名下的全部 workspace 注册。
- **置顶会话。**在会话悬浮按钮或 `...` 菜单中选择置顶。在原生项目树中，会话会移动到最顶部的 **已置顶** 分组；所属项目中的原会话仍保留并带有 **置顶** 标记。打开置顶会话不会展开其所在项目；使用置顶行 `...` 菜单中的 **在项目中显示** 才会展开项目并滚动到原位置。置顶架按内容完整展开，随外层侧栏滚动，不嵌套自己的滚动条。单项目布局改为筛选当前项目内的置顶会话；状态队列把置顶会话留在对应状态分组并显示置顶标记。取消置顶后恢复为普通会话行。
- **紧凑原生行。**项目、分组和置顶容器使用透明背景，不再是浮起卡片。当前行使用 DSH 中性交互底色，只有当前项目的文件夹图标使用业务强调色。跨项目会话使用两行：带相对时间的标题行，以及不带胶囊底色的 worktree 和项目元信息；没有元信息时压缩为单行。悬浮操作替换尾部元信息，不再浮起一块工具条。置顶引用保持正常可读文字，归档行使用主题的 caption 颜色，而不是降低整行透明度。
- **Worktree 标签。**会话标签优先使用 Host 解析的 checkout 身份，包括位于任意目录的 worktree；普通子目录继承所属 checkout 的标签。没有身份信息时，才使用 `.worktrees/feature-a` 或 Orca 的 `workspaces/<project>/2.0-review` 等路径规则兜底。跨项目、置顶和单列表卡片始终显示该标签；项目卡片只在 worktree 名称与项目标题不同时显示，并省略隐含的 `main`。与纯路径推断不同，Host 半会读取工作区根目录的 `.git` 文件及其 `commondir` 指针，因此位于任意目录的 worktree 仍然会归入它所属的仓库。
- **实时状态与活跃过滤。**运行中的会话显示黄色动画 spinner，等待用户交互的会话显示琥珀色圆点，已完成但未查看的会话显示绿色圆点，未活跃会话显示灰色圆点。在 Orca-like 模式下，视图选项 → **仅活跃会话**会隐藏所有非活跃会话和项目；空状态提供 **查看全部会话**以关闭过滤。等待用户交互的状态优先于运行中；过滤不会改变可见项目的 worktree 成员、主工作区或操作目标。状态图标提供中文标签和提示；折叠控件提供 `aria-expanded`，当前会话提供 `aria-current`，便于键盘和辅助技术导航。
- **外观。**视图选项 → **字体**可在系统默认、DSH 代码字体栈和 `JetBrains Mono` 之间切换；**字号**提供 10px、11px、12px 三档，默认使用等宽 10px，worktree/项目标签、分组标题和行高会同步缩放。两项选择与 Orca 布局及其他视图选项一起保存在 `localStorage`，只影响本侧栏。
- **自定义分组。**使用项目 `...` 菜单 → **移动到分组**创建分组或移动项目；也可以把项目拖到分组上。分组标题可以重命名、删除和用于添加项目；删除分组会把项目移回 **未分组**。
- **其他分组模式仍然可用。**同一菜单中还有 **按工作区**、**按工作区树**、**单列表** 和 **Orca-like**。可以按最近更新或手动排序、过滤已归档会话，以及搜索项目和会话标题。Orca-like 无需先创建自定义组即可排序和拖动；未归属已注册工作区的会话显示在独立的 **未归属会话** 区域，而不是一个合成项目；区域内部按 workspace/目录分组（没有匹配 workspace 时按 `cwd`），每个分组可折叠，而不是一个平铺列表；分组内的会话行只显示 checkout 标签，因为分组标题已经写明 workspace；置顶的行仍留在分组内，灰色显示并带 **已置顶** 标记和项目标签，同时出现在已置顶区域，与已注册项目下会话的置顶表现一致。Orca-like 模式下可使用 **迁移未归属会话…**：按 `cwd` 匹配最近的项目/worktree 路径，预览可迁移和无法匹配的数量，然后写入浏览器本地的 `sessionId → projectId` 外挂映射；可在视图菜单中用 **撤销会话迁移** 回退。该操作不会修改 DSH workspace 或 `sessionIds`。
- **会话操作。**置顶/取消置顶、归档/取消归档、打开、**重命名**、复制 Session ID。重命名会先请求 Host 写入持久会话标题，与其他客户端共享；如果 Host 因为该会话已被另一个写句柄占用而拒绝，侧栏会把新标题保存在本地，并在同一菜单提供 **恢复 Host 标题**。项目操作包括在指定 worktree 新建会话、打开主工作区、重命名项目标签、删除项目和移动到分组。
- **持久化。**自定义分组、分配、项目/会话手动顺序、Host 拒绝重命名时保存的本地会话标题、未归属会话的外挂项目映射、折叠状态和视图选项保存在当前 DSH origin 的浏览器 `localStorage` 中，键为 `dsh.orca-projects.v1`。置顶和归档状态由 Host 管理，并在所有侧栏界面之间共享。

### 工作原理

DSH 把侧栏的浏览区域暴露为可替换 slot，但没有公开的“新增分组模式”钩子。插件因此在 `sidebar.workspaces` 上注册一个优先级为 `-1` 的替代占用者，遮蔽内置浏览器，并重新创建带额外模式的视图选项菜单。如果插件崩溃，slot 渲染器会回退到内置浏览器。内置浏览器的逐行操作扩展 slot 不会在这个版本中渲染。插件观察内置浏览器注入的快捷键状态源，让 DSH 的 `session.search` 命令展开并聚焦此搜索框，不替换默认或用户自定义的按键绑定。

浏览器无法直接读取 `.git`。一个很小的 Host 半通过现有 Connection 服务注册认证路由`/api/orca-projects/resolve`，使用 Node 文件系统 API 读取每个 workspace 路径的`.git` 和 `commondir`，返回规范的主检出路径、标题、worktree 名称，以及 `.git/worktrees` 下的全部 checkout。浏览器按该 key 合并 workspace，把未注册的 checkout 加入项目的 worktree 数量和菜单；迁移工具把 `sessionId → projectId` 写入 `localStorage`，不会把会话附加到 DSH workspace，因此其他客户端和 DSH 注册表保持原状。请求使用相对 document base 的 URL 保留子路径部署前缀。Host 区分已确认的非仓库、路径不存在和解析失败：已存在的非 Git 目录保持独立，路径不存在、解析失败或路由不可用时才保留针对嵌套 `.worktrees` 目录和 Orca 工作区目录的路径兜底。

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
| `localStorage` | `dsh.orca-projects.v1` | 分组模式、Orca 布局、单项目选择、排序/过滤、自定义分组、项目分配、项目名称、未归属会话的外挂项目映射、项目/会话顺序、折叠状态 |

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

- 已在临时 Web profile 的真实工作区和会话中检查三种 Orca 布局的亮色、暗色主题。Orca 二级菜单支持鼠标和左右方向键／Escape，并正确返回焦点；单项目布局在刷新后保留手动选择的项目，正确列出项目内置顶和工作树；状态队列从 580 条最近会话中首批显示 40 条，每批再显示 40 条并标明剩余数量，筛选栏吸顶，进行中／待处理空态正确。各状态分组没有重复 Session ID，反复切换布局未产生 Orca 运行时错误（复制 profile 的无关账号请求返回 403）。
- `pnpm check` 通过（lint、类型检查、测试、构建、约定、文档和打包检查）。
- 客户端 bundle 注册了 loader id、locale namespace 和 `sidebar.workspaces` 占用者；行为测试覆盖分组模型、置顶架重复显示、自定义分组移动/删除、归档过滤、空白会话、搜索、手动顺序、持久化状态清洗、worktree 合并、通过成员路径分组、路径兜底和项目名称。`src/repo.ts` 使用临时主检出和 linked worktree（包括 Orca 风格路径）测试。
- 评审跟进回归覆盖同时运行与等待交互、分组/树模式中的未归属会话、无自定义组时的排序与拖动、活跃过滤下完整的项目成员、各模式的 checkout 标签、明确的非仓库/不存在/失败结果、子路径 URL、使用真实 slot 条目形状的内置搜索命令桥接，以及 checkout 回链缺失或指向其他仓库的陈旧 worktree 记录。这些检查使用服务端渲染及假的服务/快捷键状态源；最终构建也已在临时 Web profile 中重新安装并在真实页面检查。折叠、当前会话和实时状态的可访问性语义也有服务端渲染回归。
- 视觉优化已在 264px 侧栏宽度下用 22 个项目和 7 条置顶会话验证浅色、深色主题。置顶架完整展开且没有内层滚动条，项目和会话标题使用 10px，普通未归属会话不重复显示项目标签，分组/项目/会话嵌套没有溢出窄栏，页面无 slot 错误。另在真实页面检查了悬浮操作、Enter 键折叠、搜索与 Escape、当前项目/会话标记，以及未归属 workspace 分组。
- 此前在 DSH 0.2.2-rc.1 的临时 Web profile 中手动检查：视图选项中的 Orca-like 模式；项目展开；置顶 → 置顶架及原项目中的灰色行；取消置顶 → 恢复；创建/重命名/删除分组；通过菜单和拖拽移动项目；刷新后持久化；搜索；归档/取消归档；单列表、工作区和工作区树模式；浅色和深色主题；侧栏折叠/展开。另检查了置顶行打开时不展开项目、 **在项目中显示**会展开并滚动到原行、worktree 标签解析为 `main`、 `v0.16.1-patch` 和 `2.0-review`，以及字号与内置侧栏的 14px 项目和会话标题一致。
- 使用真实注册的 workspace 在临时 profile 中渲染 worktree 合并：`msinsight` 主检出加四个 Orca worktree 形成一个项目，显示 `5` 个 worktree；`dsh-TUI` 加四个 `.worktrees` 条目形成另一个，显示 `5` 个。`dsh-plugins` 只注册了主 workspace，Host 找到了另外三个 `.git/worktrees` checkout，项目行显示 `4` 个 worktree，项目菜单列出全部四项，且没有为了展示而创建 workspace。不属于任何已注册工作区的会话显示在独立的、默认折叠的 **未归属会话** 区域，而不是一个无法移动的合成项目；展开后可以看到 18 个可折叠的 workspace 分组（例如 `cc-workspace` 的 58 条），而不是一个平铺列表；展开分组后只显示 checkout 标签；置顶的那一行仍留在分组内，灰色显示并带 **已置顶** 标记和项目标签，同时也出现在已置顶区域。迁移对话框从 193 条中识别出 183 条、覆盖 10 个项目；应用外挂映射后剩余 10 条，撤销后恢复 193 条。项目菜单列出每个 worktree，重命名项目标签可持久化，把项目移入自定义分组后仍保持一行。两个目录已不存在的旧 `.worktrees` 条目仍通过兜底归入项目。
- 本次 checkout 没有单独驱动 Desktop 窗口；它使用同一个客户端 artifact。安装到 Electron 持有的 `desktop` profile 是单独的用户操作。

## 限制

- 插件遮蔽内置 workspace 浏览器。内置浏览器的会话行操作扩展 slot （`sidebar.workspaces.session.row.action`）和悬浮卡片不会在这里渲染。
- 搜索只针对已加载的会话摘要（标题、项目路径和工作目录），不会查询 Host 上的消息内容。
- 自定义分组保存在浏览器本地，不会跨设备或 profile 同步。
- worktree 身份只从 workspace 根目录的 `.git` 条目读取；Host 不会向上扫描父目录。没有自己 `.git` 条目的 workspace 仍然是独立项目，submodule 不会并入外层仓库。未注册 checkout 从 `.git/worktrees` 发现；只有目录存在且 `.git` 文件回链到同一条 worktree 管理记录时才会列出。陈旧记录会被省略，即使原路径已被普通目录或其他仓库复用。如果 Host 路由不可用，只有 `.worktrees/`、`.worktree/`、`worktrees/` 和 Orca 的 `workspaces/<project>/<worktree>` 路径模式会合并。
- worktree 合并和会话迁移只适用于 Orca-like 模式。工作区模式和工作区树模式仍然保留 DSH 的目录分组语义，并忽略迁移映射。
- 迁移工具只按 `cwd` 匹配当前可见会话，是浏览器本地外挂映射，不会修改 DSH 的 `workspace.sessionIds`；无法把任意会话附加到路径与其 `cwd` 不同的 workspace。
- 删除合并后的项目会移除它名下的全部 workspace 注册，文件和会话会保留。这个版本没有单独移除某个 worktree 的操作。
- 绿色表示已完成但未查看；已经查看过的 idle 会话会恢复为灰色。过滤中的 **活跃**指正在运行或等待用户交互，而不仅仅是已完成。
- 添加项目需要可用的 `ctx.uiWorkspace.pickDirectory()`。没有 Host 目录选择器的远程浏览器无法添加项目。
- 支持通过 Host 重命名会话，并保留上述本地标题回退；这个版本不提供会话 fork 或删除，请使用对话界面，或重新启用内置侧栏。

## 开发

```sh
pnpm --filter @codeasier/dsh-plugin-orca-projects build
pnpm --filter @codeasier/dsh-plugin-orca-projects test
pnpm --filter @codeasier/dsh-plugin-orca-projects typecheck
```

扩展插件前请阅读 [Plugin anatomy](https://github.com/codeasier/dsh-plugins/blob/main/docs/plugin-anatomy.md)和 [Client UI](https://github.com/codeasier/dsh-plugins/blob/main/docs/client-ui.md)。`client.js` 是手写的 loader 代码；保持 loader factory 自包含，并在修改后运行`node --check client.js`。

## License

MIT
