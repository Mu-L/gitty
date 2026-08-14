import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import { useFind } from './useFind'
import type { MenuState } from './ContextMenu'

/**
 * What happened to a range of lines: `git log -L a,b:file`, which answers the
 * question blame does not — not who touched the line last, but every commit
 * that touched it, each with the diff of that range as it stood.
 *
 * git prints a log and a patch interleaved, and that interleaving *is* the
 * answer, so the output is rendered as it comes rather than taken apart into a
 * commit list and a set of diffs. Only the colouring is added: commit headers
 * stand out, and the diff lines take the same classes the diff pane uses, so a
 * `+` here looks like a `+` there.
 */
function classOf(line: string): string {
  if (line.startsWith('commit ')) return 'lh-commit'
  if (line.startsWith('@@')) return 'diff-line dl-hunk'
  if (line.startsWith('diff --git') || line.startsWith('--- ') || line.startsWith('+++ ')) {
    return 'diff-line dl-meta'
  }
  if (line.startsWith('+')) return 'diff-line dl-add'
  if (line.startsWith('-')) return 'diff-line dl-del'
  // Author:, Date:, and the indented message body.
  if (/^[A-Z][A-Za-z-]*: /.test(line)) return 'lh-header'
  return 'diff-line'
}

export function LineHistoryPane({
  root,
  path,
  rev,
  start,
  end,
  wrap,
  active,
  onMenu
}: {
  root: string
  path: string
  rev: string | null
  start: number
  end: number
  wrap: boolean
  /** On screen in the active tab, so Ctrl+F belongs to this view. */
  active: boolean
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg } = useMsg()
  const hostRef = useRef<HTMLDivElement>(null)
  const [raw, setRaw] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void window.gitty.git.lineHistory(root, rev, path, start, end).then((text) => {
      if (!cancelled) setRaw(text)
    })
    return () => {
      cancelled = true
    }
  }, [root, rev, path, start, end])

  const lines = useMemo(() => (raw === null ? [] : raw.split('\n')), [raw])

  // Everything is rendered at once — a line range's history is short by
  // construction — so a search sees all of it.
  const find = useFind({
    hostRef,
    active,
    contentKey: lines.length,
    resetKey: `${rev ?? ''}:${path}:${start}-${end}`
  })

  if (raw === null) {
    return (
      <div className="pane-body">
        <div className="empty">{msg.common.loading}</div>
      </div>
    )
  }

  return (
    <div className="find-host">
      {find.bar}
      <div
        className={`pane-body diff line-history${wrap ? ' wrap' : ''}${find.open ? ' finding' : ''}`}
        ref={hostRef}
        onContextMenu={(e) => {
          e.preventDefault()
          onMenu({ x: e.clientX, y: e.clientY, items: [] })
        }}
      >
        {lines.length <= 1 ? (
          <div className="empty">{msg.diff.emptyLineHistory}</div>
        ) : (
          lines.map((l, i) => (
            <div key={i} className={classOf(l)}>
              <span className="diff-text">{l || ' '}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
