import { useEffect, useState, type JSX } from 'react'
import { CodePane } from './CodePane'
import { MarkdownPane } from './MarkdownPane'
import type { MenuState } from './ContextMenu'

export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown|mdown|mkd)$/i.test(path)
}

/**
 * One file opened for reading, at whatever revision it was opened from: the
 * work tree when `rev` is null, that commit otherwise. Each instance loads its
 * own contents, so several can be open beside a diff at once.
 */
export function FileDoc({
  root,
  path,
  rev,
  preview,
  wrap,
  outline,
  reloadKey,
  onSource,
  onMenu
}: {
  root: string
  path: string
  /** Revision to read from; null means the file on disk. */
  rev: string | null
  /** Render markdown instead of showing its source. */
  preview: boolean
  wrap: boolean
  outline: boolean
  /** Bumped when the repository changes, to re-read a work-tree file. */
  reloadKey: number
  /** Reports the loaded text, so the context menu can copy it. */
  onSource: (text: string | null) => void
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const [source, setSource] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = rev
          ? await window.gitty.git.snapshotFile(root, rev, path)
          : await window.gitty.git.readWorking(root, path)
        if (cancelled) return
        setSource(r.binary ? null : r.content)
        setError(r.binary ? 'Binary or oversized file.' : null)
      } catch (e) {
        if (cancelled) return
        setSource(null)
        setError(String(e))
      }
    })()
    return () => {
      cancelled = true
    }
    // A file read from a revision never changes; only work-tree files reload.
  }, [root, path, rev, rev === null ? reloadKey : 0])

  useEffect(() => onSource(source), [source, onSource])

  if (source === null) {
    return (
      <div className="pane-body">
        <div className="empty">{error ?? 'Loading…'}</div>
      </div>
    )
  }

  // Which document this is, as opposed to what it currently says: a work-tree
  // file is re-read on every repository change, and the viewers must tell
  // "the reader opened something else" from "the text underneath them moved".
  const docKey = `${rev ?? ''}:${path}`

  return preview && isMarkdownPath(path) ? (
    <MarkdownPane
      source={source}
      docKey={docKey}
      outline={outline}
      wrap={wrap}
      onMenu={onMenu}
    />
  ) : (
    <CodePane source={source} docKey={docKey} path={path} wrap={wrap} onMenu={onMenu} />
  )
}
