import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import MarkdownIt from 'markdown-it'
import type { MenuState } from './ContextMenu'

/** `html: false` keeps raw HTML in the source inert — no sanitiser needed. */
const md = new MarkdownIt({ html: false, linkify: true, breaks: false })

export interface Heading {
  id: string
  level: number
  text: string
}

/** Stable, unique ids so outline links and headings always agree. */
function slugger(): (text: string) => string {
  const seen = new Map<string, number>()
  return (text) => {
    const base =
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s-]/gu, '')
        .trim()
        .replace(/\s+/g, '-') || 'section'
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    return n === 0 ? base : `${base}-${n}`
  }
}

/** Render markdown and collect its heading structure in one pass. */
function render(source: string): { html: string; headings: Heading[] } {
  const tokens = md.parse(source, {})
  const headings: Heading[] = []
  const slug = slugger()

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i]
    if (t.type !== 'heading_open') continue
    const inline = tokens[i + 1]
    const text = inline?.content?.trim() ?? ''
    const id = slug(text)
    t.attrSet('id', id)
    headings.push({ id, level: Number(t.tag.slice(1)), text })
  }

  return { html: md.renderer.render(tokens, md.options, {}), headings }
}

export function MarkdownPane({
  source,
  outline,
  wrap,
  onMenu
}: {
  source: string
  /** Show the heading outline beside the document. */
  outline: boolean
  /** Wrap fenced code blocks and tables instead of scrolling them sideways. */
  wrap: boolean
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { html, headings } = useMemo(() => render(source), [source])
  const bodyRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    setActive(headings[0]?.id ?? null)
  }, [source, headings])

  // Highlight the outline entry for the heading currently at the top.
  useEffect(() => {
    const el = bodyRef.current
    if (!el || headings.length === 0) return
    const onScroll = (): void => {
      let current = headings[0].id
      for (const h of headings) {
        const node = el.querySelector<HTMLElement>(`[id="${CSS.escape(h.id)}"]`)
        if (!node) continue
        if (node.offsetTop - el.scrollTop <= 8) current = h.id
        else break
      }
      setActive(current)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [headings])

  const goto = (id: string): void => {
    const el = bodyRef.current
    const node = el?.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`)
    if (el && node) el.scrollTo({ top: node.offsetTop - 4 })
    setActive(id)
  }

  return (
    <div className="md-host" onContextMenu={(e) => {
      e.preventDefault()
      onMenu({ x: e.clientX, y: e.clientY, items: [] })
    }}>
      {outline && headings.length > 0 && (
        <nav className="md-outline">
          <div className="md-outline-title">Outline</div>
          {headings.map((h) => (
            <div
              key={h.id}
              className={`md-toc-item lvl-${h.level}${active === h.id ? ' active' : ''}`}
              title={h.text}
              onClick={() => goto(h.id)}
            >
              {h.text}
            </div>
          ))}
        </nav>
      )}
      <div
        className={`md-body${wrap ? ' wrap' : ''}`}
        ref={bodyRef}
        onClick={(e) => {
          // Links must never navigate the window away from the app.
          const a = (e.target as HTMLElement).closest('a')
          if (!a) return
          e.preventDefault()
          const href = a.getAttribute('href') ?? ''
          if (/^https?:\/\//i.test(href)) void window.gitty.file.openExternal(href)
          else if (href.startsWith('#')) goto(href.slice(1))
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
