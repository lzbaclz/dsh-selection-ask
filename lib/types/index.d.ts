import type { Context } from '@deepseek-ai/cordis';
/**
 * dsh-selection-ask — host half.
 *
 * This plugin is client-only: all behavior lives in the browser bundle
 * (exports["./client"] → lib/client.js). The host row still has to exist in
 * the composition — the client roster scans Loader entries for packages that
 * declare `dsh.client`, and cordis requires a resolvable plugin body — so this
 * module is deliberately minimal.
 */
export declare const name = "dsh-selection-ask";
/** The host fiber needs no services; the client fiber declares its own. */
export declare const inject: string[];
export declare function apply(_ctx: Context): void;
