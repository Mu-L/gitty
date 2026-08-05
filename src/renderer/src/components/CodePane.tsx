import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { highlightLines, languageFor } from '../highlight'
import type { MenuState } from './ContextMenu'

/** Lines rendered before the first scroll, and added each time the end nears. */
const CHUNK = 1500

/** Whole-file viewer with line numbers and syntax highlighting. */
export function CodePane({
  source,
  path,
  wrap,
  onMenu
}: {
  source: string
  /** Used only to pick the language. */
  path: string
  wrap: boolean
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const language = useMemo(() => languageFor(path), [path])
  const lines = useMemo(() => highlightLines(source, language), [source, language])
  const hostRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(CHUNK)

  useEffect(() => {
    setShown(CHUNK)
    if (hostRef.current) hostRef.current.scrollTop = 0
  }, [source, path])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const onScroll = (): void => {
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
          {lines.length - shown} more lines — scroll or click to load
        </div>
      )}
    </div>
  )
}
