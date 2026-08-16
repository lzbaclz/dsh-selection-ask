# dsh-selection-ask

ChatGPT 式的「选中文字 → 询问 DeepSeek」悬浮按钮插件，用于 DeepSeek Harness。

在会话聊天流里**选中一段文字**，选区附近会浮出一个 **「询问 DeepSeek」** 按钮；点击后，选中的文字会以 Markdown 引用（`> ` 前缀）形式拼进当前输入框，并自动聚焦、把光标移到末尾。

## 行为说明

- **只对聊天流内的选区生效**：选区必须落在 `[data-conversation-scroll]` 容器内；输入框（composer）内的选区不会触发按钮。
- **按钮跟随选区**：按钮用 `position: fixed` 定位到选区 `getBoundingClientRect()` 的视口坐标，滚动/缩放时跟随并自动贴边钳制；选区完全滚出视口后隐藏。
- **引用拼接**：多行选区逐行加 `> ` 前缀；已有草稿时以空行隔开追加，空草稿直接替换。写入走 `inputActions.setDraft`（全量替换）。
- **无 session 时不挂载**：`conversation.input.overlay` 是 session 级插槽，切换会话自动重挂载、清空选区状态。
- **composer 被接管时按钮隐藏**：提问/审批 composer 接管输入区时，overlay 锚点随默认输入条一起隐藏。

## 安装

```bash
pnpm install
pnpm dev:types        # symlink 本机 profile 里的 @deepseek-ai/* 类型
pnpm build            # tsc(host) + tsc(client) + tsdown 打包
pnpm verify           # 离线冒烟校验
```

然后把本包通过 `dsh` 安装进运行中的 profile（`cordis.patch.yml` 提供 `dsh-selection-ask` 行）。

## 结构

- `src/index.ts` — host 半（空 apply，仅用于 cordis 解析插件体）
- `src/client/index.tsx` — 浏览器半：注入样式 + 注册进 `conversation.input.overlay`
- `src/client/SelectionAskButton.tsx` — 悬浮按钮组件（选区检测 / 定位 / 引用拼接）
- `src/client/quote.ts` — 纯逻辑（`buildQuote` / `appendQuote`，可离线测试）
- `src/client/styles.ts` — 按钮样式 + HMR-safe `<style>` 注入

## 许可证

MIT
