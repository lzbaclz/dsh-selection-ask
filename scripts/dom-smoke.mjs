/**
 * Headless DOM smoke test for the selection-ask button (no browser, no host).
 *
 * Mounts the REAL built component (`lib/client/SelectionAskButton.js`) in jsdom
 * with the two standard-kit props it consumes, then asserts what a user sees:
 *
 *   1. no selection → no button;
 *   2. selecting text inside the transcript → the button appears;
 *   3. clicking it → `inputActions.setDraft` receives the Markdown quote;
 *   4. a selection outside the transcript (e.g. in the composer) is ignored.
 *
 * Run with `pnpm test:dom` (dev only; `pnpm verify` stays dependency-free).
 */
import { JSDOM } from 'jsdom'

const dom = new JSDOM(
  `<!doctype html><html><body>
     <div data-conversation-scroll><p id="transcript">这是一段被选中的回答文字。</p></div>
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

// Standard kit faces the slot framework normally supplies.
const drafts = []
const inputActions = { setDraft: (value) => drafts.push(value) }
const useInput = (selector) => selector({ draft: '' })

const container = document.getElementById('root')
const root = createRoot(container)
root.render(React.createElement(SelectionAskButton, { useInput, inputActions }))
await settle()

check('no selection → no button', container.querySelector('button') === null)

// 2. select text inside the transcript
const select = (element) => {
  const range = document.createRange()
  range.selectNodeContents(element)
  const selection = window.getSelection()
  selection.removeAllRanges()
  selection.addRange(range)
  document.dispatchEvent(new window.Event('selectionchange', { bubbles: true }))
  document.dispatchEvent(new window.MouseEvent('mouseup', { bubbles: true }))
}

select(document.getElementById('transcript'))
await settle()
const button = container.querySelector('button')
check('selecting transcript text shows the button', button !== null, button?.textContent?.trim().slice(0, 20))

if (button) {
  button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }))
  await settle()
  const written = drafts.at(-1) ?? ''
  check('clicking writes a Markdown quote into the draft', written.startsWith('> ') && written.includes('这是一段被选中的回答文字'), JSON.stringify(written.slice(0, 40)))
} else {
  check('clicking writes a Markdown quote into the draft', false, 'button missing')
}

// 4. a selection in the composer must be ignored
const before = drafts.length
select(document.getElementById('draft'))
await settle()
check('selection outside the transcript is ignored', drafts.length === before && container.querySelector('button') === null)

root.unmount()
const failed = results.filter((r) => !r.ok)
console.log(`\nDOM SMOKE: ${failed.length === 0 ? 'all checks passed ✔' : `${failed.length} check(s) FAILED ✘`}`)
process.exit(failed.length === 0 ? 0 : 1)
