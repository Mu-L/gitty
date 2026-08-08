import { useEffect, useState, type JSX } from 'react'
import type { BlameLine } from '../../../shared/types'
import { UNCOMMITTED_SHA } from '../../../shared/types'
import type { MenuState } from './ContextMenu'
import { useMsg } from '../locale'

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
  const { msg } = useMsg()
  const [lines, setLines] = useState<BlameLine[] | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          return (
            <div
              className="blame-row"
              key={i}
              title={`${l.sha}\n${l.author}\n${l.summary}`}
              style={hue != null ? { '--blame-hue': hue } as React.CSSProperties : undefined}
            >
              <span className="blame-num">{i + 1}</span>
              <span className="blame-sha">{l.sha === UNCOMMITTED_SHA ? '—' : l.sha.slice(0, 8)}</span>
              <span className="blame-author">{l.author}</span>
              <span className="blame-text">{l.line}</span>
            </div>
          )
        })
      )}
    </div>
  )
}
