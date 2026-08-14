import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import { useFind } from './useFind'
import type { GrepResult } from '../../../shared/types'
import type { MenuState } from './ContextMenu'

/**
 * The hits of a repository-wide search, grouped by file.
 *
 * The revision is part of the question, not a detail: a search started while a
 * commit is on screen searches *that* commit, so what comes back describes the
 * revision being read rather than the disk. Which one it was is said in the
 * header, because the two look identical otherwise.
 *
 * Clicking a hit opens that file as a document at the same revision, scrolled
 * to the line — the same viewer double-clicking a file in the tree opens, so
 * there is nothing new to learn here.
 */
export function GrepPane({
  root,
  pattern,
  rev,
  active,
  onOpen,
  onMenu
}: {
  root: string
  pattern: string
  rev: string | null
  active: boolean
  /** Open a file at this revision, scrolled to a line. */
  onOpen: (path: string, line: number) => void
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg } = useMsg()
  const hostRef = useRef<HTMLDivElement>(null)
  const [result, setResult] = useState<GrepResult | null>(null)

  useEffect(() => {
    let cancelled = false
    setResult(null)
    void window.gitty.git.grep(root, pattern, rev).then((r) => {
      if (!cancelled) setResult(r)
    })
    return () => {
      cancelled = true
    }
  }, [root, pattern, rev])

  /** Hits in file order, each file once with the lines it matched. */
  const groups = useMemo(() => {
    const byFile = new Map<string, Array<{ line: number; text: string }>>()
    for (const hit of result?.hits ?? []) {
      const list = byFile.get(hit.path)
      if (list) list.push({ line: hit.line, text: hit.text })
      else byFile.set(hit.path, [{ line: hit.line, text: hit.text }])
    }
    return [...byFile.entries()]
  }, [result])

  const find = useFind({
    hostRef,
    active,
    contentKey: result?.hits.length ?? 0,
    resetKey: `${rev ?? ''}:${pattern}`
  })

  if (result === null) {
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
        className={`pane-body grep${find.open ? ' finding' : ''}`}
        ref={hostRef}
        onContextMenu={(e) => {
          e.preventDefault()
          onMenu({ x: e.clientX, y: e.clientY, items: [] })
        }}
      >
        {result.hits.length === 0 ? (
          <div className="empty">{msg.diff.emptySearch}</div>
        ) : (
          <>
            <div className="grep-summary">
              {msg.diff.searchHits(result.hits.length, groups.length)}
              <span className="dim">
                {' '}
                {rev ? msg.files.searchInRevision(rev.slice(0, 8)) : msg.files.searchInWorktree}
              </span>
            </div>
            {result.truncated && (
              <div className="notice">{msg.diff.searchTruncated(result.hits.length)}</div>
            )}
            {groups.map(([path, hits]) => (
              <div key={path} className="grep-file">
                <div className="grep-path" title={path}>
                  {path}
                </div>
                {hits.map((h) => (
                  <div
                    key={h.line}
                    className="grep-hit"
                    onClick={() => onOpen(path, h.line)}
                    title={`${path}:${h.line}`}
                  >
                    <span className="grep-line">{h.line}</span>
                    <span className="grep-text">{h.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
