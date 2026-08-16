/**
 * Pure draft-quoting helpers (no DOM, no framework). Kept in their own module
 * so `scripts/verify.mjs` can exercise them offline after the build.
 */
/**
 * Turn a raw selection into a Markdown blockquote: one `> ` prefix per line.
 * Multi-line selections become a single quoted block.
 */
export function buildQuote(selection) {
    return selection
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
}
/**
 * Append a quote to the current draft. An empty (or whitespace-only) draft is
 * replaced outright; otherwise the quote is appended on its own paragraph.
 * `setDraft` is a full-draft replace, so the join must happen here.
 */
export function appendQuote(draft, quote) {
    return draft.trim() === '' ? quote : `${draft}\n\n${quote}`;
}
