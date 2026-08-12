/**
 * Finding text inside a rendered document.
 *
 * The matches are painted with the CSS Custom Highlight API rather than by
 * wrapping them in elements, and that is the whole reason this module can
 * exist: a rendered markdown document is React's, written through
 * `dangerouslySetInnerHTML`, and any `<mark>` inserted into it is discarded
 * the next time React rewrites that subtree. A `Highlight` holds Ranges and
 * touches no nodes at all, so the document can re-render underneath a search
 * without the two fighting over the DOM.
 */

/**
 * `CSS` and `Highlight` are on the global object but not on the `Window` type,
 * so a frame's copies have to be named for the compiler.
 */
type FrameGlobals = Window & {
  CSS?: { highlights?: HighlightRegistry }
  Highlight?: typeof Highlight
}

/** Every match, and the one the reader is on — painted differently. */
const ALL = 'gitty-find'
const CURRENT = 'gitty-find-current'

/** Elements whose text is markup rather than content. */
const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT'])

/**
 * Matches of `query` under `root`, in document order. The document's text is
 * walked as one string rather than node by node, so a match survives the
 * element boundaries markdown leaves behind — a phrase that happens to contain
 * a bold word is three text nodes and still one match.
 */
export function findRanges(root: HTMLElement, query: string): Range[] {
  const needle = query.toLowerCase()
  if (!needle) return []
  // The root may live in another document — the HTML preview is an iframe —
  // and a Range must be made by the document its nodes belong to.
  const doc = root.ownerDocument

  const nodes: Text[] = []
  const starts: number[] = []
  let text = ''
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) =>
      SKIP.has((n.parentElement?.tagName ?? '')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  })
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const t = n as Text
    if (!t.data) continue
    nodes.push(t)
    starts.push(text.length)
    text += t.data
  }

  const hay = text.toLowerCase()
  const ranges: Range[] = []
  for (let at = hay.indexOf(needle); at !== -1; at = hay.indexOf(needle, at + needle.length)) {
    const r = doc.createRange()
    const [sNode, sOffset] = locate(nodes, starts, at)
    const [eNode, eOffset] = locate(nodes, starts, at + needle.length)
    if (!sNode || !eNode) continue
    r.setStart(sNode, sOffset)
    r.setEnd(eNode, eOffset)
    ranges.push(r)
  }
  return ranges
}

/** The node and offset a position in the concatenated text falls at. */
function locate(nodes: Text[], starts: number[], at: number): [Text | null, number] {
  // Binary search for the last node starting at or before `at`.
  let lo = 0
  let hi = nodes.length - 1
  let found = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (starts[mid] <= at) {
      found = mid
      lo = mid + 1
    } else hi = mid - 1
  }
  if (found < 0) return [null, 0]
  // An end position landing exactly on the next node's start belongs to the
  // end of this one, which is where the range has to stop.
  const offset = at - starts[found]
  if (offset > nodes[found].data.length) return [null, 0]
  return [nodes[found], offset]
}

/**
 * Which view's search is on screen. The highlight registry is one per document
 * while the app has a search per view, and hidden tabs stay mounted — so a
 * view only ever clears paint it put there itself, and the last one to paint
 * owns the registry.
 */
let owner: object | null = null

/**
 * Paint the matches; `current` is the one the reader is on. The registry
 * belongs to a document, so a search inside the HTML preview's iframe paints
 * through that frame's own `CSS` object.
 */
export function paintFind(
  by: object,
  all: Range[],
  current: Range | null,
  win: Window = window
): void {
  const g = win as FrameGlobals
  const reg = g.CSS?.highlights
  if (!reg) return
  owner = by
  // The current match is painted by its own highlight, so it must not also be
  // in the general one — the later registration would not always win.
  const rest = current ? all.filter((r) => r !== current) : all
  const H = g.Highlight
  if (!H) return
  reg.set(ALL, new H(...rest))
  if (current) reg.set(CURRENT, new H(current))
  else reg.delete(CURRENT)
}

/** Take the paint off, on close or unmount — but only one's own. */
export function clearFind(by: object, win: Window = window): void {
  if (owner !== by) return
  owner = null
  const reg = (win as FrameGlobals).CSS?.highlights
  reg?.delete(ALL)
  reg?.delete(CURRENT)
}

/**
 * The find strip floats over the top of the document, so the band underneath
 * it is on screen without being visible. A match there has to be scrolled out
 * from under it like one that is genuinely off screen.
 */
const OVERLAY_INSET = 52

/**
 * Bring a match into view inside its scroller, leaving it a third of the way
 * down rather than at the very edge — a match with no context above it reads
 * as if the document starts there.
 */
export function scrollRangeIntoView(range: Range, scroller: HTMLElement | null): void {
  const rect = range.getBoundingClientRect()
  // A collapsed rect means the range is inside a hidden or not-yet-laid-out
  // subtree; there is nothing to scroll to.
  if (rect.height === 0 && rect.width === 0) return
  // No scroller of our own — the match is inside an iframe, where the browser
  // knows better than we do which boxes have to move, including the host's.
  if (!scroller) {
    const el = range.startContainer.parentElement
    el?.scrollIntoView({ block: 'center' })
    return
  }
  const box = scroller.getBoundingClientRect()
  if (rect.top >= box.top + OVERLAY_INSET && rect.bottom <= box.bottom - 8) return
  scroller.scrollTop += rect.top - box.top - scroller.clientHeight / 3
}
