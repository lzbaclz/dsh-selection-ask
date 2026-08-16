# dsh-selection-ask

![banner](assets/banner.png)

[![npm](https://img.shields.io/badge/npm-v0.1.0-cb3837)](https://www.npmjs.com/package/dsh-selection-ask)
[![license](https://img.shields.io/badge/license-MIT-2fbf8f)](LICENSE)
[![node](https://img.shields.io/badge/node-%5E22.19%20%7C%7C%20%3E%3D24-5FA04E?logo=nodedotjs)](https://nodejs.org/)
[![stars](https://img.shields.io/github/stars/lzbaclz/dsh-selection-ask.svg)](https://github.com/lzbaclz/dsh-selection-ask)
[![dsh plugin](https://img.shields.io/badge/dsh-plugin-4d6bfe)](https://github.com/deepseek-ai/deepseek-harness)

[简体中文](README.zh.md) · [Installation](#installation) · [Usage](#usage) · [Development](#development) · [Troubleshooting](#troubleshooting) · [License](#license)

**Select it. Quote it. Ask DeepSeek.**

DeepSeek Harness is a text-first terminal/agent workspace. But quoting a piece of context back into the chat should be one gesture, not a copy-paste chore. **dsh-selection-ask** gives the web GUI a ChatGPT-style selection helper: select text in a conversation and a floating **「询问 DeepSeek」** button appears beside it. Click it — the selection is quoted into the composer as a Markdown blockquote (`> `), the composer is focused, and the caret is parked at the end. Just type your follow-up and send.

## Why

- **Zero friction quoting** — the exact gesture you know from ChatGPT, in DeepSeek Harness.
- **Official integration, no hacks** — writes through the harness's `inputActions.setDraft` input-machine API, so undo history and draft persistence keep working. It never touches DSH internals or DOM state directly.
- **One command to install** — the compiled `lib/` is committed, so a `github:` install fetches ready-to-load artifacts with no build step.

## Features

- **Button follows the selection** — positioned at the selection's screen coordinates (`position: fixed`), clamped to the viewport, hidden once the selection scrolls away.
- **Quotes conversation text only** — selections must be inside the transcript (`[data-conversation-scroll]`); selecting inside the composer itself does nothing (quoting the draft back into itself is nonsense).
- **Quote-aware append** — every selected line gets a `> ` prefix; an empty draft is replaced, a non-empty draft gets the quote appended as its own paragraph (blank line in between).
- **Session-scoped** — the button state resets on session switch, and the button hides while a takeover composer (question/approval) replaces the default one.

## Requirements

- DeepSeek Harness with the `web` profile (`dsh web`), DSH packages of the `0.1.0-rc.6` era.
- A browser page on the harness GUI (`http://127.0.0.1:3080` by default).
- Building from source needs Node `^22.19.0 || >=24` and pnpm. **Installing the prebuilt package does not** (compiled `lib/` is committed).

## Installation

### 1. Install the package

**From GitHub (recommended)**

```bash
dsh plugin --profile web add github:lzbaclz/dsh-selection-ask
```

Pin a release for reproducibility: `dsh plugin --profile web add github:lzbaclz/dsh-selection-ask#v0.1.0`

**From a local clone**

```bash
git clone https://github.com/lzbaclz/dsh-selection-ask.git
dsh plugin --profile web add link:/absolute/path/to/dsh-selection-ask
```

**From npm** *(not published yet — `dsh plugin --profile web add dsh-selection-ask` will work once it is; see [Roadmap](#roadmap))*

### 2. Activate it

`dsh plugin add` already registers the package in your profile's `dsh.profile.bundles` list, and this package ships its own `cordis.patch.yml`, so the entry row is inserted **automatically at boot**. Choose **one** of the two activation paths — **never both**.

**Path A — restart (zero YAML editing; recommended for new setups)**

Restart `dsh web` (or just start it if it is not running). Done — no config files to edit.

```bash
# stop your dsh web process, then:
dsh web
```

**Path B — hot activation on a running server (no restart)**

Use raw `pnpm` (not `dsh plugin`, which would also register the bundle) so the bundles list is untouched, then patch the profile's patch layer, which DSH watches and applies live:

```bash
cd ~/.dsh/profiles/web
pnpm add github:lzbaclz/dsh-selection-ask
```

Now open `~/.dsh/profiles/web/cordis.patch.yml` and **replace** the `[]` with the insert block — the file must stay a valid YAML list:

```yaml
# BEFORE:
# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; `!!js` expressions allowed).
[]

# AFTER:
# Your patch layer for this dsh profile, applied after every bundle layer:
# a top-level YAML array of loader patch entries (id-targeted config
# overrides, disables, and insert lists; `!!js` expressions allowed).
- insert:
    - id: dsh-selection-ask
      name: dsh-selection-ask
      config: {}
```

Save the file and **refresh the browser page** — the plugin is loaded.

> ⚠️ **Do not combine Path A and Path B** (e.g. `dsh plugin add` + a manual patch row): the entry would be registered twice and `dsh web` fails to boot with `duplicate loader entry id: dsh-selection-ask`.
>
> ⚠️ **Do not append** the YAML block after an existing `[]` — that produces an invalid file and `dsh web` fails to boot with `failed to parse patches`. Replace the `[]` as shown above.
>
> If your profile is not named `web`, substitute your profile name; if you set a custom harness home, substitute your `$DSH_HOME` for `~/.dsh`.

### 3. Verify

Refresh the GUI page and select a sentence in the chat flow — the **「询问 DeepSeek」** button floats beside the selection. Click it: the text lands in the composer as a quote.

## Usage

1. Select text anywhere in the conversation transcript.
2. Click the **「询问 DeepSeek」** button floating beside the selection.
3. The selection is quoted into the composer (`> selected text`), the composer is focused and the caret is at the end — type your follow-up question and send.

## Uninstall

```bash
dsh plugin --profile web remove dsh-selection-ask
```

If you used Path B, also remove the `insert` block from `cordis.patch.yml` (put the `[]` back), then refresh / restart.

## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `dsh web` fails to boot: `failed to parse patches` | The insert block was appended after the file's existing `[]`, making the YAML invalid. Replace the `[]` with the block instead (see [Path B](#2-activate-it)). |
| `dsh web` fails to boot: `duplicate loader entry id: dsh-selection-ask` | The package is registered twice — you used `dsh plugin add` (which adds the bundle) **and** a manual patch row. Remove one of the two. |
| Installed via `dsh plugin add` but nothing appears after a page refresh | Bundle-list changes are composed at boot — restart `dsh web` (Path A), or use the hot-activation Path B. |
| Button never appears after selecting text | Selection is outside the transcript (try selecting a chat message), the page wasn't refreshed after activation, or the `insert` row is missing. |
| Button appears but click does nothing | An outdated bundle is cached — hard-refresh the page (Cmd/Ctrl+Shift+R). If the package was rebuilt locally, re-run `pnpm build` and re-`link:` it. |
| Button gone while a question card is showing | Expected: the overlay hides with the default composer under a takeover. It returns when the default composer does. |
| `dsh plugin add` fails | Any pnpm specifier works (`link:`, `github:`, tarball URL). Check the profile path under `~/.dsh/profiles/` and your Node version. |

## Development

The compiled `lib/` is committed, so normal installs never need a build. To hack on it:

```bash
git clone https://github.com/lzbaclz/dsh-selection-ask.git
cd dsh-selection-ask
pnpm install
pnpm typecheck   # host + client tsc programs, zero errors
pnpm build       # tsc(host) + tsc(client) + tsdown bundle
pnpm verify      # offline smoke checks over the built artifacts
```

- `src/index.ts` — host half (empty `apply`; exists so the roster scan finds the package).
- `src/client/index.tsx` — browser half: injects CSS, registers into the `conversation.input.overlay` slot.
- `src/client/SelectionAskButton.tsx` — the floating button: selection detection, positioning, quote writing.
- `src/client/quote.ts` — pure `buildQuote` / `appendQuote` helpers (exercised offline by `verify`).
- `src/client/styles.ts` — button CSS + HMR-safe `<style>` injection.

After changing `src/`, rebuild, reinstall (or re-`link:`), and refresh the page.

## How it works

The plugin registers a component into the session-scoped `conversation.input.overlay` slot, which grants it the session input kit (`useInput`, `inputActions`). A document-level `selectionchange`/`mouseup` listener detects selections inside the transcript and renders a `position: fixed` button at the selection's bounding rect. Clicking builds a Markdown quote, joins it with the current draft, writes the full draft through `inputActions.setDraft` — the input machine's official write path — then focuses the composer textarea.

## Roadmap

- [ ] Publish to npm (`dsh plugin --profile web add dsh-selection-ask`).
- [ ] Optional keyboard shortcut (e.g. ⌘⇧Q) to quote the current selection.
- [ ] Configurable button label / language.

## License

[MIT](./LICENSE) © lzbaclz

---

Issues and PRs are welcome any time — [open an issue](https://github.com/lzbaclz/dsh-selection-ask/issues) and tell us what you built with it.
