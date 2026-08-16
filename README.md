# dsh-selection-ask

A ChatGPT-style "select → ask" button for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

Select any text in a conversation and a floating **「询问 DeepSeek」** button appears next to the selection. Click it and the selected text is quoted into the composer as a Markdown blockquote (`> `), with the composer focused and the caret parked at the end — ready for your follow-up question.

[中文说明](./README.zh.md)

## Features

- **Floating button follows the selection** — positioned at the selection's screen coordinates (`position: fixed`), clamped to the viewport, hidden when the selection scrolls away.
- **Only quotes conversation text** — selections must be inside the transcript (`[data-conversation-scroll]`); selections inside the composer itself (quoting the draft back into itself) are ignored.
- **Quote-aware append** — each selected line gets a `> ` prefix; an empty draft is replaced, a non-empty draft gets the quote appended on its own paragraph (blank line in between).
- **Clean integration** — writes through the official `inputActions.setDraft` input-machine API (undo history and draft persistence keep working), never touches DSH internals.
- **Session-scoped** — the button state resets on session switch; the button hides while a takeover composer (question/approval) replaces the default one.

## Requirements

- DeepSeek Harness with the `web` profile (`dsh web`), DSH packages `0.1.0-rc.6` era.
- A browser page on the harness GUI (`http://127.0.0.1:3080` by default).
- Building from source requires Node `^22.19.0 || >=24` and pnpm. Installing the prebuilt package does not (the compiled `lib/` is committed to this repo).

## Installation

### 1. Install the package into your web profile

Pick **one** of the following:

**A. From GitHub (recommended)**

```bash
dsh plugin --profile web add github:lzbaclz/dsh-selection-ask
```

Pin a release tag for reproducibility: `dsh plugin --profile web add github:lzbaclz/dsh-selection-ask#v0.1.0`

**B. From a local clone**

```bash
git clone https://github.com/lzbaclz/dsh-selection-ask.git
dsh plugin --profile web add link:/absolute/path/to/dsh-selection-ask
```

**C. From npm** *(not published yet — `dsh plugin --profile web add dsh-selection-ask` will work once it is)*

`dsh plugin` forwards to pnpm inside your profile directory (`~/.dsh/profiles/<profile>`), so any `pnpm add` specifier works.

### 2. Mount the plugin into the profile composition

The plugin ships its own `cordis.patch.yml` (a one-row `insert`), but the row is only applied automatically when the package is listed in `dsh.profile.bundles`. Choose **one** of the two ways below — **do not do both**, or the entry will be registered twice.

**Option A — profile patch layer (hot-applied, no restart; recommended)**

Append this to `~/.dsh/profiles/web/cordis.patch.yml`:

```yaml
- insert:
    - id: dsh-selection-ask
      name: dsh-selection-ask
      config: {}
```

DSH watches this file and applies the row live. Refresh the browser page and the plugin is loaded.

**Option B — bundle list (boot-composed, needs a restart)**

Add `"dsh-selection-ask"` to the `dsh.profile.bundles` array in `~/.dsh/profiles/web/package.json`, then restart `dsh web`. The package's own `cordis.patch.yml` inserts the row automatically at boot.

> If your profile is not named `web`, replace `web` with your profile name, and replace `~/.dsh` with `$DSH_HOME` when you have a custom harness home.

### 3. Verify

Refresh the GUI page, select a sentence in the chat flow — the **「询问 DeepSeek」** button should float next to your selection. Click it: the text lands in the composer as a quote.

## Usage

1. Select text anywhere in the conversation transcript.
2. Click the **「询问 DeepSeek」** button that floats beside the selection.
3. The selection is quoted into the composer (as `> selected text`), the composer is focused, and the caret is at the end — type your follow-up question and send.

## Uninstall

```bash
dsh plugin --profile web remove dsh-selection-ask
```

Also remove the `insert` row from `cordis.patch.yml` (Option A) or the `dsh.profile.bundles` entry (Option B), then refresh / restart.

## Development

The compiled `lib/` is committed, so normal installs never need a build. To hack on it:

```bash
git clone https://github.com/lzbaclz/dsh-selection-ask.git
cd dsh-selection-ask
pnpm install
pnpm typecheck   # both host and client tsc programs, zero errors
pnpm build       # tsc(host) + tsc(client) + tsdown bundle
pnpm verify      # offline smoke checks over the built artifacts
```

- `src/index.ts` — host half (empty `apply`; exists so the roster scan finds the package).
- `src/client/index.tsx` — browser half: injects CSS, registers into the `conversation.input.overlay` slot.
- `src/client/SelectionAskButton.tsx` — the floating button: selection detection, positioning, quote writing.
- `src/client/quote.ts` — pure `buildQuote` / `appendQuote` helpers (tested offline by `verify`).
- `src/client/styles.ts` — button CSS + HMR-safe `<style>` injection.

After changing `src/`, rebuild and reinstall (or re-`link:`) the package, then refresh the page.

## How it works (short version)

The plugin registers a component into the session-scoped `conversation.input.overlay` slot, which grants it the session input kit (`useInput`, `inputActions`). A document-level `selectionchange`/`mouseup` listener detects selections inside the transcript and renders a `position: fixed` button at the selection's bounding rect. Clicking builds a Markdown quote, joins it with the current draft, and writes the full draft through `inputActions.setDraft` — the input machine's official write path — then focuses the composer textarea.

## License

MIT
