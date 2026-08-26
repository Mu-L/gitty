import { useEffect, useRef, useState, type JSX } from 'react'
import type { Commit, FileHistoryEntry } from '../../../shared/types'
import type { MenuState } from './ContextMenu'
import { useMsg } from '../locale'
import { fmtDateTimeZone, stamp, useTime } from '../time'
import { useFind } from './useFind'

/**
 * Every commit that touched this file, newest first.
 *
 * The rows behave as the commit log's do, so the two lists are not read
 * differently: a click selects, a double click opens that commit — the
 * document gives way to the ordinary commit view, so the picked commit is
 * browsed with the full panes around it — and a Shift+click on a second row
 * diffs this one file between the two revisions.
 */
export function FileHistoryPane({
  root,
  path,
  rev,
  active,
  onOpenCommit,
  onCompare,
  onMenu
}: {
  root: string
  path: string
  rev: string | null
  /** On screen in the active tab, so Ctrl+F belongs to this view. */
  active: boolean
  onOpenCommit: (c: Commit) => void
  /** Two revisions picked here: this file's diff between them, oldest first. */
  onCompare: (from: string, to: string) => void
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg, locale } = useMsg()
  const time = useTime()
  const hostRef = useRef<HTMLDivElement>(null)
  const [commits, setCommits] = useState<FileHistoryEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The picked row, and the second one a comparison is against. Both are this
  // list's own: the log's selection is about the repository, this is about the
  // file, and the panes around the document keep showing whatever they showed.
  const [selected, setSelected] = useState<string | null>(null)
  const [compare, setCompare] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    // Another file, or the same one at another revision, is another list.
    setSelected(null)
    setCompare(null)
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

  /**
   * A row was clicked. Shift picks a second revision and diffs the file
   * between the two, oldest first — the list is newest first, so the later
   * index is the older commit. A plain click starts over from one row.
   */
  const pick = (hash: string, index: number, additive: boolean): void => {
    if (!additive || !selected || selected === hash || commits === null) {
      setSelected(hash)
      setCompare(null)
      return
    }
    const iSel = commits.findIndex((e) => e.commit.hash === selected)
    const [from, to] = iSel > index ? [selected, hash] : [hash, selected]
    setCompare(hash)
    onCompare(from, to)
  }

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
        commits.map(({ commit: c, lines }, i) => (
          <div
            className={`history-row${c.hash === selected ? ' selected' : c.hash === compare ? ' compare' : ''}`}
            key={c.hash}
            onClick={(e) => pick(c.hash, i, e.shiftKey)}
            onDoubleClick={() => onOpenCommit(c)}
            title={`${c.hash}\n${c.author} <${c.email}>\n${fmtDateTimeZone(c.date, locale, time)}${lines === null ? '' : `\n${msg.files.lines(lines)}`}\n\n${c.subject}\n\n${msg.diff.historyRowHint}`}
          >
            <span className="history-hash">{c.short}</span>
            <span className="history-time">{stamp(c.date, time, msg.time)}</span>
            {/* How long the file was once this commit landed; a binary
                revision, and anything older than one, has no count. */}
            <span className="history-lines">{lines === null ? '' : lines}</span>
            <span className="history-author">{c.author}</span>
            <span className="history-subject">{c.subject}</span>
          </div>
        ))
      )}
      </div>
    </div>
  )
}
