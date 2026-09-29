window.__ModuleLoader__.load({
	id: "dsh-selection-ask",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react_jsx_runtime = require("react/jsx-runtime");
		let react = require("react");
		//#region lib/client/quote.js
		/**
		* Pure draft-quoting helpers (no DOM, no framework). Kept in their own module
		* so `scripts/verify.mjs` can exercise them offline after the build.
		*/
		/**
		* Turn a raw selection into a Markdown blockquote: one `> ` prefix per line.
		* Multi-line selections become a single quoted block.
		*/
		function buildQuote(selection) {
			return selection.split("\n").map((line) => `> ${line}`).join("\n");
		}
		/**
		* Append a quote to the current draft. An empty (or whitespace-only) draft is
		* replaced outright; otherwise the quote is appended on its own paragraph.
		* `setDraft` is a full-draft replace, so the join must happen here.
		*/
		function appendQuote(draft, quote) {
			return draft.trim() === "" ? quote : `${draft}\n\n${quote}`;
		}
		//#endregion
		//#region lib/client/SelectionAskButton.js
		/** Gap (px) between the selection edge and the floating surface. */
		const GAP = 8;
		/** Viewport edge padding (px) used when clamping the floating position. */
		const MARGIN = 8;
		/**
		* Read the current DOM selection when it qualifies for quoting: non-empty,
		* inside the conversation transcript (`[data-conversation-scroll]`) OR inside
		* an in-app document preview (`[data-document-preview]` / the rendered
		* markdown body / a text preview tab), but NOT inside the composer card
		* (quoting the draft back into itself is nonsense). Returns null otherwise —
		* including selections scrolled fully off-screen.
		*/
		function readSelection() {
			const selection = window.getSelection();
			if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
			const text = selection.toString().trim();
			if (!text) return null;
			const range = selection.getRangeAt(0);
			const ancestor = range.commonAncestorContainer;
			const node = ancestor.nodeType === Node.ELEMENT_NODE ? ancestor : ancestor.parentElement;
			if (!node) return null;
			const inTranscript = node.closest("[data-conversation-scroll]");
			const inDocPreview = node.closest("[data-document-preview]") || node.closest("[data-document-markdown]") || node.closest("[data-textpreview-state]");
			if (!inTranscript && !inDocPreview) return null;
			if (node.closest("[data-composer-card]")) return null;
			const rect = range.getBoundingClientRect();
			if (rect.width === 0 && rect.height === 0) return null;
			if (rect.right < 0 || rect.bottom < 0 || rect.left > window.innerWidth || rect.top > window.innerHeight) return null;
			return {
				text,
				rect
			};
		}
		/**
		* The floating 「询问 DeepSeek」 surface. Rendered inside the composer's
		* `conversation.input.overlay` anchor (a zero-height absolute node); the
		* surface escapes it with `position: fixed` and floats over the transcript at
		* viewport coordinates derived from the selection rect.
		*
		* Clicking the pill transforms it in place into a small compose card: the
		* selection is pre-quoted into the textarea, the user types the follow-up
		* right there, and Enter saves it onto the resident composer draft
		* (`setDraft` only — never auto-sends) so several selections can
		* accumulate before one manual send.
		*/
		function SelectionAskButton({ useInput, inputActions }) {
			const draft = useInput((s) => s.draft);
			const [sel, setSel] = (0, react.useState)(null);
			const [mode, setMode] = (0, react.useState)("pill");
			const [pos, setPos] = (0, react.useState)(null);
			const [text, setText] = (0, react.useState)("");
			const pillRef = (0, react.useRef)(null);
			const cardRef = (0, react.useRef)(null);
			const composingRef = (0, react.useRef)(false);
			const updateSelection = (0, react.useCallback)(() => {
				if (composingRef.current) return;
				setSel(readSelection());
			}, []);
			(0, react.useEffect)(() => {
				document.addEventListener("selectionchange", updateSelection);
				document.addEventListener("mouseup", updateSelection);
				document.addEventListener("keyup", updateSelection);
				document.addEventListener("scroll", updateSelection, {
					capture: true,
					passive: true
				});
				window.addEventListener("resize", updateSelection);
				return () => {
					document.removeEventListener("selectionchange", updateSelection);
					document.removeEventListener("mouseup", updateSelection);
					document.removeEventListener("keyup", updateSelection);
					document.removeEventListener("scroll", updateSelection, { capture: true });
					window.removeEventListener("resize", updateSelection);
				};
			}, [updateSelection]);
			(0, react.useLayoutEffect)(() => {
				const el = mode === "compose" ? cardRef.current : pillRef.current;
				if (!sel || !el) {
					setPos(null);
					return;
				}
				const w = el.offsetWidth;
				const h = el.offsetHeight;
				let left = sel.rect.right - w;
				let top = sel.rect.top - h - GAP;
				if (top < MARGIN) top = sel.rect.bottom + GAP;
				left = Math.min(Math.max(MARGIN, left), window.innerWidth - w - MARGIN);
				top = Math.min(Math.max(MARGIN, top), window.innerHeight - h - MARGIN);
				setPos({
					top,
					left
				});
			}, [sel, mode]);
			(0, react.useEffect)(() => {
				if (mode !== "compose") return;
				const ta = cardRef.current?.querySelector("textarea");
				if (ta) {
					ta.focus({ preventScroll: true });
					ta.setSelectionRange(ta.value.length, ta.value.length);
				}
			}, [mode]);
			const close = (0, react.useCallback)(() => {
				composingRef.current = false;
				setMode("pill");
				setSel(null);
				setPos(null);
				setText("");
			}, []);
			const openCompose = (0, react.useCallback)(() => {
				if (!sel) return;
				composingRef.current = true;
				setText(buildQuote(sel.text) + "\n\n");
				setMode("compose");
				window.getSelection()?.removeAllRanges();
			}, [sel]);
			const save = (0, react.useCallback)(() => {
				const body = text.trim();
				if (!body) {
					close();
					return;
				}
				inputActions.setDraft(appendQuote(draft, body));
				close();
			}, [
				text,
				draft,
				inputActions,
				close
			]);
			const onCardKeyDown = (event) => {
				if (event.key === "Enter" && !event.shiftKey) {
					event.preventDefault();
					save();
				} else if (event.key === "Escape") {
					event.preventDefault();
					close();
				}
			};
			if (!sel) return null;
			const style = pos ? {
				position: "fixed",
				top: pos.top,
				left: pos.left
			} : {
				position: "fixed",
				top: -9999,
				left: -9999,
				opacity: 0
			};
			if (mode === "compose") return (0, react_jsx_runtime.jsxs)("div", {
				ref: cardRef,
				className: "dsa-card",
				style,
				onMouseDown: (event) => event.stopPropagation(),
				children: [(0, react_jsx_runtime.jsx)("textarea", {
					className: "dsa-card-input",
					value: text,
					onChange: (event) => setText(event.target.value),
					onKeyDown: onCardKeyDown,
					placeholder: "补充你的问题或评论…"
				}), (0, react_jsx_runtime.jsxs)("div", {
					className: "dsa-card-actions",
					children: [
						(0, react_jsx_runtime.jsx)("span", {
							className: "dsa-card-hint",
							children: "Enter 保存 · Shift+Enter 换行 · Esc 取消"
						}),
						(0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsa-card-btn",
							onMouseDown: (event) => event.preventDefault(),
							onClick: close,
							children: "取消"
						}),
						(0, react_jsx_runtime.jsx)("button", {
							type: "button",
							className: "dsa-card-btn dsa-card-btn-send",
							onMouseDown: (event) => event.preventDefault(),
							onClick: save,
							children: "保存到会话"
						})
					]
				})]
			});
			return (0, react_jsx_runtime.jsx)("button", {
				ref: pillRef,
				type: "button",
				className: "dsa-button",
				style,
				onMouseDown: (event) => event.preventDefault(),
				onClick: openCompose,
				children: "询问 DeepSeek"
			});
		}
		//#endregion
		//#region lib/client/styles.js
		/**
		* Floating 「询问 DeepSeek」 surface CSS. Plain CSS string injected via an
		* HMR-safe `<style data-plugin="dsh-selection-ask">` tag. Stable prefixed
		* class names (`dsa-*`), DSH theme vars — never hashed class names of other
		* packages.
		*
		* Theme variables use ONLY the published theme-token catalog
		* (`Theme.listTokens`): bg-base / bg-layer-1 / bg-overlay / border-l1 /
		* label-primary / label-secondary / brand-primary. Earlier revisions
		* invented `--dsw-alias-bg-module-platform`-style names that resolve to
		* nothing on the shipped themes, which left the compose card white-on-white
		* under the dark theme; keep new styles on the catalog names.
		*
		* The surface renders inside the composer's `conversation.input.overlay`
		* anchor, a `height:0; position:absolute` node. `position:fixed` escapes that
		* anchor (no transformed ancestor), so top/left are viewport coordinates fed
		* from `range.getBoundingClientRect()`.
		*/
		const buttonCss = `
.dsa-button {
  position: fixed;
  z-index: 2147483000;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  height: 32px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.12));
  border-radius: 16px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2329);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 4px 16px color-mix(in srgb, var(--dsw-alias-label-primary, #1f2329) 16%, transparent);
  transition: background 0.12s, box-shadow 0.12s, transform 0.12s;
}
.dsa-button:hover {
  background: var(--dsw-alias-bg-layer-1, rgba(0, 0, 0, 0.05));
}
.dsa-button:active {
  transform: scale(0.97);
}
.dsa-button:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #4d6bfe);
  outline-offset: 2px;
}
.dsa-card {
  position: fixed;
  z-index: 2147483000;
  box-sizing: border-box;
  width: 400px;
  max-width: calc(100vw - 16px);
  padding: 10px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.12));
  border-radius: 12px;
  background: var(--dsw-alias-bg-overlay, #ffffff);
  box-shadow: 0 8px 28px color-mix(in srgb, var(--dsw-alias-label-primary, #1f2329) 22%, transparent);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dsa-card-input {
  box-sizing: border-box;
  width: 100%;
  min-height: 96px;
  max-height: 240px;
  resize: vertical;
  padding: 8px 10px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.12));
  border-radius: 8px;
  background: var(--dsw-alias-bg-base, #ffffff);
  color: var(--dsw-alias-label-primary, #1f2329);
  caret-color: var(--dsw-alias-label-primary, #1f2329);
  font: inherit;
  font-size: 13px;
  line-height: 1.55;
}
.dsa-card-input:focus {
  outline: 2px solid var(--dsw-alias-brand-primary, #4d6bfe);
  outline-offset: 0;
}
.dsa-card-input::placeholder {
  color: var(--dsw-alias-label-secondary, rgba(0, 0, 0, 0.4));
}
.dsa-card-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
}
.dsa-card-hint {
  margin-right: auto;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary, rgba(0, 0, 0, 0.4));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dsa-card-btn {
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  height: 28px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l1, rgba(0, 0, 0, 0.12));
  border-radius: 14px;
  background: transparent;
  color: var(--dsw-alias-label-primary, #1f2329);
  font: inherit;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 0.12s, transform 0.12s;
}
.dsa-card-btn:hover {
  background: var(--dsw-alias-bg-layer-1, rgba(0, 0, 0, 0.05));
}
.dsa-card-btn:active {
  transform: scale(0.97);
}
.dsa-card-btn-send {
  border-color: transparent;
  background: var(--dsw-alias-brand-primary, #4d6bfe);
  color: #ffffff;
}
.dsa-card-btn-send:hover {
  background: color-mix(in srgb, var(--dsw-alias-brand-primary, #4d6bfe) 85%, #000000);
}
.dsa-card-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-primary, #4d6bfe);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .dsa-button, .dsa-card-btn { transition: none; }
}
`;
		/** Inject the style tag, owned by the client fiber (removed on dispose/HMR). */
		function injectStyle(ctx) {
			ctx.effect(() => {
				const tag = document.createElement("style");
				tag.dataset.plugin = "dsh-selection-ask";
				tag.dataset.pluginCss = "dsh-selection-ask/button.css";
				tag.textContent = buttonCss;
				document.head.appendChild(tag);
				return () => {
					tag.remove();
				};
			}, "dsh-selection-ask: button css");
		}
		//#endregion
		//#region lib/client/index.js
		/**
		* Client entry: the browser half of the plugin. The only cordis service this
		* fiber needs is `slots` — `useInput`/`inputActions`/`sessionId`/`useSession`
		* arrive as component props from the session standard kit, not as services.
		*/
		const inject = ["slots"];
		function apply(ctx) {
			injectStyle(ctx);
			ctx.slots.inject("conversation.input.overlay", () => ctx.slots.register({
				name: "conversation.input.overlay",
				id: "dsh-selection-ask"
			}, SelectionAskButton));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map