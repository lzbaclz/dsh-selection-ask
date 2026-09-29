import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, ReactElement } from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import { appendQuote, buildQuote } from './quote.ts'

/** The slot's composed props: owner share {} + session kit + global kit. */
type SelectionAskProps = PropsRuntime<'conversation.input.overlay'>

interface SelectionState {
  text: string
  rect: DOMRect
}

interface ButtonPos {
  top: number
  left: number
}

/** Surface mode: the quote pill, or the in-place compose card. */
type SurfaceMode = 'pill' | 'compose'

/** Gap (px) between the selection edge and the floating surface. */
const GAP = 8
/** Viewport edge padding (px) used when clamping the floating position. */
const MARGIN = 8

/**
 * Read the current DOM selection when it qualifies for quoting: non-empty,
 * inside the conversation transcript (`[data-conversation-scroll]`) OR inside
 * an in-app document preview (`[data-document-preview]` / the rendered
 * markdown body / a text preview tab), but NOT inside the composer card
 * (quoting the draft back into itself is nonsense). Returns null otherwise —
 * including selections scrolled fully off-screen.
 */
function readSelection(): SelectionState | null {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null

  const text = selection.toString().trim()
  if (!text) return null

  const range = selection.getRangeAt(0)
  const ancestor = range.commonAncestorContainer
  const node =
    ancestor.nodeType === Node.ELEMENT_NODE
      ? (ancestor as Element)
      : ancestor.parentElement
  if (!node) return null

  const inTranscript = node.closest('[data-conversation-scroll]')
  const inDocPreview =
    node.closest('[data-document-preview]') ||
    node.closest('[data-document-markdown]') ||
    node.closest('[data-textpreview-state]')
  if (!inTranscript && !inDocPreview) return null
  if (node.closest('[data-composer-card]')) return null

  const rect = range.getBoundingClientRect()
  if (rect.width === 0 && rect.height === 0) return null
  if (
    rect.right < 0 ||
    rect.bottom < 0 ||
    rect.left > window.innerWidth ||
    rect.top > window.innerHeight
  ) {
    return null
  }

  return { text, rect }
}

/**
 * The floating 「询问 DeepSeek」 surface. Rendered inside the composer's
 * `conversation.input.overlay` anchor (a zero-height absolute node); the
 * surface escapes it with `position: fixed` and floats over the transcript at
 * viewport coordinates derived from the selection rect.
 *
 * Clicking the pill transforms it in place into a small compose card: the
 * selection is pre-quoted into the textarea, the user types the follow-up
 * right there, and Enter saves it onto the resident composer draft
 * (`setDraft` only — never auto-sends) so several selections can
 * accumulate before one manual send.
 */
export function SelectionAskButton({
  useInput,
  inputActions,
}: SelectionAskProps): ReactElement | null {
  const draft = useInput((s) => s.draft)
  const [sel, setSel] = useState<SelectionState | null>(null)
  const [mode, setMode] = useState<SurfaceMode>('pill')
  const [pos, setPos] = useState<ButtonPos | null>(null)
  const [text, setText] = useState('')
  const pillRef = useRef<HTMLButtonElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)
  // Compose guards selection tracking: edits inside the card must not let a
  // stray selectionchange swap the surface back to the pill mid-typing.
  const composingRef = useRef(false)

  const updateSelection = useCallback(() => {
    if (composingRef.current) return
    setSel(readSelection())
  }, [])

  // Track selection lifecycle: drag-release, keyboard selection, programmatic
  // clears (selectionchange), plus scroll/resize so the fixed surface tracks
  // the selection rect and hides once it leaves the viewport.
  useEffect(() => {
    document.addEventListener('selectionchange', updateSelection)
    document.addEventListener('mouseup', updateSelection)
    document.addEventListener('keyup', updateSelection)
    document.addEventListener('scroll', updateSelection, {
      capture: true,
      passive: true,
    })
    window.addEventListener('resize', updateSelection)
    return () => {
      document.removeEventListener('selectionchange', updateSelection)
      document.removeEventListener('mouseup', updateSelection)
      document.removeEventListener('keyup', updateSelection)
      document.removeEventListener('scroll', updateSelection, { capture: true })
      window.removeEventListener('resize', updateSelection)
    }
  }, [updateSelection])

  // Measure the rendered surface (pill or card), then clamp its position into
  // the viewport. Runs before paint, so the off-screen measuring frame is
  // never shown.
  useLayoutEffect(() => {
    const el: HTMLElement | null =
      mode === 'compose' ? cardRef.current : pillRef.current
    if (!sel || !el) {
      setPos(null)
      return
    }
    const w = el.offsetWidth
    const h = el.offsetHeight
    let left = sel.rect.right - w
    let top = sel.rect.top - h - GAP
    if (top < MARGIN) top = sel.rect.bottom + GAP
    left = Math.min(Math.max(MARGIN, left), window.innerWidth - w - MARGIN)
    top = Math.min(Math.max(MARGIN, top), window.innerHeight - h - MARGIN)
    setPos({ top, left })
  }, [sel, mode])

  // Focus the card textarea the moment compose mounts; caret parked at the
  // end of the pre-filled quote so typing starts immediately.
  useEffect(() => {
    if (mode !== 'compose') return
    const ta = cardRef.current?.querySelector<HTMLTextAreaElement>('textarea')
    if (ta) {
      ta.focus({ preventScroll: true })
      ta.setSelectionRange(ta.value.length, ta.value.length)
    }
  }, [mode])

  const close = useCallback(() => {
    composingRef.current = false
    setMode('pill')
    setSel(null)
    setPos(null)
    setText('')
  }, [])

  const openCompose = useCallback(() => {
    if (!sel) return
    composingRef.current = true
    setText(buildQuote(sel.text) + '\n\n')
    setMode('compose')
    window.getSelection()?.removeAllRanges()
  }, [sel])

  const save = useCallback(() => {
    const body = text.trim()
    if (!body) {
      close()
      return
    }
    // Save-to-draft, never send: append the quoted comment to the resident
    // composer so several selections can accumulate there before the user
    // sends them in one message.
    inputActions.setDraft(appendQuote(draft, body))
    close()
  }, [text, draft, inputActions, close])

  const onCardKeyDown = (event: ReactKeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      save()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      close()
    }
  }

  if (!sel) return null

  const style: CSSProperties = pos
    ? { position: 'fixed', top: pos.top, left: pos.left }
    : { position: 'fixed', top: -9999, left: -9999, opacity: 0 }

  if (mode === 'compose') {
    return (
      <div
        ref={cardRef}
        className="dsa-card"
        style={style}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <textarea
          className="dsa-card-input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onCardKeyDown}
          placeholder="补充你的问题或评论…"
        />
        <div className="dsa-card-actions">
          <span className="dsa-card-hint">
            Enter 保存 · Shift+Enter 换行 · Esc 取消
          </span>
          <button
            type="button"
            className="dsa-card-btn"
            // Keep the click from clearing the textarea focus.
            onMouseDown={(event) => event.preventDefault()}
            onClick={close}
          >
            取消
          </button>
          <button
            type="button"
            className="dsa-card-btn dsa-card-btn-send"
            onMouseDown={(event) => event.preventDefault()}
            onClick={save}
          >
            保存到会话
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      ref={pillRef}
      type="button"
      className="dsa-button"
      style={style}
      // Keep the text selection alive across the click: prevent the pill from
      // stealing focus/collapsing the selection on mousedown.
      onMouseDown={(event) => event.preventDefault()}
      onClick={openCompose}
    >
      询问 DeepSeek
    </button>
  )
}
