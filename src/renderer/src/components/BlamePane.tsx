import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import type { BlameLine } from '../../../shared/types'
import { UNCOMMITTED_SHA } from '../../../shared/types'
import type { MenuState } from './ContextMenu'
import { useMsg } from '../locale'
import { highlightLines, languageFor } from '../highlight'
import { fmtDateTimeZone, fmtShortDate, useTime } from '../time'
import { useFind } from './useFind'

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
 * together. The author and date columns carry a stable colour derived from the
 * commit's SHA — the same commit is always the same hue, and adjacent commits
 * are easy to tell apart — while the SHA itself lives in the row's tooltip and
 * a right-click copies it. A line with no commit yet (all-zero sha) is
 * uncommitted work-tree content; its author and date stay dim.
 */
export function BlamePane({
  root,
  path,
  rev,
  active,
  setMenu
}: {
  root: string
  path: string
  rev: string | null
  /** On screen in the active tab, so Ctrl+F belongs to this view. */
  active: boolean
  /** Sets the context menu directly — a blame row's menu is its own, not the diff's. */
  setMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg, locale } = useMsg()
  const time = useTime()
  const hostRef = useRef<HTMLDivElement>(null)
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

  // Prop objects per line, for the same reason CodePane and MarkdownPane keep
  // theirs: a fresh {__html} literal per render rewrites every row's innerHTML.
  const bodies = useMemo(
    () => (lines ?? []).map((l, i) => ({ __html: highlighted ? highlighted[i] || ' ' : l.line })),
    [lines, highlighted]
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

  // Every line is rendered at once here, so a search sees the whole blame.
  const find = useFind({
    hostRef,
    active,
    contentKey: lines?.length ?? 0,
    resetKey: `${rev ?? ''}:${path}`
  })

  if (lines === null) {
    return (
      <div className="pane-body">
        <div className="empty">{error ?? msg.common.loading}</div>
      </div>
    )
  }

  return (
    <div className="find-host">
      {find.bar}
      <div className={`pane-body blame${find.open ? ' finding' : ''}`} ref={hostRef}>
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
              className={hue != null ? 'blame-row' : 'blame-row uncommitted'}
              key={i}
              title={`${l.sha}\n${l.author}${iso ? `\n${fmtDateTimeZone(iso, locale, time)}` : ''}\n${l.summary}`}
              style={hue != null ? { '--blame-hue': hue } as React.CSSProperties : undefined}
              onContextMenu={(e) => {
                e.preventDefault()
                // The sha is the one thing a right-click is for: it was on the
                // screen as a column and now lives in the tooltip instead.
                setMenu({
                  x: e.clientX,
                  y: e.clientY,
                  items:
                    l.sha === UNCOMMITTED_SHA
                      ? []
                      : [
                          {
                            label: msg.contextMenu.copyCommitHash,
                            action: () => void window.gitty.clipboard.write(l.sha)
                          }
                        ]
                })
              }}
            >
              <span className="blame-num">{i + 1}</span>
              <span className="blame-author">{l.author}</span>
              <span className="blame-date">{iso ? fmtShortDate(iso, locale, time, msg.time) : '—'}</span>
              <span className="blame-text" dangerouslySetInnerHTML={bodies[i]} />
            </div>
          )
        })
      )}
      </div>
    </div>
  )
}
