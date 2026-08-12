import { useEffect, useMemo, useState, type JSX } from 'react'
import type { BlameLine } from '../../../shared/types'
import { UNCOMMITTED_SHA } from '../../../shared/types'
import type { MenuState } from './ContextMenu'
import { useMsg } from '../locale'
import { highlightLines, languageFor } from '../highlight'
import { fmtDateTimeZone, stamp, useTime } from '../time'

/** Hash a string to a stable integer for hue assignment. */
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * Whole-file blame, one row per source line: which commit last touched it.
 * Opens as a document beside the diff, so a line and its change stay visible
 * together. Each commit gets a stable colour derived from its SHA so the same
 * commit is always the same hue, and adjacent commits are easy to tell apart.
 * A line with no commit yet — all-zero sha — is uncommitted work-tree content
 * and renders as an em dash in the dim foreground colour.
 */
export function BlamePane({
  root,
  path,
  rev,
  onMenu
}: {
  root: string
  path: string
  rev: string | null
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg, locale } = useMsg()
  const time = useTime()
  const [lines, setLines] = useState<BlameLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const language = useMemo(() => languageFor(path), [path])
  // The whole file is one highlight pass, because a comment or template
  // literal can span lines; the lines are split apart only after hljs has
  // seen all of them together. Each blame row shows its own line's fragment.
  const highlighted = useMemo(
    () => (lines ? highlightLines(lines.map((l) => l.line).join('\n'), language) : null),
    [lines, language]
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await window.gitty.git.blame(root, rev, path)
        if (cancelled) return
        setLines(r)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setLines(null)
        setError(String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [root, rev, path])

  if (lines === null) {
    return (
      <div className="pane-body">
        <div className="empty">{error ?? msg.common.loading}</div>
      </div>
    )
  }

  return (
    <div
      className="pane-body blame"
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu({ x: e.clientX, y: e.clientY, items: [] })
      }}
    >
      {lines.length === 0 ? (
        <div className="empty">{msg.diff.emptyBlame}</div>
      ) : (
        lines.map((l, i) => {
          const hue = l.sha === UNCOMMITTED_SHA ? null : hashStr(l.sha) % 360
          // `author-time` is epoch seconds; the formatters want an ISO instant.
          // An uncommitted line has no commit to date, and shows an em dash.
          const iso = l.sha === UNCOMMITTED_SHA ? null : new Date(l.time * 1000).toISOString()
          return (
            <div
              className="blame-row"
              key={i}
              title={`${l.sha}\n${l.author}${iso ? `\n${fmtDateTimeZone(iso, locale, time)}` : ''}\n${l.summary}`}
              style={hue != null ? { '--blame-hue': hue } as React.CSSProperties : undefined}
            >
              <span className="blame-num">{i + 1}</span>
              <span className="blame-sha">{l.sha === UNCOMMITTED_SHA ? '—' : l.sha.slice(0, 8)}</span>
              <span className="blame-author">{l.author}</span>
              <span className="blame-date">{iso ? stamp(iso, time, msg.time) : '—'}</span>
              <span
                className="blame-text"
                dangerouslySetInnerHTML={{ __html: highlighted ? highlighted[i] || ' ' : l.line }}
              />
            </div>
          )
        })
      )}
    </div>
  )
}
