import { useEffect, useRef, useState, type JSX } from 'react'
import { useMsg } from '../locale'
import type { MenuState } from './ContextMenu'
import { useFind } from './useFind'
import { isCopyChord } from '../copy'

/**
 * The highlight styles have to live inside the frame, which cannot see the
 * app's CSS variables — so their current values are copied in as literals.
 * A theme changed after this runs is picked up the next time the frame loads.
 */
function injectFindStyles(doc: Document): void {
  if (doc.getElementById('gitty-find-style')) return
  const v = (n: string): string => getComputedStyle(document.documentElement).getPropertyValue(n)
  const style = doc.createElement('style')
  style.id = 'gitty-find-style'
  style.textContent = `
    ::highlight(gitty-find) { background-color: ${v('--find-bg')}; color: ${v('--find-fg')}; }
    ::highlight(gitty-find-current) {
      background-color: ${v('--find-current-bg')}; color: ${v('--find-current-fg')};
    }`
  doc.head?.appendChild(style)
}

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
  active,
  onMenu
}: {
  source: string
  /** Identifies the document, not its text; changes only on opening another. */
  docKey: string
  /** When true the iframe is sized to its content rather than filling the pane. */
  wrap: boolean
  /** On screen in the active tab, so Ctrl+F belongs to this view. */
  active: boolean
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg } = useMsg()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState<number | null>(null)
  // The searched nodes are the frame's, not ours; `loaded` re-runs the search
  // when a new document lands in it.
  const frameBody = useRef<HTMLElement | null>(null)
  const [loaded, setLoaded] = useState(0)

  // Re-measure the iframe content height after every render so the host page
  // can scroll the whole document when wrap is on (one continuous scroll).
  useEffect(() => {
    const el = iframeRef.current
    if (!el) return
    const onLoad = (): void => {
      try {
        const doc = el.contentDocument
        if (!doc) return
        frameBody.current = doc.body
        injectFindStyles(doc)
        // Keys pressed inside the frame never reach the host, so the second
        // copy chord is answered here too. The listener goes with the document
        // it is added to, which a reload replaces wholesale.
        doc.addEventListener('keydown', (e) => {
          if (!isCopyChord(e)) return
          const sel = doc.getSelection()?.toString() ?? ''
          if (!sel) return
          e.preventDefault()
          void window.gitty.clipboard.write(sel)
        })
        setLoaded((n) => n + 1)
        if (wrap) setHeight(doc.documentElement.scrollHeight)
      } catch {
        // A cross-origin frame would throw, but srcdoc is always same-origin.
      }
    }
    el.addEventListener('load', onLoad)
    return () => el.removeEventListener('load', onLoad)
  }, [source, wrap])

  // Reset the measured height when the document changes.
  useEffect(() => setHeight(null), [docKey])

  const find = useFind({
    hostRef: frameBody,
    active,
    contentKey: loaded,
    resetKey: docKey,
    frame: true
  })

  return (
    <div className="find-host">
      {find.bar}
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
    </div>
  )
}
