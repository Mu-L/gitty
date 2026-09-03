import { useEffect, useState, type JSX } from 'react'
import type { MenuState } from './ContextMenu'
import { humanBytes } from '../bytes'
import { useMsg } from '../locale'

/**
 * One PDF, rendered by the viewer Chromium already carries — pages, zoom,
 * search and printing come with it, so this pane is the frame around it.
 *
 * The bytes arrive over IPC and become a blob: URL rather than a data: one.
 * A document is megabytes where an image is kilobytes, and base64 in an
 * attribute would be a third larger again and copied into the DOM; a blob is
 * a handle. It is revoked when the pane lets go of it — the browser keeps a
 * blob alive for as long as its URL exists, which for an unrevoked one is the
 * life of the window.
 *
 * The price is the name in the viewer's own toolbar, which is the object URL:
 * a blob has no path to take one from, and a `File` does not lend the viewer
 * its name either — measured. The pane header and the document tab above both
 * say which file this is, so the toolbar repeats nothing that is missing.
 */
export function PdfPane({
  root,
  path,
  rev,
  reloadKey,
  onMenu
}: {
  root: string
  path: string
  /** Revision to read from; null means the file on disk. */
  rev: string | null
  /** Bumped when the repository changes, to re-read a work-tree file. */
  reloadKey: number
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg } = useMsg()
  const [url, setUrl] = useState<string | null>(null)
  const [bytes, setBytes] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let made: string | null = null
    void (async () => {
      try {
        const r = await window.gitty.git.readPdf(root, rev, path)
        if (cancelled) return
        setBytes(r.bytes)
        setNotice(r.notice)
        if (r.data === null) {
          setUrl(null)
          return
        }
        made = URL.createObjectURL(new Blob([r.data], { type: 'application/pdf' }))
        setUrl(made)
      } catch (e) {
        if (cancelled) return
        setUrl(null)
        setNotice(String(e))
      }
    })()
    return () => {
      cancelled = true
      if (made) URL.revokeObjectURL(made)
    }
    // A PDF read from a revision never changes; only work-tree files reload.
  }, [root, path, rev, rev === null ? reloadKey : 0])

  return (
    <div
      className="pane-body pdf-host"
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu({ x: e.clientX, y: e.clientY, items: [] })
      }}
    >
      {url === null ? (
        <div className="empty">{notice ?? msg.common.loading}</div>
      ) : (
        <>
          {/* The viewer's own toolbar is inside the frame; the caption below is
              the pane's, and says what the toolbar does not. */}
          <iframe className="pdf-frame" src={url} title={path} />
          <div className="pdf-caption">{humanBytes(bytes)}</div>
        </>
      )}
    </div>
  )
}
