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
export const buttonCss = `
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
export function injectStyle(ctx) {
    ctx.effect(() => {
        const tag = document.createElement('style');
        tag.dataset.plugin = 'dsh-selection-ask';
        tag.dataset.pluginCss = 'dsh-selection-ask/button.css';
        tag.textContent = buttonCss;
        document.head.appendChild(tag);
        return () => {
            tag.remove();
        };
    }, 'dsh-selection-ask: button css');
}
