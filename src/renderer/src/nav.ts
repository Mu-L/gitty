/**
 * The browsing history of one repository session: the places the user has
 * looked at, and where in that list they currently are.
 *
 * A "place" is everything the two top panes are derived from — the `View`, the
 * file selected inside it, and the document opened beside the diff. That is
 * why `FileDocState` lives here rather than in `RepoTab`: the history is what
 * has to reconstruct one, so the shape belongs with it.
 *
 * The module is deliberately a leaf: pure data and pure functions, imported by
 * both `RepoTab` (which records) and `App` (which draws the buttons and the
 * menu), and importing nothing that would drag a chunk along.
 */
import type { View } from './contextMenus'
import type { RendererMessages } from '../../shared/messages'

/** A file opened in the diff pane, beside (not instead of) the diff. */
export interface FileDocState {
  /**
   * What this document shows: the file, whole-file blame, its history, the
   * history of a range of its lines, or — the one that is not about a single
   * file — the hits of a search, where `path` holds the pattern.
   */
  kind: 'file' | 'blame' | 'history' | 'lines' | 'grep'
  /** Kind + revision + path; opening the same document twice reuses it. */
  id: string
  path: string
  /** Revision to read at; null is the work tree. */
  rev: string | null
  /** Markdown documents open rendered, with a toggle back to the source. */
  preview: boolean
  /** The lines `kind: 'lines'` follows; 1-based and inclusive, as git counts. */
  range?: { start: number; end: number }
  /** The line a file document was opened at, when a search hit opened it. */
  line?: number
  /** The heading a rendered document was opened at, from a link's `#fragment`. */
  anchor?: string
}

/** One entry in the history: a view, a selection within it, and a document. */
export interface NavPlace {
  view: View
  selectedFile: string | null
  /** The document that was on screen, or null for the diff itself. */
  doc: FileDocState | null
}

export interface NavHistory {
  /** Oldest first, so `index + 1 …` is what "forward" walks. */
  places: NavPlace[]
  index: number
}

/** How far back the list is kept. Older places fall off the front. */
export const NAV_LIMIT = 50

export const NAV_HOME: NavPlace = { view: { mode: 'worktree' }, selectedFile: null, doc: null }

export function newNavHistory(): NavHistory {
  return { places: [NAV_HOME], index: 0 }
}

function sameView(a: View, b: View): boolean {
  if (a.mode !== b.mode) return false
  if (a.mode === 'commit' || a.mode === 'snapshot') return a.hash === (b as typeof a).hash
  if (a.mode === 'range') return a.from === (b as typeof a).from && a.to === (b as typeof a).to
  return true
}

/**
 * Whether two places are the same stop. The document is compared by id — which
 * already carries its kind, revision and path — so toggling a markdown preview
 * or re-rendering is not a move.
 */
export function samePlace(a: NavPlace, b: NavPlace): boolean {
  return (
    sameView(a.view, b.view) &&
    a.selectedFile === b.selectedFile &&
    (a.doc?.id ?? null) === (b.doc?.id ?? null)
  )
}

/**
 * Record a place. Going somewhere new after stepping back drops the forward
 * entries, exactly as a browser does; arriving where we already are is not a
 * move and leaves the history untouched (returning the same object, so the
 * caller's state does not change identity either).
 */
export function pushPlace(h: NavHistory, p: NavPlace): NavHistory {
  const current = h.places[h.index]
  if (current && samePlace(current, p)) return h
  const places = [...h.places.slice(0, h.index + 1), p]
  const over = places.length - NAV_LIMIT
  return over > 0
    ? { places: places.slice(over), index: NAV_LIMIT - 1 }
    : { places, index: places.length - 1 }
}

/** How a place reads in the history menu and in the back/forward tooltips. */
export function navLabel(p: NavPlace, msg: RendererMessages): string {
  const v = p.view
  // The document wins over the selection: it is the thing that was being read.
  const path = p.doc?.path ?? p.selectedFile
  let label: string
  if (v.mode === 'worktree') {
    label = path ? msg.nav.worktreeFile(path) : msg.nav.changes
  } else if (v.mode === 'commit') {
    label = path ? msg.nav.commitFile(path, v.short) : msg.nav.commit(v.short, v.subject)
  } else if (v.mode === 'snapshot') {
    // A null hash is "browse working tree": the current disk, which the history
    // menu reads as the work tree itself.
    if (v.hash === null) {
      label = path ? msg.nav.worktreeFile(path) : msg.nav.worktree
    } else {
      label = path ? msg.nav.snapshotFile(path, v.short) : msg.nav.snapshot(v.short, v.subject)
    }
  } else {
    label = path ? msg.nav.rangeFile(path, v.from, v.to) : msg.nav.range(v.from, v.to)
  }
  if (p.doc?.kind === 'blame') return msg.nav.blame(label)
  if (p.doc?.kind === 'history') return msg.nav.fileHistory(label)
  if (p.doc?.kind === 'lines' && p.doc.range) {
    return msg.nav.lineHistory(p.doc.path, p.doc.range.start, p.doc.range.end)
  }
  if (p.doc?.kind === 'grep') return msg.nav.search(p.doc.path)
  return label
}

/**
 * Drop the places that name a commit the repository no longer has. A rebase
 * replays every commit under a new hash, and the old ones stay readable in the
 * object database — `git show` answers for them — so a stale place does not
 * fail, it quietly shows a commit that has left the branch. It must not stay
 * walkable.
 *
 * `dead` is asked about a view's hashes and about a document's revision. The
 * index follows the place it was on, or the nearest surviving one before it,
 * and the same object comes back when nothing is dropped, so the caller's
 * state keeps its identity.
 */
export function prunePlaces(h: NavHistory, dead: (hash: string) => boolean): NavHistory {
  const alive = (p: NavPlace): boolean => {
    const v = p.view
    // A null hash is the work tree, which no rewrite can take away.
    if (v.mode === 'commit' || v.mode === 'snapshot') {
      if (v.hash !== null && dead(v.hash)) return false
    } else if (v.mode === 'range') {
      if (dead(v.from) || dead(v.to)) return false
    }
    return !(p.doc?.rev != null && dead(p.doc.rev))
  }
  const kept: NavPlace[] = []
  let index = -1
  h.places.forEach((p, i) => {
    if (!alive(p)) return
    // Removing what sat between two stops can leave the same stop twice over,
    // which `pushPlace` would never have recorded.
    if (kept.length === 0 || !samePlace(kept[kept.length - 1], p)) kept.push(p)
    if (i <= h.index) index = kept.length - 1
  })
  if (kept.length === h.places.length) return h
  if (kept.length === 0) return newNavHistory()
  return { places: kept, index: index < 0 ? 0 : index }
}
