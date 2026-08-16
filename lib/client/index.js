import { SelectionAskButton } from "./SelectionAskButton.js";
import { injectStyle } from "./styles.js";
/**
 * Client entry: the browser half of the plugin. The only cordis service this
 * fiber needs is `slots` — `useInput`/`inputActions`/`sessionId`/`useSession`
 * arrive as component props from the session standard kit, not as services.
 */
export const inject = ['slots'];
export function apply(ctx) {
    // Floating-button CSS as an HMR-safe <style data-plugin> tag (effect-owned).
    injectStyle(ctx);
    // Register into conversation.input.overlay (the zero-height anchor above the
    // composer). slots.inject waits for the declarer (ui-conversation's composer)
    // to come up, then routes the registration (and its unload cascade) through
    // this fiber. The button escapes the anchor with position:fixed.
    ctx.slots.inject('conversation.input.overlay', () => ctx.slots.register({
        name: 'conversation.input.overlay',
        id: 'dsh-selection-ask', // list slot: id is required and unique
    }, SelectionAskButton));
}
