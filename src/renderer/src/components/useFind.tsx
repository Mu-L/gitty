import { useCallback, useEffect, useMemo, useState, type JSX, type RefObject } from 'react'
import { FindBar } from './FindBar'
import { clearFind, findRanges, paintFind, scrollRangeIntoView } from '../find'

/**
 * Ctrl+F for one scrollable view: the strip, the search over what that view has
 * rendered, and the highlights. Every viewer wires it the same way — hand it
 * the scroller and say when the content changed — so the diff, a file, a blame
 * and a rendered document all find text the same way.
 */
export function useFind({
  hostRef,
  active,
  contentKey,
  resetKey,
  onOpen,
  frame
}: {
  /** The scrolling element whose text is searched. */
  hostRef: RefObject<HTMLElement | null>
  /** On screen in the active tab — only then does Ctrl+F belong to this view. */
  active: boolean
  /** Changes whenever the rendered nodes change, so the search re-runs: the
   *  Ranges of a replaced DOM point at nodes that are gone. */
  contentKey: unknown
  /** Changes when another document takes the view, which closes the strip. */
  resetKey?: unknown
  /** Called as the strip opens — where a view renders in chunks, this is its
   *  chance to render the rest, or the search would only see the first ones. */
  onOpen?: () => void
  /** Set where the searched nodes live in another document (the HTML preview's
   *  iframe): its window owns the highlight registry, and the browser does the
   *  scrolling, since the boxes to move span both documents. */
  frame?: boolean
}): { open: boolean; bar: JSX.Element | null } {
  // Identity for the highlight registry, which is shared by every mounted view.
  const token = useMemo(() => ({}), [])
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Range[]>([])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const el = hostRef.current
    if (!open || !el) return
    const found = query ? findRanges(el, query) : []
    setMatches(found)
    setIndex((i) => (found.length === 0 ? 0 : Math.min(i, found.length - 1)))
  }, [open, query, contentKey, hostRef])

  // Paint what was found and keep the current match on screen — separate from
  // the search, so walking the matches does not re-run it. Only while this view
  // is the one on screen: a hidden tab's search would otherwise fight the
  // visible one over the shared registry.
  useEffect(() => {
    if (!open || !active) {
      clearFind(token, hostRef.current?.ownerDocument.defaultView ?? window)
      return
    }
    const el = hostRef.current
    const win = (frame ? el?.ownerDocument.defaultView : window) ?? window
    const current = matches[index] ?? null
    paintFind(token, matches, current, win)
    if (current) scrollRangeIntoView(current, frame ? null : el)
  }, [open, active, matches, index, hostRef, token, frame])

  // The paint is not part of React's tree, so it has to be taken off by hand.
  useEffect(() => () => clearFind(token), [token])
  useEffect(() => {
    setOpen(false)
    setQuery('')
  }, [resetKey])

  const step = useCallback(
    (delta: number) =>
      setIndex((i) => (matches.length === 0 ? 0 : (i + delta + matches.length) % matches.length)),
    [matches.length]
  )

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault()
        onOpen?.()
        // Already open: remount the strip, which focuses and selects what is in
        // it — the same thing a second Ctrl+F does in a browser.
        setOpen(false)
        requestAnimationFrame(() => setOpen(true))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onOpen])

  return {
    open,
    bar: open ? (
      <FindBar
        query={query}
        onQuery={(v) => {
          setQuery(v)
          setIndex(0)
        }}
        count={matches.length}
        index={matches.length === 0 ? -1 : index}
        onNext={() => step(1)}
        onPrev={() => step(-1)}
        onClose={() => setOpen(false)}
      />
    ) : null
  }
}
