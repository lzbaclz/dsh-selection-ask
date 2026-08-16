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
		/** Gap (px) between the selection edge and the button. */
		const GAP = 8;
		/** Viewport edge padding (px) used when clamping the button position. */
		const MARGIN = 8;
		/**
		* Read the current DOM selection when it qualifies for quoting: non-empty,
		* inside the conversation transcript (`[data-conversation-scroll]`), but NOT
		* inside the composer card (quoting the draft back into itself is nonsense).
		* Returns null otherwise — including selections scrolled fully off-screen.
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
			if (!node.closest("[data-conversation-scroll]")) return null;
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
		* The floating 「询问 DeepSeek」 button. Rendered inside the composer's
		* `conversation.input.overlay` anchor (a zero-height absolute node); the
		* button escapes it with `position: fixed` and floats over the transcript at
		* viewport coordinates derived from the selection rect.
		*/
		function SelectionAskButton({ useInput, inputActions }) {
			const draft = useInput((s) => s.draft);
			const [sel, setSel] = (0, react.useState)(null);
			const [pos, setPos] = (0, react.useState)(null);
			const buttonRef = (0, react.useRef)(null);
			const updateSelection = (0, react.useCallback)(() => {
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
				const el = buttonRef.current;
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
			}, [sel]);
			const writeQuote = (0, react.useCallback)(() => {
				if (!sel) return;
				const next = appendQuote(draft, buildQuote(sel.text));
				inputActions.setDraft(next);
				window.getSelection()?.removeAllRanges();
				setSel(null);
				setPos(null);
				requestAnimationFrame(() => {
					const ta = document.querySelector("[data-composer-card] textarea");
					if (!ta) return;
					ta.focus({ preventScroll: true });
					ta.setSelectionRange(ta.value.length, ta.value.length);
				});
			}, [
				sel,
				draft,
				inputActions
			]);
			if (!sel) return null;
			return (0, react_jsx_runtime.jsx)("button", {
				ref: buttonRef,
				type: "button",
				className: "dsa-button",
				style: pos ? {
					position: "fixed",
					top: pos.top,
					left: pos.left
				} : {
					position: "fixed",
					top: -9999,
					left: -9999,
					opacity: 0
				},
				onMouseDown: (event) => event.preventDefault(),
				onClick: writeQuote,
				children: "询问 DeepSeek"
			});
		}
		//#endregion
		//#region lib/client/styles.js
		/**
		* Floating 「询问 DeepSeek」 button CSS. Plain CSS string injected via an
		* HMR-safe `<style data-plugin="dsh-selection-ask">` tag. Stable prefixed
		* class name (`dsa-button`), DSH theme vars (`--dsw-alias-*`) — never hashed
		* class names of other packages.
		*
		* The button renders inside the composer's `conversation.input.overlay`
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
  border: 1px solid var(--dsw-alias-line-normal, rgba(0, 0, 0, 0.12));
  border-radius: 16px;
  background: var(--dsw-alias-bg-module-platform, #ffffff);
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
  background: var(--dsw-alias-interactive-bg-hover-solid, rgba(0, 0, 0, 0.05));
}
.dsa-button:active {
  transform: scale(0.97);
}
.dsa-button:focus-visible {
  outline: 2px solid var(--dsw-alias-state-business-primary, #4d6bfe);
  outline-offset: 2px;
}
@media (prefers-reduced-motion: reduce) {
  .dsa-button { transition: none; }
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