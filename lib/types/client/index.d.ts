import type { Context as ClientContext } from '@deepseek-ai/cordis';
/**
 * Client entry: the browser half of the plugin. The only cordis service this
 * fiber needs is `slots` — `useInput`/`inputActions`/`sessionId`/`useSession`
 * arrive as component props from the session standard kit, not as services.
 */
export declare const inject: string[];
export declare function apply(ctx: ClientContext): void;
