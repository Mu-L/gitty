import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import lua from 'highlight.js/lib/languages/lua'
import markdown from 'highlight.js/lib/languages/markdown'
import php from 'highlight.js/lib/languages/php'
import python from 'highlight.js/lib/languages/python'
import ruby from 'highlight.js/lib/languages/ruby'
import rust from 'highlight.js/lib/languages/rust'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
import type { MenuState } from './ContextMenu'

// Registered one by one rather than importing all of highlight.js: the full
// bundle is several times the size of the rest of the renderer.
for (const [name, lang] of [
  ['bash', bash],
  ['c', c],
  ['cpp', cpp],
  ['csharp', csharp],
  ['css', css],
  ['diff', diff],
  ['go', go],
  ['ini', ini],
  ['java', java],
  ['javascript', javascript],
  ['json', json],
  ['lua', lua],
  ['markdown', markdown],
  ['php', php],
  ['python', python],
  ['ruby', ruby],
  ['rust', rust],
  ['shell', shell],
  ['sql', sql],
  ['typescript', typescript],
  ['xml', xml],
  ['yaml', yaml]
] as const) {
  hljs.registerLanguage(name, lang)
}

/** `html: false` keeps raw HTML in the source inert — no sanitiser needed. */
const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: false,
  // Fenced blocks are coloured only when they name a language we registered;
  // guessing on short snippets colours them wrong more often than right.
  highlight: (code, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
      } catch {
        /* fall through to plain escaping */
      }
    }
    return ''
  }
})

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

/** YAML front matter, which markdown-it would otherwise read as a rule + text. */
const FRONT_MATTER = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/

function renderFrontMatter(yaml: string): string {
  let inner: string
  try {
    inner = hljs.highlight(yaml, { language: 'yaml', ignoreIllegals: true }).value
  } catch {
    inner = md.utils.escapeHtml(yaml)
  }
  return `<div class="md-frontmatter"><pre><code>${inner}</code></pre></div>`
}

/** Render markdown and collect its heading structure in one pass. */
function render(source: string): { html: string; headings: Heading[] } {
  const fm = FRONT_MATTER.exec(source)
  const body = fm ? source.slice(fm[0].length) : source
  const tokens = md.parse(body, {})
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

  const html = md.renderer.render(tokens, md.options, {})
  return { html: fm ? renderFrontMatter(fm[1]) + html : html, headings }
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
