# DSH Models Input Modalities

[![CI](https://github.com/DamonBao/dsh-models-input-modalities/actions/workflows/ci.yml/badge.svg)](https://github.com/DamonBao/dsh-models-input-modalities/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-green.svg)](#开发)
[![pnpm](https://img.shields.io/badge/pnpm-11-orange.svg)](#开发)

[English](README.md) | 简体中文

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）打造的 Web 客户端插件：给**设置 → 模型**页的每个第三方（pi-ai）提供方卡片补上一个**「模型能力」折叠区**，按模型声明它接受哪些输入（是否允许图片），以及它提供哪些推理等级——这正是模型页自带表单刻意没有开放的两个 per-model 字段。基于 DSH `0.1.7-rc.1` 构建（peer 范围 `>=0.1.7-rc.1 <0.1.8-0`）。

提供方本身（Provider ID、API 地址、协议、密钥、模型列表）仍然完全在模型页的表单里创建和编辑；本插件**不预写任何提供方配置**。

## 功能

**输入模态**

- **按模型三选一** —— *提供方默认*、*仅文本*、*文本和图片*。
- **与适配器语义一致** —— *仅文本*写入 `input: [text]`，*文本和图片*写入 `input: [text, image]`；*提供方默认*删除该字段，让这一行继承已安装目录的模态，再回退路由 `defaultInput`。

**推理等级**

- **按模型三选一** —— *目录默认*、*非推理模型*、*声明等级*；选*声明等级*会展开七个等级（`off`、`minimal`、`low`、`medium`、`high`、`xhigh`、`max`），每级一个勾选框加一个「发到网关的拼写」输入框。
- **与适配器语义一致** —— 声明写入适配器读取的 `reasoningEfforts` 字典：勾选的等级成为键，输入框里的值就是实际发送的拼写，所以 `max: ultra` 能给有自己的叫法的网关改名；`off` 留空则写成无值的 `off:`——提供该等级，但完全不发送参数。*非推理模型*写入 `reasoningEfforts: false`；*目录默认*删除该字段，保留已安装目录的能力，而手写模型的能力就是「没有」。
- **种子不替「off」做假设** —— 切到*声明等级*时从 `low`/`medium`/`high` 开始（拼写即等级名），`off` 不预勾：在纯 `reasoning_effort` 网关上，留空的 `off` 与「不指名任何等级」是同一个请求，预勾等于承诺一个网关未必兑现的「停止思考」。等网关说明了怎么表达「别思考」，再勾 `off` 并填上拼写。
- **等级就是这样进入选择器的** —— 对话输入框的模型选择器只列出模型自己声明的等级，因此手工添加的网关模型是在这里、也是在整个界面里唯一一处，获得它的 Off/Low/Medium/High 选项。
- **写入前就拦下** —— 适配器会拒绝「除 `off` 外没有任何等级」的声明，也会拒绝除 `off` 外缺少发送值的等级；卡片会指名是哪一行，并让**保存**保持禁用，而不是等一次被拒绝的设置写入回来。

**两者共同**

- **一个折叠区、一次写入** —— 两个声明合用一个折叠区，因为它们共用存储的 `models` 数组：拆成两个折叠区就会各写一次数组，互相被 revision 围栏判成冲突。
- **revision 围栏写入** —— 整组 `models` 数组按折叠区打开时读到的 revision 写回，与模型页自身卡片相同的数组语义与冲突处理：他人同时改动时提示冲突并重新加载，而不是静默覆盖。
- **字段保留** —— 行内除 `input` 与 `reasoningEfforts` 外的所有字段原样保留，包括本卡片从不展示的字段。
- **与模型页实时联动** —— 在上方模型目录里增删模型，这些行会就地跟上：折叠区订阅了本命名空间的 `settings/document-updated` 推送失效事件，无需关掉设置页再重开。读取途中被新提交反超时，按 revision 对比识别落差并自动追读，直到追平。未保存的草稿永不被覆盖，重新展开也不会——草稿期间落下的改动会一直挂起到草稿落定为止：撤回编辑，折叠区静默重读；直接保存，则由 revision 围栏拦下撞车的写入，提示冲突后重载。
- **本地化界面** —— 中英文跟随 Web UI 语言。

## 使用

1. 安装（见下），重启 `dsh web`。
2. 设置 → 模型：用**添加自定义提供方**照常创建你的网关提供方（或打开已有的）。
3. 每张第三方提供方卡片下方出现**模型能力**折叠区，展开后按模型选择输入模态与推理状态——会推理的模型选*声明等级*，勾上它的网关真正提供的等级。
4. 点**保存**。写入 `$DSH_HOME/profiles/<profile>/cordis.patch.yml` 用户层，适配器在下一次请求时生效，无需重启。

在这里声明一个模型，写出的正是这样（行内其他字段不动）：

```yaml
models:
  - id: acme-think
    contextWindow: 262144
    maxTokens: 32768
    input:
      - text
      - image
    reasoningEfforts:
      off: null      # 提供该等级，但不发送任何参数
      low: low
      medium: medium
      high: high
      max: ultra     # 网关有自己的叫法
```

## 原理

插件把组件注册进模型页对外开放的 `settings.models.provider-card` 扩展位（key 为 `llm-pi-ai`，即整个 pi-ai 适配器家族的卡片）。折叠区首次展开时通过 settings Remote 读取该提供方存储的 `models` 行，本地编辑后按读取时的 revision 围栏整组写回——与模型页自身卡片相同的数组语义与冲突处理（他人同时改动时提示冲突并重新加载）。行内除 `input` 与 `reasoningEfforts` 外的所有字段原样保留。

折叠区同时订阅 Host 转发的 `settings/document-updated` 事件，并按 provider 目录给出的实际 `settingsNs` 过滤，所以模型页自己写模型列表时能无需重挂载地传到折叠区：已展开且没有草稿的折叠区静默重读，并一直追读到与最新通报的 revision 持平；收起的把通知挂起，等下次展开再重读；正握着未保存草稿的把通知挂起到草稿落定为止，因此重新展开永远不会丢掉编辑。卡片自己那次写入按刚提交的 revision 认出回声，不会再触发一次刷新。


## 插件设置与数据迁移

也可从 **插件 → 模型能力** 打开所有已配置的第三方提供方模型能力编辑器。原来的 **设置 → 模型** 卡片入口保留，两处编辑相同的配置。

首次启动每个 profile 会读取 `$DSH_HOME/settings.yaml`，文件已由 DSH 导入时则读取 `settings.yaml.imported`，将 `llm-pi-ai` 的 provider、模型列表、输入模态、推理等级及密钥引用导入实际 pi-ai 插件行。插件兼容导入只补齐 profile 中缺失的值，数组整体保留，成功后记录迁移标记；失败保留源文件并在重启时重试。多个 pi-ai 行都改名时无法确定归属，保留源文件并记录诊断，需手动指定目标行。迁移不会创建额外提供方，也不会修改原凭据存储。升级前备份 DSH_HOME，升级后各 profile 独立保存设置。

插件显示元数据通过包导出的 `locale/en.json` 与 `locale/zh.json` 提供，使用 `meta.title`、`meta.description`；插件列表、详情及组件名称跟随 DSH 界面语言。`package.json` 的普通描述保留英文供 npm 使用。

自定义图标由 `package.json` 的 `icon: "./icon.svg"` 声明，随 npm 包一起发布。模型能力插件使用紫色模型配置图标。

## 安装

前置条件：DeepSeek Harness（`dsh`）`>=0.1.7-rc.1 <0.1.8-0`（装有 `web` profile）。

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
pnpm test             # 行助手、控制器和迁移的 vitest 测试
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
│  ├─ index.ts             # Host 半边：旧提供方配置迁移到当前 profile
│  ├─ model-row.ts         # 两个声明共用的行词汇（ModelRow、rowId）
│  ├─ image-input.ts       # 每模型 input 声明的纯函数行助手
│  ├─ reasoning-efforts.ts # 每模型 reasoningEfforts 声明的纯函数行助手
│  └─ client/              # Web 半边：模型能力折叠区（controller、card、locales）
├─ tests/                  # 行助手、控制器和迁移的 vitest 测试
├─ build/                  # 自包含客户端 bundle 的 tsdown 预设
├─ .github/workflows/ci.yml       # 校验 + tarball 审计 + 消费者冒烟
├─ .github/workflows/release.yml  # GitHub Release 触发 npm 发布
├─ cordis.patch.yml
└─ README.md / README.zh.md
```

## 已知边界

- 休眠（尚未配置）的提供方卡片不渲染折叠区；新建的自定义提供方在**保存之后**才出现。
- 路由级开关——`defaultInput`、默认推理等级 `reasoning`、`compat` 系列——以及内置提供方目录模型的 `modelOverrides` 不在本插件范围内，仍直接在 `$DSH_HOME/profiles/<profile>/cordis.patch.yml` 中设置。
- 声明等级只是「声明」，不是「校验」：没有任何环节去问网关是否真的提供该等级、是否认这个拼写；等级究竟怎么上线（`reasoning_effort`、thinking budget、chat-template kwargs）由 `compat` 决定。网关不认的等级会在回合中途被提供方拒绝。
- 取消勾选再重新勾选某个等级，会从默认拼写重新开始（等级名本身，`off` 为空），不会恢复它之前带的值。
- 只读设置部署中折叠区可见但不可保存。


## 许可

[MIT](LICENSE) © jcy2387
