# dsh-models-input-modalities

DeepSeek Harness Web 客户端插件：给**设置 → 模型**页的每个第三方（pi-ai）提供方卡片补上一个
**「输入模态」折叠区**，按模型声明它的输入模态列表（是否接受图片）——这正是模型页自带表单没有开放的那个字段。

提供方本身（Provider ID、API 地址、协议、密钥、模型列表）仍然完全在模型页的表单里创建和编辑；
本插件**不预写任何提供方配置**。

## 使用

1. 安装（见下），重启 `dsh web`。
2. 设置 → 模型：用**添加自定义提供方**照常创建你的网关提供方（或打开已有的）。
3. 每张第三方提供方卡片下方出现**输入模态**折叠区，展开后按模型三选一：
   - **提供方默认** — 不写字段，继承已安装目录的模态，再回退路由 `defaultInput`
   - **仅文本** — 写入 `input: [text]`
   - **文本和图片** — 写入 `input: [text, image]`
4. 点**保存**。写入 `$DSH_HOME/settings.yaml` 用户层，适配器在下一次请求时生效，无需重启。

## 原理

插件把组件注册进模型页对外开放的 `settings.models.provider-card` 扩展位（key 为
`llm-pi-ai`，即整个 pi-ai 适配器家族的卡片）。折叠区首次展开时通过 settings Remote 读取该
提供方存储的 `models` 行，本地编辑后按读取时的 revision 围栏整组写回——与模型页自身卡片
相同的数组语义与冲突处理（他人同时改动时提示冲突并重新加载）。行内除 `input` 外的所有
字段原样保留。

## 安装

```sh
dsh plugin --profile web add link:/Users/baojie/Documents/Projects/github/dsh-models-input-modalities
```

- 需要 dsh `>=0.1.5-alpha.1 <0.2.0`（Web profile）。
- `link:` 直接引用本目录，改动后 `pnpm run build` 再重启 dsh 即可；去掉 `link:` 前缀则是
  复制安装，更新需要 `dsh plugin --profile web update`。
- 卸载：`dsh plugin --profile web remove dsh-models-input-modalities`。

## 开发

```sh
pnpm install
pnpm run typecheck   # host + client 双脸
pnpm test            # 纯函数单测
pnpm run build       # tsc d.ts + tsdown（lib/index.js 与 lib/client.cjs）
```

客户端产物是自包含 bundle：React、Cordis、ui-slots、ui-primitives 由 Web 壳供给，CSS Modules
内联，其余 `@deepseek-ai/*` 只做类型导入（构建期的 purity 检查强制）。

## 已知边界

- 休眠（尚未配置）的提供方卡片不渲染折叠区；新建的自定义提供方在**保存之后**才出现。
- 路由级 `defaultInput` 与内置提供方目录模型的 `modelOverrides` 不在本插件范围内，
  仍直接在 `$DSH_HOME/settings.yaml` 中设置。
- 只读设置部署中折叠区可见但不可保存。
