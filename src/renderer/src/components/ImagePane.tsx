import { useEffect, useState, type JSX } from 'react'
import type { MenuState } from './ContextMenu'

/** Extensions the image preview claims; must match `IMAGE_MIME` in main/git.ts. */
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|ico|avif|svg)$/i

export function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path)
}

function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * One image file, from the work tree or from a revision. The bytes arrive as a
 * data: URL — the renderer has no disk access, and a revision's bytes were
 * never on disk to point at.
 */
export function ImagePane({
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
  const [src, setSrc] = useState<string | null>(null)
  const [bytes, setBytes] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [size, setSize] = useState<{ w: number; h: number } | null>(null)
  /** Fit to the pane, or show every pixel and scroll. */
  const [actual, setActual] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const r = await window.gitty.git.readImage(root, rev, path)
        if (cancelled) return
        setSrc(r.dataUrl)
        setBytes(r.bytes)
        setNotice(r.notice)
      } catch (e) {
        if (cancelled) return
        setSrc(null)
        setNotice(String(e))
      }
    })()
    return () => {
      cancelled = true
    }
    // An image read from a revision never changes; only work-tree files reload.
  }, [root, path, rev, rev === null ? reloadKey : 0])

  // Keep the zoom when the same file is re-read; drop it on another image.
  useEffect(() => setActual(false), [root, path, rev])

  return (
    <div
      className="pane-body image-host"
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu({ x: e.clientX, y: e.clientY, items: [] })
      }}
    >
      {src === null ? (
        <div className="empty">{notice ?? 'Loading…'}</div>
      ) : (
        <>
          <div className={`image-stage${actual ? ' actual' : ''}`}>
            <img
              src={src}
              alt={path}
              title={actual ? 'Click to fit' : 'Click for actual size'}
              onClick={() => setActual((a) => !a)}
              onLoad={(e) =>
                setSize({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight
                })
              }
            />
          </div>
          <div className="image-caption">
            {size ? `${size.w} × ${size.h}` : '—'} · {humanBytes(bytes)}
            {/* SVG has no intrinsic pixel size to report; the rest do. */}
          </div>
        </>
      )}
    </div>
  )
}
