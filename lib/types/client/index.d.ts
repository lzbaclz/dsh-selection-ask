import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
/**
 * Client entry: the browser half of the plugin. The only cordis service this
 * fiber needs is `slots` — `useInput`/`inputActions`/`sessionId`/`useSession`
 * arrive as component props from the session standard kit, not as services.
 */
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
