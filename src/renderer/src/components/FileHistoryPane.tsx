import { useEffect, useRef, useState, type JSX } from 'react'
import type { Commit } from '../../../shared/types'
import type { MenuState } from './ContextMenu'
import { useMsg } from '../locale'
import { fmtDateTimeZone, stamp, useTime } from '../time'
import { useFind } from './useFind'

/**
 * Every commit that touched this file, newest first. Clicking a row opens that
 * commit — the document gives way to the ordinary commit view, so the picked
 * commit is browsed with the full panes around it.
 */
export function FileHistoryPane({
  root,
  path,
  rev,
  active,
  onOpenCommit,
  onMenu
}: {
  root: string
  path: string
  rev: string | null
  /** On screen in the active tab, so Ctrl+F belongs to this view. */
  active: boolean
  onOpenCommit: (c: Commit) => void
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg, locale } = useMsg()
  const time = useTime()
  const hostRef = useRef<HTMLDivElement>(null)
  const [commits, setCommits] = useState<Commit[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await window.gitty.git.fileHistory(root, rev, path)
        if (cancelled) return
        setCommits(r)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setCommits(null)
        setError(String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [root, rev, path])

  // The whole history is rendered at once, so a search sees every row.
  const find = useFind({
    hostRef,
    active,
    contentKey: commits?.length ?? 0,
    resetKey: `${rev ?? ''}:${path}`
  })

  if (commits === null) {
    return (
      <div className="pane-body">
        <div className="empty">{error ?? msg.common.loading}</div>
      </div>
    )
  }

  return (
    <div className="find-host">
      {find.bar}
      <div
        className={`pane-body${find.open ? ' finding' : ''}`}
        ref={hostRef}
        onContextMenu={(e) => {
          e.preventDefault()
          onMenu({ x: e.clientX, y: e.clientY, items: [] })
        }}
      >
      {commits.length === 0 ? (
        <div className="empty">{msg.diff.emptyHistory}</div>
      ) : (
        commits.map((c) => (
          <div
            className="history-row"
            key={c.hash}
            onClick={() => onOpenCommit(c)}
            title={`${c.hash}\n${c.author} <${c.email}>\n${fmtDateTimeZone(c.date, locale, time)}\n\n${c.subject}`}
          >
            <span className="history-hash">{c.short}</span>
            <span className="history-time">{stamp(c.date, time, msg.time)}</span>
            <span className="history-author">{c.author}</span>
            <span className="history-subject">{c.subject}</span>
          </div>
        ))
      )}
      </div>
    </div>
  )
}
