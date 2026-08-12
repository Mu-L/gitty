import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react'
import { highlightLines, languageFor } from '../highlight'
import type { MenuState } from './ContextMenu'
import { useMsg } from '../locale'
import { useFind } from './useFind'

/** Lines rendered before the first scroll, and added each time the end nears. */
const CHUNK = 1500

/** Whole-file viewer with line numbers and syntax highlighting. */
export function CodePane({
  source,
  docKey,
  path,
  wrap,
  active,
  onMenu
}: {
  source: string
  /** Identifies the document, not its text; changes only on opening another. */
  docKey: string
  /** Used only to pick the language. */
  path: string
  wrap: boolean
  /** On screen in the active tab, so Ctrl+F belongs to this view. */
  active: boolean
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg } = useMsg()
  const language = useMemo(() => languageFor(path), [path])
  const lines = useMemo(() => highlightLines(source, language), [source, language])
  // The prop objects, not just the strings: React sets innerHTML whenever the
  // dangerouslySetInnerHTML prop is a different object, so a literal per render
  // would rebuild every line on every state change — and take the find Ranges
  // with it. See MarkdownPane, which has the same rule for the whole document.
  const bodies = useMemo(() => lines.map((h) => ({ __html: h || ' ' })), [lines])
  const hostRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(CHUNK)

  const scrollTop = useRef(0)

  // Rewinding to the top belongs to opening a document, not to its text
  // changing underneath: a work-tree file is re-read on every repository
  // change, and dropping the loaded chunks would strand the reader too.
  useLayoutEffect(() => {
    scrollTop.current = 0
    setShown(CHUNK)
    if (hostRef.current) hostRef.current.scrollTop = 0
  }, [docKey])

  // Re-rendering the lines clamps the scroll when the file got shorter; put
  // the reader back. The reset above has already zeroed the remembered
  // position when the document itself changed.
  useLayoutEffect(() => {
    const el = hostRef.current
    if (el && el.scrollTop !== scrollTop.current) el.scrollTop = scrollTop.current
  }, [lines, shown])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const onScroll = (): void => {
      scrollTop.current = el.scrollTop
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 600) {
        setShown((n) => (n >= lines.length ? n : n + CHUNK))
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [lines.length])

  // A search covers the file, not the part of it scrolled to so far, so the
  // chunks still to come are rendered as the strip opens.
  const revealAll = useCallback(() => setShown(lines.length), [lines.length])
  const find = useFind({
    hostRef,
    active,
    contentKey: shown,
    resetKey: docKey,
    onOpen: revealAll
  })

  return (
    <div className="find-host">
      {find.bar}
      <div
        className={`pane-body code${wrap ? ' wrap' : ''}${find.open ? ' finding' : ''}`}
        ref={hostRef}
        onContextMenu={(e) => {
          e.preventDefault()
          onMenu({ x: e.clientX, y: e.clientY, items: [] })
        }}
      >
        {lines.slice(0, shown).map((_, i) => (
          <div key={i} className="code-line">
            <span className="code-gutter">{i + 1}</span>
            <span className="code-text" dangerouslySetInnerHTML={bodies[i]} />
          </div>
        ))}
        {shown < lines.length && (
          <div className="diff-more" onClick={() => setShown((n) => n + CHUNK)}>
            {msg.diff.loadMoreLines(lines.length - shown)}
          </div>
        )}
      </div>
    </div>
  )
}
