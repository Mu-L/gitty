import { useEffect, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import { BlamePane } from './BlamePane'
import { CodePane } from './CodePane'
import { FileHistoryPane } from './FileHistoryPane'
import { HtmlPane } from './HtmlPane'
import { ImagePane } from './ImagePane'
import { MarkdownPane } from './MarkdownPane'
import { isHtmlPath, isImagePath, isMarkdownPath } from '../paths'
import type { MenuState } from './ContextMenu'
import type { Commit } from '../../../shared/types'

/** What kind of document a diff-pane tab holds. */
export type FileDocKind = 'file' | 'blame' | 'history'

/**
 * One document in the diff pane. `kind` picks the reader: `file` is a whole
 * file (work tree when `rev` is null, that commit otherwise), `blame` is
 * whole-file blame, `history` is the file's commit list. Each instance loads
 * its own contents, so several can be open beside a diff at once.
 */
export function FileDoc({
  root,
  path,
  rev,
  kind = 'file',
  preview,
  wrap,
  outline,
  active,
  reloadKey,
  onSource,
  onMenu,
  onOpenCommit
}: {
  root: string
  path: string
  /** Revision to read from; null means the file on disk. */
  rev: string | null
  kind?: FileDocKind
  /** Render markdown instead of showing its source (files only). */
  preview: boolean
  wrap: boolean
  outline: boolean
  /** On screen in the active tab, so document-level keys belong to it. */
  active: boolean
  /** Bumped when the repository changes, to re-read a work-tree file. */
  reloadKey: number
  /** Reports the loaded text, so the context menu can copy it. */
  onSource: (text: string | null) => void
  onMenu: (state: MenuState) => void
  /** History rows hand the picked commit back here. */
  onOpenCommit?: (c: Commit) => void
}): JSX.Element {
  const { msg } = useMsg()
  const [source, setSource] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const image = isImagePath(path)

  // Blame and history have no file contents to copy from the context menu.
  useEffect(() => {
    if (kind !== 'file') onSource(null)
  }, [kind, onSource])

  useEffect(() => {
    // An image is never read as text: `readWorking` would only call it binary.
    if (image) return
    let cancelled = false
    void (async () => {
      try {
        const r = rev
          ? await window.gitty.git.snapshotFile(root, rev, path)
          : await window.gitty.git.readWorking(root, path)
        if (cancelled) return
        setSource(r.binary ? null : r.content)
        setError(r.binary ? msg.common.binaryOrOversized : null)
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
  }, [image, root, path, rev, rev === null ? reloadKey : 0, msg])

  // An image has no text to copy from the context menu.
  useEffect(() => onSource(image ? null : source), [image, source, onSource])

  if (kind === 'blame') {
    return <BlamePane root={root} path={path} rev={rev} onMenu={onMenu} />
  }
  if (kind === 'history') {
    return (
      <FileHistoryPane
        root={root}
        path={path}
        rev={rev}
        onOpenCommit={onOpenCommit ?? (() => undefined)}
        onMenu={onMenu}
      />
    )
  }

  if (image) {
    return <ImagePane root={root} path={path} rev={rev} reloadKey={reloadKey} onMenu={onMenu} />
  }

  if (source === null) {
    return (
      <div className="pane-body">
        <div className="empty">{error ?? msg.common.loading}</div>
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
      root={root}
      docPath={path}
      rev={rev}
      outline={outline}
      wrap={wrap}
      active={active}
      onMenu={onMenu}
    />
  ) : preview && isHtmlPath(path) ? (
    <HtmlPane source={source} docKey={docKey} wrap={wrap} onMenu={onMenu} />
  ) : (
    <CodePane source={source} docKey={docKey} path={path} wrap={wrap} onMenu={onMenu} />
  )
}
