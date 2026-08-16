import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, } from 'react';
import { appendQuote, buildQuote } from "./quote.js";
/** Gap (px) between the selection edge and the button. */
const GAP = 8;
/** Viewport edge padding (px) used when clamping the button position. */
const MARGIN = 8;
/**
 * Read the current DOM selection when it qualifies for quoting: non-empty,
 * inside the conversation transcript (`[data-conversation-scroll]`), but NOT
 * inside the composer card (quoting the draft back into itself is nonsense).
 * Returns null otherwise — including selections scrolled fully off-screen.
 */
function readSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed)
        return null;
    const text = selection.toString().trim();
    if (!text)
        return null;
    const range = selection.getRangeAt(0);
    const ancestor = range.commonAncestorContainer;
    const node = ancestor.nodeType === Node.ELEMENT_NODE
        ? ancestor
        : ancestor.parentElement;
    if (!node)
        return null;
    if (!node.closest('[data-conversation-scroll]'))
        return null;
    if (node.closest('[data-composer-card]'))
        return null;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0)
        return null;
    if (rect.right < 0 ||
        rect.bottom < 0 ||
        rect.left > window.innerWidth ||
        rect.top > window.innerHeight) {
        return null;
    }
    return { text, rect };
}
/**
 * The floating 「询问 DeepSeek」 button. Rendered inside the composer's
 * `conversation.input.overlay` anchor (a zero-height absolute node); the
 * button escapes it with `position: fixed` and floats over the transcript at
 * viewport coordinates derived from the selection rect.
 */
export function SelectionAskButton({ useInput, inputActions, }) {
    const draft = useInput((s) => s.draft);
    const [sel, setSel] = useState(null);
    const [pos, setPos] = useState(null);
    const buttonRef = useRef(null);
    const updateSelection = useCallback(() => {
        setSel(readSelection());
    }, []);
    // Track selection lifecycle: drag-release, keyboard selection, programmatic
    // clears (selectionchange), plus scroll/resize so the fixed button tracks the
    // selection rect and hides once it leaves the viewport.
    useEffect(() => {
        document.addEventListener('selectionchange', updateSelection);
        document.addEventListener('mouseup', updateSelection);
        document.addEventListener('keyup', updateSelection);
        document.addEventListener('scroll', updateSelection, {
            capture: true,
            passive: true,
        });
        window.addEventListener('resize', updateSelection);
        return () => {
            document.removeEventListener('selectionchange', updateSelection);
            document.removeEventListener('mouseup', updateSelection);
            document.removeEventListener('keyup', updateSelection);
            document.removeEventListener('scroll', updateSelection, { capture: true });
            window.removeEventListener('resize', updateSelection);
        };
    }, [updateSelection]);
    // Measure the rendered button, then clamp its position into the viewport.
    // Runs before paint, so the off-screen measuring frame is never shown.
    useLayoutEffect(() => {
        const el = buttonRef.current;
        if (!sel || !el) {
            setPos(null);
            return;
        }
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        let left = sel.rect.right - w;
        let top = sel.rect.top - h - GAP;
        if (top < MARGIN)
            top = sel.rect.bottom + GAP;
        left = Math.min(Math.max(MARGIN, left), window.innerWidth - w - MARGIN);
        top = Math.min(Math.max(MARGIN, top), window.innerHeight - h - MARGIN);
        setPos({ top, left });
    }, [sel]);
    const writeQuote = useCallback(() => {
        if (!sel)
            return;
        const next = appendQuote(draft, buildQuote(sel.text));
        inputActions.setDraft(next); // full-draft replace (session standard kit)
        window.getSelection()?.removeAllRanges();
        setSel(null);
        setPos(null);
        // Wait a frame for the controlled textarea to re-render with the new
        // draft, then focus it and park the caret at the end.
        requestAnimationFrame(() => {
            const ta = document.querySelector('[data-composer-card] textarea');
            if (!ta)
                return;
            ta.focus({ preventScroll: true });
            ta.setSelectionRange(ta.value.length, ta.value.length);
        });
    }, [sel, draft, inputActions]);
    if (!sel)
        return null;
    const style = pos
        ? { position: 'fixed', top: pos.top, left: pos.left }
        : { position: 'fixed', top: -9999, left: -9999, opacity: 0 };
    return (_jsx("button", { ref: buttonRef, type: "button", className: "dsa-button", style: style, 
        // Keep the text selection alive across the click: prevent the button
        // from stealing focus/collapsing the selection on mousedown.
        onMouseDown: (event) => event.preventDefault(), onClick: writeQuote, children: "\u8BE2\u95EE DeepSeek" }));
}
