# DSH Models Input Modalities

[![CI](https://github.com/DamonBao/dsh-models-input-modalities/actions/workflows/ci.yml/badge.svg)](https://github.com/DamonBao/dsh-models-input-modalities/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-green.svg)](#开发)
[![pnpm](https://img.shields.io/badge/pnpm-11-orange.svg)](#开发)

[English](README.md) | 简体中文

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）打造的 Web 客户端插件：给**设置 → 模型**页的每个第三方（pi-ai）提供方卡片补上一个**「输入模态」折叠区**，按模型声明它的输入模态列表（是否接受图片）——这正是模型页自带表单没有开放的那个字段。基于 DSH `0.1.5-alpha.1` 构建（peer 范围 `>=0.1.5-alpha.1 <0.2.0`）。

提供方本身（Provider ID、API 地址、协议、密钥、模型列表）仍然完全在模型页的表单里创建和编辑；本插件**不预写任何提供方配置**。

## 功能

- **按模型三选一** —— *提供方默认*、*仅文本*、*文本和图片*。
- **与适配器语义一致** —— *仅文本*写入 `input: [text]`，*文本和图片*写入 `input: [text, image]`；*提供方默认*删除该字段，让这一行继承已安装目录的模态，再回退路由 `defaultInput`。
- **revision 围栏写入** —— 整组 `models` 数组按折叠区打开时读到的 revision 写回，与模型页自身卡片相同的数组语义与冲突处理：他人同时改动时提示冲突并重新加载，而不是静默覆盖。
- **字段保留** —— 行内除 `input` 外的所有字段原样保留，包括本卡片从不展示的字段。
- **本地化界面** —— 中英文跟随 Web UI 语言。

## 使用

1. 安装（见下），重启 `dsh web`。
2. 设置 → 模型：用**添加自定义提供方**照常创建你的网关提供方（或打开已有的）。
3. 每张第三方提供方卡片下方出现**输入模态**折叠区，展开后按模型三选一：
   - **提供方默认** — 不写字段，继承已安装目录的模态，再回退路由 `defaultInput`
   - **仅文本** — 写入 `input: [text]`
   - **文本和图片** — 写入 `input: [text, image]`
4. 点**保存**。写入 `$DSH_HOME/settings.yaml` 用户层，适配器在下一次请求时生效，无需重启。

## 原理

插件把组件注册进模型页对外开放的 `settings.models.provider-card` 扩展位（key 为 `llm-pi-ai`，即整个 pi-ai 适配器家族的卡片）。折叠区首次展开时通过 settings Remote 读取该提供方存储的 `models` 行，本地编辑后按读取时的 revision 围栏整组写回——与模型页自身卡片相同的数组语义与冲突处理（他人同时改动时提示冲突并重新加载）。行内除 `input` 外的所有字段原样保留。

## 安装

前置条件：DeepSeek Harness（`dsh`）`>=0.1.5-alpha.1 <0.2.0`（装有 `web` profile）。

**从 npm 安装：**

```sh
dsh plugin --profile web add @jcy2387/dsh-models-input-modalities
dsh web
```

**从本地代码安装（开发）：**

```sh
git clone https://github.com/DamonBao/dsh-models-input-modalities.git
cd dsh-models-input-modalities
pnpm install && pnpm run build
dsh plugin --profile web add link:$PWD
```

- `link:` 直接引用本目录，改动后 `pnpm run build` 再重启 dsh 即可；去掉 `link:` 前缀则是复制安装，更新需要 `dsh plugin --profile web update`。
- 卸载：`dsh plugin --profile web remove @jcy2387/dsh-models-input-modalities`。

## 开发

环境要求：Node.js `^22.19.0 || >=24.0.0`、pnpm `11.7`。

```sh
pnpm install
pnpm run check        # typecheck + test + build + publint，与 CI 相同
```

单条命令：

```sh
pnpm run typecheck    # host + client 双面
pnpm test             # 纯函数行助手的 vitest 单测
pnpm run build        # tsc d.ts + tsdown（lib/index.js 与 lib/client.cjs）
```

客户端产物是自包含 bundle：React、Cordis、ui-slots、ui-primitives 由 Web 壳供给，CSS Modules 内联，其余 `@deepseek-ai/*` 只做类型导入（构建期的 purity 检查强制）。

CI（[`.github/workflows/ci.yml`](.github/workflows/ci.yml)）在 Node 22.22.0 与 24.x 上运行同一组门禁；tag 推送时校验 release tag 与包版本一致，审计 npm tarball 的文件清单，并运行消费者冒烟测试：把打包产物安装进一个临时工程（peer 范围对真实 registry 解析），再导入所有 Node 侧入口。

### 发布

发布由 **Release** 工作流（[`.github/workflows/release.yml`](.github/workflows/release.yml)）自动化：GitHub Release 一经发布即触发。它要求 release tag 与包版本一致（可选 `v` 前缀会被去掉），重跑完整质量门禁，打包 tarball，并通过 **OIDC trusted publishing** 带 **provenance** 发布到 npm——不涉及长期有效的 `NPM_TOKEN` secret。

一次性配置：在 npmjs.com 为 `@jcy2387/dsh-models-input-modalities` 配置 [trusted publishing](https://docs.npmjs.com/trusted-publishing)，授权仓库 `DamonBao/dsh-models-input-modalities` 与工作流 `release.yml`（不填 environment）。

dist-tag 跟随 GitHub Release 的 pre-release 勾选：正式 release（不勾选）发布到 `latest`——包括 rc 版本；pre-release 发布到按版本推导的频道 tag（`0.1.1-alpha.2` → `alpha`，`0.1.1-rc.1` → `rc`）。工作流是幂等的——npm 上已存在的版本会被跳过，部分失败后重跑只补发缺失的包。

一次典型发布：

```sh
# 先更新 package.json 里的 version，然后：
pnpm run check
VERSION="$(node -p "require('./package.json').version")"
git commit -am "release: $VERSION"
git tag "$VERSION"
git push origin main --tags
```

再为该 tag 创建并发布 GitHub Release。

Dependabot 每周检查 GitHub Actions 依赖。npm 版本更新有意未启用 Dependabot：它重新生成的 `pnpm-lock.yaml` 不含 workspace overrides，其 PR 无法通过 `pnpm install --frozen-lockfile`——请用 `pnpm update` 手动升级依赖。

### 仓库结构

```text
.
├─ src/
│  ├─ index.ts          # Host 半边：刻意留空的 apply（纯浏览器插件）
│  ├─ image-input.ts    # 每模型 input 声明的纯函数行助手
│  └─ client/           # Web 半边：输入模态折叠区（controller、card、locales）
├─ tests/               # 纯函数行助手的 vitest 单测
├─ build/               # 自包含客户端 bundle 的 tsdown 预设
├─ .github/workflows/ci.yml       # 校验 + tarball 审计 + 消费者冒烟
├─ .github/workflows/release.yml  # GitHub Release 触发 npm 发布
├─ cordis.patch.yml
└─ README.md / README.zh.md
```

## 已知边界

- 休眠（尚未配置）的提供方卡片不渲染折叠区；新建的自定义提供方在**保存之后**才出现。
- 路由级 `defaultInput` 与内置提供方目录模型的 `modelOverrides` 不在本插件范围内，仍直接在 `$DSH_HOME/settings.yaml` 中设置。
- 只读设置部署中折叠区可见但不可保存。

## 许可

[MIT](LICENSE) © jcy2387
