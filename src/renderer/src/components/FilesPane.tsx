import { useMemo, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import type { FileChurn } from '../../../shared/types'
import type { MenuState } from './ContextMenu'
import { comparePaths } from '../paths'

export interface FileEntry {
  path: string
  absPath: string
  /** Status marks rendered before the file name. */
  marks: Array<{ char: string; cls: string }>
  deleted: boolean
  /** Work tree only: the change is in the index, whole or in part. */
  staged?: boolean
  /** Present for renames: the previous path. */
  origPath?: string
  /** Number of lines, when counted. */
  lines?: number | null
  /** Lines this change added and removed; absent for binary files and snapshots. */
  churn?: FileChurn | null
}

interface TreeRow {
  kind: 'dir' | 'file'
  /** Full path for files, directory path for dirs. */
  key: string
  name: string
  depth: number
  entry?: FileEntry
}

/** Flatten the entry list into visible tree rows, honouring collapsed folders. */
function buildRows(entries: FileEntry[], collapsed: Set<string>): TreeRow[] {
  const rows: TreeRow[] = []
  let prevParts: string[] = []

  for (const entry of entries) {
    const parts = entry.path.split('/')
    const dirs = parts.slice(0, -1)

    // Emit directory headers for the part of the path that changed.
    let common = 0
    while (common < dirs.length && common < prevParts.length && dirs[common] === prevParts[common]) {
      common++
    }
    for (let d = common; d < dirs.length; d++) {
      rows.push({
        kind: 'dir',
        key: dirs.slice(0, d + 1).join('/'),
        name: dirs[d],
        depth: d
      })
    }
    prevParts = dirs

    const hidden = dirs.some((_, d) => collapsed.has(dirs.slice(0, d + 1).join('/')))
    if (!hidden) {
      rows.push({
        kind: 'file',
        key: entry.path,
        name: parts[parts.length - 1],
        depth: dirs.length,
        entry
      })
    }
  }

  // Drop directory headers whose ancestors are collapsed.
  return rows.filter((r) => {
    if (r.kind !== 'dir') return true
    const segs = r.key.split('/')
    return !segs.slice(0, -1).some((_, i) => collapsed.has(segs.slice(0, i + 1).join('/')))
  })
}

export function FilesPane({
  entries,
  selected,
  onSelect,
  onOpen,
  onMenu,
  emptyText
}: {
  entries: FileEntry[]
  selected: string | null
  onSelect: (entry: FileEntry) => void
  onOpen: (entry: FileEntry) => void
  onMenu: (entry: FileEntry, state: MenuState) => void
  emptyText: string
}): JSX.Element {
  const { msg } = useMsg()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  // Sorted here rather than by each producer: git orders by byte, which puts
  // W10 before W9 and every capital before every lowercase letter, and the
  // entries arrive from five different commands.
  const rows = useMemo(
    () => buildRows([...entries].sort((x, y) => comparePaths(x.path, y.path)), collapsed),
    [entries, collapsed]
  )

  const toggle = (key: string): void =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  if (entries.length === 0) return <div className="empty">{emptyText}</div>

  return (
    <div>
      {rows.map((row) =>
        row.kind === 'dir' ? (
          <div
            key={`d:${row.key}`}
            className="row"
            onClick={() => toggle(row.key)}
            title={row.key}
          >
            <span className="tree-indent" style={{ width: row.depth * 12 }} />
            <span className="twisty">{collapsed.has(row.key) ? '▶' : '▼'}</span>
            <span className="dir-name">{row.name}/</span>
          </div>
        ) : (
          <div
            key={`f:${row.key}`}
            className={`row${selected === row.key ? ' selected' : ''}`}
            title={row.entry!.origPath ? `${row.entry!.origPath} → ${row.key}` : row.key}
            onClick={() => onSelect(row.entry!)}
            onDoubleClick={() => onOpen(row.entry!)}
            onContextMenu={(e) => {
              e.preventDefault()
              onSelect(row.entry!)
              onMenu(row.entry!, { x: e.clientX, y: e.clientY, items: [] })
            }}
          >
            <span className="tree-indent" style={{ width: row.depth * 12 + 10 }} />
            {row.entry!.marks.map((m, i) => (
              <span key={i} className={`status-code ${m.cls}`}>
                {m.char}
              </span>
            ))}
            <span
              className={`file-name${row.entry!.deleted ? ' deleted' : ''}${
                row.entry!.staged ? ' staged' : ''
              }`}
            >
              {row.name}
            </span>
            {row.entry!.lines != null && (
              <span className="file-lines">{msg.files.lines(row.entry!.lines)}</span>
            )}
            {row.entry!.churn && (
              <span className="file-churn">
                {row.entry!.churn!.added > 0 && (
                  <span className="churn-add">+{row.entry!.churn!.added}</span>
                )}
                {row.entry!.churn!.deleted > 0 && (
                  <span className="churn-del">−{row.entry!.churn!.deleted}</span>
                )}
              </span>
            )}
          </div>
        )
      )}
    </div>
  )
}
