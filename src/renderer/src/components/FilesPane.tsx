import { useCallback, useEffect, useMemo, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import type { FileChurn } from '../../../shared/types'
import type { MenuState } from './ContextMenu'
import { comparePaths } from '../paths'
import { FileIcon } from './FileIcon'

export interface FileEntry {
  path: string
  absPath: string
  /** Status marks rendered before the file name. */
  marks: Array<{ char: string; cls: string }>
  deleted: boolean
  /** Changes view only: the change is in the index, whole or in part. */
  staged?: boolean
  /** Changes view only: git has never seen this file. */
  untracked?: boolean
  /** Working Tree only: `.gitignore` covers this file. Listed, but drawn dim. */
  ignored?: boolean
  /** Snapshot only: the file's mode says it is a program, so it can be run. */
  exec?: boolean
  /** On disk only: this path is a submodule, so it can be pulled on its own. */
  submodule?: boolean
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
  /** Directories: everything under it is ignored, so the folder reads as dim too. */
  ignored?: boolean
}

/**
 * Which directories hold nothing but ignored files. A folder is only dim when
 * all of it is — `src` with one ignored build artefact in it is still source.
 */
function ignoredDirs(entries: FileEntry[]): Set<string> {
  const all = new Set<string>()
  const some = new Set<string>()
  for (const entry of entries) {
    const dirs = entry.path.split('/').slice(0, -1)
    for (let d = 0; d < dirs.length; d++) {
      const key = dirs.slice(0, d + 1).join('/')
      ;(entry.ignored ? all : some).add(key)
    }
  }
  for (const key of some) all.delete(key)
  return all
}

/** Flatten the entry list into visible tree rows, honouring collapsed folders. */
function buildRows(entries: FileEntry[], collapsed: (key: string) => boolean): TreeRow[] {
  const rows: TreeRow[] = []
  const dim = ignoredDirs(entries)
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
      const key = dirs.slice(0, d + 1).join('/')
      rows.push({
        kind: 'dir',
        key,
        name: dirs[d],
        depth: d,
        ignored: dim.has(key)
      })
    }
    prevParts = dirs

    const hidden = dirs.some((_, d) => collapsed(dirs.slice(0, d + 1).join('/')))
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
    return !segs.slice(0, -1).some((_, i) => collapsed(segs.slice(0, i + 1).join('/')))
  })
}

/** Case-insensitive substring of the whole path, which is what makes a
 *  directory match bring its subtree with it: every file under `src/main`
 *  has that text in its own path. */
export function matchesFilter(path: string, needle: string): boolean {
  return path.toLowerCase().includes(needle.toLowerCase())
}

export function FilesPane({
  entries,
  naturalSort,
  startCollapsed,
  filter,
  treeKey,
  selected,
  onSelect,
  onOpen,
  onMenu,
  onToggleStage,
  emptyText
}: {
  entries: FileEntry[]
  /** Sort names the way a reader does rather than by code unit. */
  naturalSort: boolean
  /** Start with every directory shut: a whole repository is a list to open
   *  into, where a list of changes is one to read. */
  startCollapsed: boolean
  /** Show only the paths holding this text; '' shows the whole tree. */
  filter: string
  /** Which tree is on screen. A different one starts from the default again;
   *  the same one re-read (a file changed on disk) keeps what is open. */
  treeKey: string
  selected: string | null
  onSelect: (entry: FileEntry) => void
  onOpen: (entry: FileEntry) => void
  onMenu: (entry: FileEntry, state: MenuState) => void
  /** Changes view only: clicking the status marks moves the file in or out of
   *  the index. Absent in every other mode, where there is no index to move
   *  it to and the marks are just a status. */
  onToggleStage?: (entry: FileEntry) => void
  emptyText: string
}): JSX.Element {
  const { msg } = useMsg()
  // What the user has changed from the default, rather than what is shut: the
  // set of every directory is not known until the entries are in, and they
  // arrive in two passes (paths first, line counts after).
  const [toggled, setToggled] = useState<Set<string>>(new Set())
  useEffect(() => setToggled(new Set()), [treeKey])

  // While filtering, nothing is shut: a match three directories down is the
  // whole point of having typed, and reopening the way to it by hand is not.
  const collapsed = useCallback(
    (key: string): boolean => filter === '' && toggled.has(key) !== startCollapsed,
    [toggled, startCollapsed, filter]
  )

  // Sorted here rather than by each producer: git orders by byte, which puts
  // W10 before W9 and every capital before every lowercase letter, and the
  // entries arrive from five different commands.
  const rows = useMemo(
    () =>
      buildRows(
        entries
          .filter((e) => filter === '' || matchesFilter(e.path, filter))
          .sort((x, y) => comparePaths(x.path, y.path, naturalSort)),
        collapsed
      ),
    [entries, collapsed, naturalSort, filter]
  )

  const toggle = (key: string): void =>
    setToggled((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  if (entries.length === 0) return <div className="empty">{emptyText}</div>
  if (rows.length === 0) return <div className="empty">{msg.files.filterNone}</div>

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
            <span className="twisty">{collapsed(row.key) ? '▶' : '▼'}</span>
            <span className={`dir-name${row.ignored ? ' ignored' : ''}`}>{row.name}/</span>
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
              // The tree's own menu listens above this row; a row has its own
              // answer, so the event stops here.
              e.stopPropagation()
              onSelect(row.entry!)
              onMenu(row.entry!, { x: e.clientX, y: e.clientY, items: [] })
            }}
          >
            <span className="tree-indent" style={{ width: row.depth * 12 + 10 }} />
            {row.entry!.marks.map((m, i) => (
              <span
                key={i}
                className={`status-code ${m.cls}${onToggleStage ? ' stageable' : ''}`}
                title={onToggleStage ? msg.files.toggleStage(!!row.entry!.staged) : undefined}
                onClick={
                  onToggleStage
                    ? (e) => {
                        // The row's own click selects the file; the marks are
                        // a control of their own.
                        e.stopPropagation()
                        onToggleStage(row.entry!)
                      }
                    : undefined
                }
              >
                {m.char}
              </span>
            ))}
            {/* The type icon sits against the name rather than out at the
                indent: it is part of reading the file, where the status codes
                before it are about the change. */}
            <FileIcon path={row.key} />
            <span
              className={`file-name${row.entry!.deleted ? ' deleted' : ''}${
                row.entry!.staged ? ' staged' : ''
              }${row.entry!.ignored ? ' ignored' : ''}`}
              title={row.entry!.ignored ? msg.files.ignoredFile : undefined}
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
