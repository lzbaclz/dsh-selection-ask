/**
 * Headless DOM smoke test for the selection-ask surface (no browser, no host).
 *
 * Mounts the REAL built component (`lib/client/SelectionAskButton.js`) in jsdom
 * with the standard-kit prop it consumes, then asserts what a user sees:
 *
 *   1. no selection → no surface;
 *   2. selecting text inside the transcript → the pill appears;
 *   3. clicking the pill → the in-place compose card opens with the selection
 *      pre-quoted, the caret in the card, and the resident composer draft
 *      untouched;
 *   4. typing into the card and saving → `setDraft` appends quote + input onto
 *      the draft and `submit` never fires (save-to-draft, not send);
 *   5. a second selection accumulates onto the same draft;
 *   6. Escape closes the card;
 *   7. a selection in the composer is ignored;
 *   8. selecting text inside a document preview also shows the pill.
 *
 * Run with `pnpm test:dom` (dev only; `pnpm verify` stays dependency-free).
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM(
  `<!doctype html><html><body>
     <div data-conversation-scroll><p id="transcript">这是一段被选中的回答文字。</p></div>
     <div data-document-markdown><p id="preview">文档预览里的一段结论文字。</p></div>
     <div data-composer-card><p id="draft">草稿里的文字</p></div>
     <div id="root"></div>
   </body></html>`,
  { pretendToBeVisual: true, url: 'http://localhost/' },
)
const { window } = dom
globalThis.window = window
globalThis.document = window.document
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true, writable: true })
globalThis.HTMLElement = window.HTMLElement
globalThis.Element = window.Element
globalThis.Node = window.Node
globalThis.DOMRect = window.DOMRect
globalThis.Range = window.Range
globalThis.getSelection = () => window.getSelection()
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.matchMedia =
  window.matchMedia ??
  ((query) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false }))
window.matchMedia ??= globalThis.matchMedia

// jsdom implements no layout, so Range has no rect APIs (browsers do). Give the
// component a plausible rect; the assertion is about our logic, not jsdom's box
// model.
const FAKE_RECT = { x: 100, y: 120, top: 120, left: 100, bottom: 140, right: 300, width: 200, height: 20, toJSON: () => ({}) }
window.Range.prototype.getBoundingClientRect = function () { return FAKE_RECT }
window.Range.prototype.getClientRects = function () { return [FAKE_RECT] }

const { createRoot } = await import('react-dom/client')
const React = (await import('react')).default
const { SelectionAskButton } = await import('../lib/client/SelectionAskButton.js')

const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail })
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`)
}
const settle = () => new Promise((resolve) => setTimeout(resolve, 40))

// Standard kit faces the slot framework normally supplies. The compose card is
// save-only: setDraft appends onto the draft, submit must never fire. The
// useInput face reads the accumulated draft so appends compose for real.
const drafts = []
let submits = 0
const inputActions = { setDraft: (value) => drafts.push(value), submit: () => { submits += 1 } }
const useInput = (selector) => selector({ draft: drafts.join('\n\n') })

const container = document.getElementById('root')
const root = createRoot(container)
root.render(React.createElement(SelectionAskButton, { useInput, inputActions }))
await settle()

const select = (element) => {
  const range = document.createRange()
  range.selectNodeContents(element)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
  document.dispatchEvent(new window.Event('selectionchange', { bubbles: true }))
  document.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }))
}
// React controlled inputs ignore plain value writes; go through the native
// setter and an input event so onChange actually fires.
const typeInto = (ta, value) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
  setter.call(ta, value)
  ta.dispatchEvent(new window.Event('input', { bubbles: true }))
}

// 1. no selection → nothing rendered
check('no selection → no surface', container.querySelector('button') === null && container.querySelector('.dsa-card') === null)

// 2. transcript selection → pill
select(document.getElementById('transcript'))
await settle()
let pill = container.querySelector('button.dsa-button')
check('selecting transcript text shows the pill', pill !== null, pill?.textContent?.trim().slice(0, 20))

// 3. click the pill → compose card, draft untouched
if (pill) {
  pill.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  await settle()
  const card = container.querySelector('.dsa-card')
  const ta = card?.querySelector('textarea')
  const prefill = ta?.value ?? ''
  check('clicking opens the in-place compose card', card !== null && ta !== null)
  check('card pre-fills the Markdown quote', prefill.startsWith('> ') && prefill.includes('这是一段被选中的回答文字'), JSON.stringify(prefill.slice(0, 40)))
  check('opening the card leaves the composer draft untouched', drafts.length === 0, `drafts=${drafts.length}`)
  check('card textarea is focused', document.activeElement === ta)
} else {
  check('clicking opens the in-place compose card', false, 'pill missing')
}

// 4. type a follow-up and save → appends onto the draft, submit never fires
const ta = container.querySelector('.dsa-card textarea')
if (ta) {
  typeInto(ta, '> 这是一段被选中的回答文字。\n\n为什么第二段结论相反？')
  await settle()
  container.querySelector('.dsa-card .dsa-card-btn-send')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  await settle()
  const saved = drafts.at(-1) ?? ''
  check('saving appends quote + follow-up onto the draft', saved === '> 这是一段被选中的回答文字。\n\n为什么第二段结论相反？', JSON.stringify(saved.slice(0, 48)))
  check('saving never submits (save-to-draft, not send)', submits === 0, `submits=${submits}`)
  check('card closes after save', container.querySelector('.dsa-card') === null)
} else {
  check('saving appends quote + follow-up onto the draft', false, 'card textarea missing')
}

// 5. a second selection accumulates onto the same draft
select(document.getElementById('preview'))
await settle()
container.querySelector('button.dsa-button')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
await settle()
const ta2 = container.querySelector('.dsa-card textarea')
if (ta2) {
  typeInto(ta2, '> 文档预览里的一段结论文字。\n\n这里的口径和上面不一致。')
  await settle()
  container.querySelector('.dsa-card .dsa-card-btn-send')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  await settle()
  const draftNow = drafts.join('\n\n')
  check('second save accumulates onto the same draft', draftNow.includes('为什么第二段结论相反') && draftNow.includes('这里的口径和上面不一致'), `len=${draftNow.length}`)
  check('still no submit after two saves', submits === 0, `submits=${submits}`)
} else {
  check('second save accumulates onto the same draft', false, 'card missing')
}

// 6. Escape closes the card
select(document.getElementById('transcript'))
await settle()
container.querySelector('button.dsa-button')?.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
await settle()
const openTa = container.querySelector('.dsa-card textarea')
if (openTa) {
  openTa.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  await settle()
}
check('Escape closes the card', container.querySelector('.dsa-card') === null && container.querySelector('button.dsa-button') === null)

// 7. composer selection stays ignored
const before = drafts.length
select(document.getElementById('draft'))
await settle()
check('selection in the composer is ignored', drafts.length === before && container.querySelector('button.dsa-button') === null && container.querySelector('.dsa-card') === null)

// 7. document-preview selection also offers the pill
select(document.getElementById('preview'))
await settle()
const previewPill = container.querySelector('button.dsa-button')
check('selecting text in a document preview shows the pill', previewPill !== null, previewPill?.textContent?.trim().slice(0, 20))

root.unmount()
const failed = results.filter((r) => !r.ok)
console.log(`\nDOM SMOKE: ${failed.length === 0 ? 'all checks passed ✔' : `${failed.length} check(s) FAILED ✘`}`)
process.exit(failed.length === 0 ? 0 : 1)
