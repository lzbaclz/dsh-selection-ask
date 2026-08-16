import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
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
export declare const buttonCss = "\n.dsa-button {\n  position: fixed;\n  z-index: 2147483000;\n  box-sizing: border-box;\n  display: inline-flex;\n  align-items: center;\n  height: 32px;\n  padding: 0 12px;\n  border: 1px solid var(--dsw-alias-line-normal, rgba(0, 0, 0, 0.12));\n  border-radius: 16px;\n  background: var(--dsw-alias-bg-module-platform, #ffffff);\n  color: var(--dsw-alias-label-primary, #1f2329);\n  font: inherit;\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 1;\n  white-space: nowrap;\n  cursor: pointer;\n  box-shadow: 0 4px 16px color-mix(in srgb, var(--dsw-alias-label-primary, #1f2329) 16%, transparent);\n  transition: background 0.12s, box-shadow 0.12s, transform 0.12s;\n}\n.dsa-button:hover {\n  background: var(--dsw-alias-interactive-bg-hover-solid, rgba(0, 0, 0, 0.05));\n}\n.dsa-button:active {\n  transform: scale(0.97);\n}\n.dsa-button:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-business-primary, #4d6bfe);\n  outline-offset: 2px;\n}\n@media (prefers-reduced-motion: reduce) {\n  .dsa-button { transition: none; }\n}\n";
/** Inject the style tag, owned by the client fiber (removed on dispose/HMR). */
export declare function injectStyle(ctx: ClientContext): void;
