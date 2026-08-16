# dsh-selection-ask

为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 打造的 ChatGPT 式「选中 → 询问」悬浮按钮插件。

在会话聊天流里**选中一段文字**，选区旁边会浮出一个 **「询问 DeepSeek」** 按钮；点击后，选中的文字会以 Markdown 引用（`> ` 前缀）形式写入输入框，并自动聚焦、把光标移到末尾——直接接着打字追问即可。

[English README](./README.md)

## 特性

- **按钮跟随选区** —— 用 `position: fixed` 定位到选区的屏幕坐标（`getBoundingClientRect()`），自动贴边钳制，选区完全滚出视口后隐藏。
- **只引用聊天流里的文字** —— 选区必须落在会话聊天流容器（`[data-conversation-scroll]`）内；在输入框（composer）内选中文字不会触发按钮（把草稿引用回草稿没有意义）。
- **引用感知的拼接** —— 多行选区逐行加 `> ` 前缀；草稿为空时直接替换，草稿非空时以空行隔开追加成独立段落。
- **干净集成** —— 通过官方 `inputActions.setDraft` 输入机 API 写入（撤销历史、草稿持久化全部照常），不碰 DSH 内部实现。
- **会话级作用域** —— 切换会话自动重置按钮状态；提问/审批 composer 接管输入区时按钮随默认输入条一起隐藏。

## 环境要求

- 带 `web` profile 的 DeepSeek Harness（`dsh web`），DSH 包版本为 `0.1.0-rc.6` 一代。
- 浏览器打开 harness GUI（默认 `http://127.0.0.1:3080`）。
- 从源码构建需要 Node `^22.19.0 || >=24` 和 pnpm；**直接安装不需要**（编译好的 `lib/` 已提交进本仓库）。

## 安装

### 第 1 步：把包装进你的 web profile

以下三种方式**任选其一**：

**A. 从 GitHub 安装（推荐）**

```bash
dsh plugin --profile web add github:lzbaclz/dsh-selection-ask
```

想固定版本可指定 tag：`dsh plugin --profile web add github:lzbaclz/dsh-selection-ask#v0.1.0`

**B. 从本地克隆安装**

```bash
git clone https://github.com/lzbaclz/dsh-selection-ask.git
dsh plugin --profile web add link:/绝对路径/dsh-selection-ask
```

**C. 从 npm 安装** *（尚未发布 npm；发布后 `dsh plugin --profile web add dsh-selection-ask` 即可用）*

`dsh plugin` 会把参数原样转发给 profile 目录（`~/.dsh/profiles/<profile>`）里的 pnpm，所以任何 `pnpm add` 写法都支持。

### 第 2 步：把插件挂进 profile 组合

插件自带 `cordis.patch.yml`（一行 `insert`），但该行只有在包被列入 `dsh.profile.bundles` 时才会在启动时自动应用。下面两种方式**二选一，不要同时用**（同时用会重复注册）。

**方式 A —— profile patch 层（热应用、无需重启；推荐）**

把下面这段追加到 `~/.dsh/profiles/web/cordis.patch.yml`：

```yaml
- insert:
    - id: dsh-selection-ask
      name: dsh-selection-ask
      config: {}
```

DSH 会实时监听这个文件并热应用该行。**刷新浏览器页面**，插件即已加载。

**方式 B —— bundles 列表（启动时组合，需重启）**

把 `"dsh-selection-ask"` 加进 `~/.dsh/profiles/web/package.json` 里的 `dsh.profile.bundles` 数组，然后重启 `dsh web`。插件包自带的 `cordis.patch.yml` 会在启动时自动插入那一行。

> 如果你的 profile 不叫 `web`，把 `web` 换成你的 profile 名；自定义了 harness 主目录的话，把 `~/.dsh` 换成你的 `$DSH_HOME`。

### 第 3 步：验证

刷新 GUI 页面，在聊天流里选中一句话——选区旁边应浮出 **「询问 DeepSeek」** 按钮。点击它，文字会以引用形式进入输入框。

## 使用方法

1. 在会话聊天流里选中任意文字。
2. 点击选区旁浮出的 **「询问 DeepSeek」** 按钮。
3. 选中文字被引用进输入框（形如 `> 选中的文字`），输入框已聚焦、光标在末尾——直接输入追问并发送。

## 卸载

```bash
dsh plugin --profile web remove dsh-selection-ask
```

同时删除 `cordis.patch.yml` 里的 `insert` 行（方式 A）或 `dsh.profile.bundles` 里的条目（方式 B），然后刷新 / 重启。

## 开发

编译好的 `lib/` 已提交，正常安装永远不需要构建。想改代码：

```bash
git clone https://github.com/lzbaclz/dsh-selection-ask.git
cd dsh-selection-ask
pnpm install
pnpm typecheck   # host + client 两段 tsc，零错误
pnpm build       # tsc(host) + tsc(client) + tsdown 打包
pnpm verify      # 对构建产物做离线冒烟校验
```

- `src/index.ts` —— host 半（空 `apply`；它的存在是为了让服务器插件名册扫描到本包）。
- `src/client/index.tsx` —— 浏览器半：注入样式，注册进 `conversation.input.overlay` 插槽。
- `src/client/SelectionAskButton.tsx` —— 悬浮按钮组件：选区检测 / 定位 / 引用写入。
- `src/client/quote.ts` —— 纯逻辑 `buildQuote` / `appendQuote`（`verify` 离线测试的对象）。
- `src/client/styles.ts` —— 按钮样式 + HMR 安全的 `<style>` 注入。

改完 `src/` 后重新构建、重新安装（或重新 `link:`）包，再刷新页面即可。

## 原理（简版）

插件把一个组件注册进会话级插槽 `conversation.input.overlay`，从而获得会话输入套件（`useInput`、`inputActions`）。组件在文档层监听 `selectionchange` / `mouseup`，检测到聊天流内的有效选区后，在选区包围盒处渲染一个 `position: fixed` 按钮。点击时把选区转成 Markdown 引用、与当前草稿拼接，通过输入机官方写入口 `inputActions.setDraft` 全文写入，最后聚焦输入框 textarea。

## 许可证

MIT
