import { useEffect, useRef, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import type { MenuState } from './ContextMenu'

/**
 * Renders an HTML document in a sandboxed iframe. The source is loaded through
 * `srcdoc` so the renderer never navigates away from the app, and the sandbox
 * attribute prevents the embedded page from breaking out while still letting
 * scripts and styles run — the user is viewing their own files.
 */
export function HtmlPane({
  source,
  docKey,
  wrap,
  onMenu
}: {
  source: string
  /** Identifies the document, not its text; changes only on opening another. */
  docKey: string
  /** When true the iframe is sized to its content rather than filling the pane. */
  wrap: boolean
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg } = useMsg()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  // Re-measure the iframe content height after every render so the host page
  // can scroll the whole document when wrap is on (one continuous scroll).
  useEffect(() => {
    const el = iframeRef.current
    if (!el) return
    const onLoad = (): void => {
      if (!wrap) return
      try {
        const doc = el.contentDocument
        if (doc) {
          const h = doc.documentElement.scrollHeight
          setHeight(h)
        }
      } catch {
        // A cross-origin frame would throw, but srcdoc is always same-origin.
      }
    }
    el.addEventListener('load', onLoad)
    return () => el.removeEventListener('load', onLoad)
  }, [source, wrap])

  // Reset the measured height when the document changes.
  useEffect(() => setHeight(null), [docKey])

  return (
    <div
      className="html-host"
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu({ x: e.clientX, y: e.clientY, items: [] })
      }}
    >
      <iframe
        ref={iframeRef}
        className={`html-frame${wrap ? ' wrap' : ''}`}
        srcDoc={source}
        sandbox="allow-scripts allow-same-origin"
        title={docKey}
        style={wrap && height !== null ? { height: `${height}px` } : undefined}
      />
    </div>
  )
}
