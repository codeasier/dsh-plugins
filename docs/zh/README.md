# 中文文档

本仓库为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
（`dsh`）维护一组社区插件。每个插件都是独立的 npm 包，拥有自己的版本、
CHANGELOG、兼容范围和发布流程；公共工具放在 `@codeasier/dsh-plugin-kit`。

英文文档是规范来源；本页是中文快速入门，行为与命令以英文文档和实际安装的
DSH 为准。

## 安装插件

### DSH CLI

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-hello
```

`--profile` 指定安装到哪个 profile（如 `web`、`tui`）。首次使用某个 profile
时会从内置模板初始化。安装后如果不启用 HMR，需要重启应用。

### DSH 桌面端

桌面端的 `desktop` profile 由 Electron 应用自己管理：

1. 打开桌面端左侧的 **Plugins** 页面，搜索并安装包名；
2. 或使用应用自带的命令运行时（macOS 路径）：

   ```sh
   "/Applications/DeepSeek Harness.app/Contents/Resources/runtime/cli/bin/dsh" \
     plugin --profile desktop add @codeasier/dsh-plugin-hello
   ```

npm 安装的 `dsh` 命令会拒绝管理 `desktop` profile，这是设计行为。详细步骤见
[Install on Desktop](../install/desktop.md)。

## 开发环境

要求：Node.js `>=22.18.0`、pnpm 11、DSH `>=0.2.1-rc.2 <0.3.0`。

```sh
corepack enable
corepack prepare pnpm@11.21.0 --activate
git clone git@github.com:codeasier/dsh-plugins.git
cd dsh-plugins
pnpm install
pnpm check
```

`pnpm check` 依次执行格式/静态检查、TypeScript、单元测试、构建、仓库约定检查、
文档链接检查和发布包内容检查，与 CI 一致。

## 新增插件

```sh
pnpm new my-plugin --description "描述这个插件为用户带来的能力。"
```

需要 Web UI 时：

```sh
pnpm new my-panel --ui --description "在输入框下方增加状态面板。"
```

生成器会创建 `packages/dsh-plugin-my-plugin/`，包括入口、测试、bundle patch、
中英文 locale、图标、README 和 CHANGELOG，并自动更新 README 与插件目录。
它不会覆盖已有目录。

生成后：

1. 把示例 echo 工具替换为真实能力；
2. 更新 locale、图标、README 和兼容性表；
3. 运行 `pnpm --filter @codeasier/dsh-plugin-my-plugin test`；
4. 运行 `pnpm changeset` 记录发布说明；
5. 用打包产物安装到真实 profile 验证。

源码目录没有构建产物，必须打包后再安装：

```sh
pnpm install:local dsh-plugin-my-plugin --profile web
```

## 目录结构

| 路径 | 作用 |
|---|---|
| `packages/` | 每个插件一个可发布 npm 包 |
| `packages/plugin-kit/` | 无 DSH 服务依赖的公共工具源码，构建时编译进插件 |
| `templates/plugin/` | `pnpm new` 使用的模板 |
| `scripts/` | 生成器、约定检查、文档检查、打包检查、本地安装 |
| `docs/` | 文档与 ADR |
| `.changeset/` | 待发布变更与版本策略 |
| `.github/` | CI、发布流水线、Issue/PR 模板 |

## 版本与兼容

- 每个包独立语义化版本，从 `0.1.0` 开始；
- 所有插件必须声明 `engines.dsh`，DSH 在导入插件代码前检查该范围；
- `@deepseek-ai/dsh-*` 只能作为 `peerDependencies`，不能作为普通依赖，否则会
  产生第二份运行时实例；
- 公共 kit 在构建时编译进插件，kit 的改动需要相关插件各自重新发布；
- 收紧 `engines.dsh` 是破坏性变更，必须在 CHANGELOG 说明；
- 不要手工修改已发布版本或 CHANGELOG。

兼容性细节见
[Manifest reference § compatibility](../manifest-reference.md#compatibility)。

## 约定与检查

- 包名：`@codeasier/dsh-plugin-<kebab-case>`；
- Loader row id：包名后缀，例如 `hello`，全仓库唯一；
- 工具名模型可见，必须稳定且描述准确的调用时机；
- 每个插件必须有 `locale/en.json`、`locale/zh.json`、原创图标、README、
  CHANGELOG、测试和 MIT LICENSE；
- DSH 客户端包不是插件 API，不要在 UI 插件里 import；
- UI 使用 `--dsw-alias-*` 主题 token 和 slot，不写 DOM、不嵌 iframe。

完整规则见 [Conventions](../conventions.md)；机器可检查的部分由
`pnpm check:conventions` 强制执行。

## 发布

使用 Changesets：

1. PR 中运行 `pnpm changeset`，选择受影响的包和 bump 级别；
2. 合并到 `main` 后，机器人创建/更新 **Version Packages** PR；
3. 合并该 PR 后发布工作流只发布有版本变化或尚未发布的包；
4. 每个包生成独立 tag `包名@版本` 和 GitHub Release。

首次发布的新包以 `0.1.0` 直接发布，不需要 changeset。详见
[Build and release](../build-and-release.md)。

## 安全

插件在 DSH 进程内以当前用户权限运行，没有沙箱。安装插件等于执行第三方代码。

- 不要把密钥写进 `cordis.patch.yml`、测试、截图或日志；
- 优先使用凭据引用，而不是环境变量（macOS 桌面端不继承 shell 环境）；
- 不添加安装脚本，不引入来源不明的二进制；
- 漏洞请通过 GitHub 私有漏洞报告提交，不要开公开 issue。

详见 [Security](../security.md)。

## 文档索引

| 文档 | 内容 |
|---|---|
| [Getting started](../getting-started.md) | 从零到在 profile 中运行插件 |
| [Architecture](../architecture.md) | 仓库分层、profile/bundle/patch、独立发布模型 |
| [Plugin anatomy](../plugin-anatomy.md) | 插件每个文件与导出、生命周期、反模式 |
| [Manifest reference](../manifest-reference.md) | `package.json` 字段与版本门禁 |
| [Client UI](../client-ui.md) | 浏览器端 loader、slot、主题、模块与验证 |
| [Testing](../testing.md) | 单测、打包检查、组合冒烟测试、桌面端矩阵 |
| [Troubleshooting](../troubleshooting.md) | 版本拒绝、缺少 bundle、重启、桌面端锁 |
| [Conventions](../conventions.md) | 命名、依赖、版本、文档、评审清单 |
| [Security](../security.md) | 信任模型、密钥、供应链、漏洞报告 |
| [Maintainer runbook](../maintainers.md) | 仓库设置、npm 权限、发布值班 |
| [Plugins](../plugins.md) | 自动生成的插件目录 |
| [Contributing](../../CONTRIBUTING.md) | 贡献流程与 PR 检查清单 |
