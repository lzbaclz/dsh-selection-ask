import type { ReactElement } from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** The slot's composed props: owner share {} + session kit + global kit. */
type SelectionAskProps = PropsRuntime<'conversation.input.overlay'>;
/**
 * The floating 「询问 DeepSeek」 button. Rendered inside the composer's
 * `conversation.input.overlay` anchor (a zero-height absolute node); the
 * button escapes it with `position: fixed` and floats over the transcript at
 * viewport coordinates derived from the selection rect.
 */
export declare function SelectionAskButton({ useInput, inputActions, }: SelectionAskProps): ReactElement | null;
export {};
