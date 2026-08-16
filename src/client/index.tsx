import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// Type-only module loads so their declaration merges apply in this program:
// - ui-conversation merges `useInput`/`inputActions` into SessionStandardProps;
// - ui-input-trigger declares the `conversation.input.overlay` SlotMap entry.
// Both are erased at compile time (purity gate).
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
import type {} from '@deepseek-ai/dsh-client-ui-input-trigger/client'
import { SelectionAskButton } from './SelectionAskButton.tsx'
import { injectStyle } from './styles.ts'

/**
 * Client entry: the browser half of the plugin. The only cordis service this
 * fiber needs is `slots` — `useInput`/`inputActions`/`sessionId`/`useSession`
 * arrive as component props from the session standard kit, not as services.
 */
export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  // Floating-button CSS as an HMR-safe <style data-plugin> tag (effect-owned).
  injectStyle(ctx)

  // Register into conversation.input.overlay (the zero-height anchor above the
  // composer). slots.inject waits for the declarer (ui-conversation's composer)
  // to come up, then routes the registration (and its unload cascade) through
  // this fiber. The button escapes the anchor with position:fixed.
  ctx.slots.inject(
    'conversation.input.overlay',
    () =>
      ctx.slots.register(
        {
          name: 'conversation.input.overlay',
          id: 'dsh-selection-ask', // list slot: id is required and unique
        },
        SelectionAskButton,
      ),
  )
}
