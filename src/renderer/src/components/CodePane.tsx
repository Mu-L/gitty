import { useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react'
import { highlightLines, languageFor } from '../highlight'
import type { MenuState } from './ContextMenu'
import { useMsg } from '../locale'

/** Lines rendered before the first scroll, and added each time the end nears. */
const CHUNK = 1500

/** Whole-file viewer with line numbers and syntax highlighting. */
export function CodePane({
  source,
  docKey,
  path,
  wrap,
  onMenu
}: {
  source: string
  /** Identifies the document, not its text; changes only on opening another. */
  docKey: string
  /** Used only to pick the language. */
  path: string
  wrap: boolean
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg } = useMsg()
  const language = useMemo(() => languageFor(path), [path])
  const lines = useMemo(() => highlightLines(source, language), [source, language])
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

  return (
    <div
      className={`pane-body code${wrap ? ' wrap' : ''}`}
      ref={hostRef}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu({ x: e.clientX, y: e.clientY, items: [] })
      }}
    >
      {lines.slice(0, shown).map((html, i) => (
        <div key={i} className="code-line">
          <span className="code-gutter">{i + 1}</span>
          <span className="code-text" dangerouslySetInnerHTML={{ __html: html || ' ' }} />
        </div>
      ))}
      {shown < lines.length && (
        <div className="diff-more" onClick={() => setShown((n) => n + CHUNK)}>
          {msg.diff.loadMoreLines(lines.length - shown)}
        </div>
      )}
    </div>
  )
}
