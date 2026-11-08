# dsh-plugins

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（`dsh`）
维护的社区插件集 —— **每个插件一个独立版本、独立发布的 npm 包**。

[![CI](https://github.com/codeasier/dsh-plugins/actions/workflows/ci.yml/badge.svg)](https://github.com/codeasier/dsh-plugins/actions/workflows/ci.yml)
[![npm hello](https://img.shields.io/npm/v/@codeasier/dsh-plugin-hello?label=hello)](https://www.npmjs.com/package/@codeasier/dsh-plugin-hello)
[![npm kit](https://img.shields.io/npm/v/@codeasier/dsh-plugin-kit?label=kit)](https://www.npmjs.com/package/@codeasier/dsh-plugin-kit)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22.18-339933.svg)](package.json)

[English](README.md) | 中文

> 本项目与 DeepSeek 官方无关。`dsh` / DeepSeek Harness 是平台，本仓库提供
> 社区扩展。

## 为什么这样组织

- **装一个插件，只更新一个插件。** 每个包有自己的版本、CHANGELOG、git tag、
  GitHub Release 和 npm 产物，互不牵连。
- **公共代码只写一份。** 跨插件工具放在
  [`@codeasier/dsh-plugin-kit`](packages/plugin-kit)，构建时直接编译进每个插件，
  因此每个发布包都能独立安装。
- **约定由工具执行。** 生成器负责脚手架；CI 检查 manifest、row id、locale、
  图标、文档链接以及真实的 `npm pack` 文件列表。

## 插件目录

<!-- plugins:start -->
| 插件 | 功能 | 版本 |
|---|---|---|
| [`@codeasier/dsh-plugin-hello`](./packages/dsh-plugin-hello) | 注册一个可配置的 `hello` 工具，按名字打招呼。 | `0.1.0` |
| [`@codeasier/dsh-plugin-orca-projects`](./packages/dsh-plugin-orca-projects) | 以项目为中心的侧栏，支持按仓库收拢 worktree、自定义分组与置顶会话架。 | `0.1.0` |
<!-- plugins:end -->

每个插件的 README 说明能力、配置和兼容范围。公共 kit 是编译进插件的源码库，
不是 bundle，因此不出现在上表中。

## 安装

### DSH CLI

```sh
dsh plugin --profile web add @codeasier/dsh-plugin-hello
```

终端 profile 用 `--profile tui`。如果 profile 未启用 HMR，安装后需要重启。
本地构建的安装方式：

```sh
pnpm install && pnpm build
pnpm install:local dsh-plugin-hello --profile web
```

### DSH 桌面端

打开桌面端左侧 **Plugins** 页面安装，或使用应用自带的命令运行时。npm 安装的
`dsh` 命令会拒绝管理 Electron 所有的 `desktop` profile。

详细步骤：[CLI](docs/install/dsh.md) · [桌面端](docs/install/desktop.md)。

## 工作原理

DSH profile 是“有序 bundle 列表 + 用户 patch 层”。插件是声明了
`dsh.bundle.patch` 的 npm 包：安装即选中 bundle，其 patch 向 Loader 插入一行。
Host 半在进程内运行；可选的 Client 半由同一个包提供给 Web UI 和桌面端。

```text
packages/dsh-plugin-hello
├── cordis.patch.yml     # 插入 row "hello"
├── dist/                # tsdown 构建的 host 入口
├── locale/              # 展示元数据（en、zh）
├── icon.svg
└── client.js            # 可选浏览器端
```

完整模型见 [Architecture](docs/architecture.md)，代码级契约见
[Plugin anatomy](docs/plugin-anatomy.md)。

## 开发

需要 Node `>=22.18.0`、pnpm 11、DSH `>=0.2.1-rc.2 <0.3.0`。

```sh
corepack enable
corepack prepare pnpm@11.21.0 --activate
pnpm install
pnpm check
```

| 命令 | 作用 |
|---|---|
| `pnpm build` | 按拓扑顺序构建所有包 |
| `pnpm test` | 运行所有包的 Vitest |
| `pnpm typecheck` | 只做类型检查 |
| `pnpm lint` / `pnpm lint:fix` | Biome 检查 / 安全修复 |
| `pnpm check` | 完整门禁：lint、类型、测试、构建、约定、文档、打包 |
| `pnpm new <name>` | 生成插件并更新目录 |
| `pnpm changeset` | 记录发布说明 |
| `pnpm install:local <pkg> --profile web` | 打包并安装到 profile |

### 新增插件

```sh
pnpm new my-plugin --description "这个插件为用户带来的能力。"
pnpm --filter @codeasier/dsh-plugin-my-plugin test
pnpm changeset
```

加 `--ui` 可生成浏览器端。生成器不会覆盖已有目录，并会同步更新本文件与
[docs/plugins.md](docs/plugins.md) 的目录。

## 兼容性

| 插件 | DeepSeek Harness | Node.js |
|---|---|---|
| `0.1.x` | `>=0.2.1-rc.2 <0.3.0` | `>=22.18.0` |

DSH 在导入插件代码前检查 `engines.dsh`：安装时拒绝不兼容包，启动时跳过不兼容
bundle。平台仍处于 pre-1.0，这个范围表示“已验证”，而不是“碰巧能加载”。详见
[Manifest reference § compatibility](docs/manifest-reference.md#compatibility)。

## 文档

英文文档是规范来源；除“中文快速入门”外，以下链接均指向英文页面。

- [快速开始](docs/getting-started.md)
- [架构](docs/architecture.md)
- [插件结构](docs/plugin-anatomy.md)
- [Manifest 参考](docs/manifest-reference.md)
- [Client UI](docs/client-ui.md)
- [构建与发布](docs/build-and-release.md)
- [测试](docs/testing.md)
- [故障排查](docs/troubleshooting.md)
- [FAQ](docs/faq.md)
- [约定](docs/conventions.md)
- [中文快速入门](docs/zh/README.md)
- [安全](SECURITY.md) · [贡献指南](CONTRIBUTING.md) · [维护者手册](docs/maintainers.md)

## 安全

插件在 DSH 进程内以当前用户权限运行，没有沙箱。请安装经过审核的版本，优先使用
精确版本，不要把密钥写进 profile 配置。漏洞请通过 GitHub 私有漏洞报告提交，
见 [SECURITY.md](SECURITY.md)。

## 贡献

欢迎 issue 和 PR。先读 [CONTRIBUTING.md](CONTRIBUTING.md) 与
[约定](docs/conventions.md)；PR 模板列出了评审会执行的检查。参与即表示同意
[行为准则](CODE_OF_CONDUCT.md)。

## 许可证

[MIT](LICENSE) © 2026 codeasier。个别插件可能包含第三方美术资源，请保留其许可证
要求的署名。
