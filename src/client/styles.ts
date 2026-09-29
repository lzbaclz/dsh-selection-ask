import type { Context as ClientContext } from '@deepseek-ai/cordis'

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
export const buttonCss = `
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
`

/** Inject the style tag, owned by the client fiber (removed on dispose/HMR). */
export function injectStyle(ctx: ClientContext): void {
  ctx.effect(() => {
    const tag = document.createElement('style')
    tag.dataset.plugin = 'dsh-selection-ask'
    tag.dataset.pluginCss = 'dsh-selection-ask/button.css'
    tag.textContent = buttonCss
    document.head.appendChild(tag)
    return () => {
      tag.remove()
    }
  }, 'dsh-selection-ask: button css')
}
