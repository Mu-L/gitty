import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { FileIcon } from './FileIcon'
import { useMsg } from '../locale'
import { highlightRuns, rankPaths } from '../quickopen'

/** As many rows as the box shows; more than this is a list to filter, not to read. */
const LIMIT = 40

/**
 * Open a file by typing its name, from anywhere in the window.
 *
 * The file tree's own filter answers a different question: it narrows *what is
 * listed there*, needs that pane focused, and in the Changes view only knows
 * the files that changed. This box asks the working tree instead — every file
 * git would list, ignored ones left out, whatever the panes are showing — and
 * opens the pick as a document, which is what "let me look at that file" means.
 *
 * The list is loaded when the box opens rather than kept warm: it is one
 * `ls-files`, and a stale list would offer files that have since been deleted.
 */
export function QuickOpen({
  open,
  root,
  onOpen,
  onClose
}: {
  open: boolean
  root: string
  /** Open this path as a document, at the working-tree revision. */
  onOpen: (path: string) => void
  onClose: () => void
}): JSX.Element | null {
  const { msg } = useMsg()
  const [paths, setPaths] = useState<string[] | null>(null)
  const [term, setTerm] = useState('')
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setPaths(null)
    setTerm('')
    setCursor(0)
    void window.gitty.git.worktreeFiles(root).then((files) => {
      // Ignored files are left out: `node_modules` alone would bury every real
      // answer, and nothing in there is what someone means by "my files".
      if (!cancelled) setPaths(files.filter((f) => !f.ignored).map((f) => f.path))
    })
    return () => {
      cancelled = true
    }
  }, [open, root])

  const hits = useMemo(() => rankPaths(paths ?? [], term, LIMIT), [paths, term])

  // Typing re-ranks under the cursor, so it goes back to the best row — which
  // is the one wanted after a keystroke narrows the list.
  useEffect(() => setCursor(0), [term])

  // Follow the cursor when the keys move it past the visible rows.
  useEffect(() => {
    listRef.current?.querySelector('.quick-open-row.selected')?.scrollIntoView({ block: 'nearest' })
  }, [cursor, hits])

  if (!open) return null

  const choose = (path: string): void => {
    onOpen(path)
    onClose()
  }

  return (
    <div
      className="settings-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="quick-open">
        <input
          type="text"
          className="setting-text quick-open-input"
          value={term}
          placeholder={msg.quickOpen.placeholder}
          title={msg.quickOpen.title}
          spellCheck={false}
          autoFocus
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => {
            // Every key belongs to the box while it is open — Escape included,
            // which nothing above it knows to close.
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setCursor((c) => (hits.length === 0 ? 0 : (c + 1) % hits.length))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setCursor((c) => (hits.length === 0 ? 0 : (c - 1 + hits.length) % hits.length))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              if (hits[cursor]) choose(hits[cursor].path)
            } else if (e.key === 'Escape') {
              e.preventDefault()
              onClose()
            }
            e.stopPropagation()
          }}
        />
        <div className="quick-open-list" ref={listRef}>
          {paths === null ? (
            <div className="quick-open-note">{msg.quickOpen.loading}</div>
          ) : hits.length === 0 ? (
            <div className="quick-open-note">{msg.quickOpen.noMatch}</div>
          ) : (
            hits.map((hit, i) => {
              const runs = highlightRuns(hit.path, hit.positions)
              return (
                <div
                  key={hit.path}
                  className={`quick-open-row${i === cursor ? ' selected' : ''}`}
                  // Mouse down rather than click: the input keeps the focus, so
                  // there is no blur between pressing and choosing.
                  onMouseDown={(e) => {
                    e.preventDefault()
                    choose(hit.path)
                  }}
                  onMouseMove={() => setCursor(i)}
                  title={hit.path}
                >
                  <FileIcon path={hit.path} />
                  <span className="quick-open-path">
                    {runs.map((run, k) => (
                      <span
                        key={k}
                        // Odd runs are the matched letters — the alternation
                        // `highlightRuns` guarantees, so the parity is the test.
                        className={k % 2 === 1 ? 'quick-open-hit' : undefined}
                      >
                        {run}
                      </span>
                    ))}
                  </span>
                </div>
              )
            })
          )}
        </div>
        <div className="quick-open-footer">
          {paths === null ? '' : msg.quickOpen.count(hits.length, paths.length)}
        </div>
      </div>
    </div>
  )
}
