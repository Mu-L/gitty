import { useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react'
import MarkdownIt from 'markdown-it'
import { hljs } from '../highlight'
import { useMsg } from '../locale'
import type { MenuState } from './ContextMenu'
import { useFind } from './useFind'

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

/**
 * An image in a document points at a path in the repository, which the renderer
 * cannot fetch — a relative URL would resolve against the bundle, not the work
 * tree. The bytes are read over the API and fed back in here, so the browser
 * never requests a URL that cannot exist. Until they arrive (and for one that
 * cannot be read) the src is a blank pixel.
 *
 * The substitution has to happen while rendering rather than on the rendered
 * DOM: React owns that subtree through `dangerouslySetInnerHTML` and rewrites
 * it wholesale, discarding anything patched in behind its back.
 */
const BLANK_PIXEL =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

/**
 * What `render` passes to (and collects from) the image rule below.
 * markdown-it types `env` as an index signature, hence the cast at each use.
 */
interface ImageEnv {
  [key: string | symbol]: unknown
  /** Every repository-relative src the document mentions, in reading order. */
  refs: Set<string>
  /** Bytes already fetched: src → data URL, or null when it could not be read. */
  loaded: Map<string, string | null>
}

md.renderer.rules.image = (tokens, idx, options, rawEnv, self) => {
  const env = rawEnv as unknown as ImageEnv
  const token = tokens[idx]
  const alt = token.attrIndex('alt')
  if (alt >= 0 && token.attrs) {
    token.attrs[alt][1] = self.renderInlineAsText(token.children ?? [], options, env as never)
  }
  const src = String(token.attrGet('src') ?? '')
  // Web images load themselves; only repository paths need fetching.
  if (!/^[a-z][a-z0-9+.-]*:/i.test(src)) {
    env.refs.add(src)
    const data = env.loaded.get(src)
    token.attrSet('src', data ?? BLANK_PIXEL)
    // Distinguish "not there" from "not fetched yet": only a resolved-to-null
    // entry is a real miss, and it is the one that gets the placeholder box.
    if (data === null) token.attrSet('class', 'md-img-missing')
  }
  return self.renderToken(tokens, idx, options)
}

/** Images fetched per document, so a gallery cannot spawn git processes forever. */
const MAX_INLINE_IMAGES = 100

/**
 * A document-relative link resolved to a repository-relative path, or null when
 * it escapes the repository (or is empty). A leading `/` means the repository
 * root, as it does on the forges people write these files for.
 */
function resolveInRepo(docPath: string, src: string): string | null {
  let clean: string
  try {
    clean = decodeURIComponent(src.split('#')[0].split('?')[0])
  } catch {
    clean = src.split('#')[0].split('?')[0]
  }
  if (!clean) return null
  const base = docPath.split('/').slice(0, -1)
  const parts = clean.startsWith('/') ? clean.slice(1).split('/') : [...base, ...clean.split('/')]
  const out: string[] = []
  for (const p of parts) {
    if (p === '' || p === '.') continue
    if (p === '..') {
      if (out.length === 0) return null
      out.pop()
      continue
    }
    out.push(p)
  }
  return out.length > 0 ? out.join('/') : null
}

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

/** Render markdown, collecting its headings and its image references. */
function render(
  source: string,
  loaded: Map<string, string | null>
): { html: string; headings: Heading[]; refs: string[] } {
  const fm = FRONT_MATTER.exec(source)
  const body = fm ? source.slice(fm[0].length) : source
  const env: ImageEnv = { refs: new Set(), loaded }
  const tokens = md.parse(body, env as never)
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

  const html = md.renderer.render(tokens, md.options, env as never)
  return {
    html: fm ? renderFrontMatter(fm[1]) + html : html,
    headings,
    refs: [...env.refs]
  }
}

export function MarkdownPane({
  source,
  docKey,
  root,
  docPath,
  rev,
  outline,
  wrap,
  active,
  onMenu
}: {
  source: string
  /** Identifies the document, not its text; changes only on opening another. */
  docKey: string
  root: string
  /** The document's own path, which its images are written relative to. */
  docPath: string
  /** Revision the document was opened at; null for the work tree. */
  rev: string | null
  /** Show the heading outline beside the document. */
  outline: boolean
  /** Wrap fenced code blocks and tables instead of scrolling them sideways. */
  wrap: boolean
  /** On screen in the active tab — only then does Ctrl+F belong to it. */
  active: boolean
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const { msg } = useMsg()
  const [images, setImages] = useState<Map<string, string | null>>(new Map())
  const { html, headings, refs } = useMemo(() => render(source, images), [source, images])
  const bodyRef = useRef<HTMLDivElement>(null)
  // Which heading the outline marks — not to be confused with the `active`
  // prop, which is about this pane being the one on screen.
  const [activeHeading, setActiveHeading] = useState<string | null>(null)

  const scrollTop = useRef(0)

  // Going back to the top belongs to opening a document, not to its text
  // changing underneath: a work-tree file is re-read on every repository
  // change, and a reader halfway down a long document stays there.
  useLayoutEffect(() => {
    scrollTop.current = 0
    if (bodyRef.current) bodyRef.current.scrollTop = 0
    setActiveHeading(headings[0]?.id ?? null)
    // Images are keyed by the src as written, which means different files in
    // different documents — and different bytes at different revisions.
    setImages(new Map())
    // headings belong to this source, and source changes with docKey.
  }, [docKey])

  // Replacing the body's HTML resets its scroll — and a shorter document
  // clamps it — so put the reader back where they were. Runs after the reset
  // above, which has already zeroed the remembered position when the document
  // itself changed.
  useLayoutEffect(() => {
    const el = bodyRef.current
    if (el && el.scrollTop !== scrollTop.current) el.scrollTop = scrollTop.current
  }, [html])

  // Fetch the document's images, then hand them all to one re-render. One
  // request at a time — a page of screenshots would otherwise start a git
  // process per image at once — and one `setImages`, so a long gallery does not
  // re-render the document once per picture.
  const refsKey = refs.join('\n')
  useEffect(() => {
    const wanted = refsKey ? refsKey.split('\n') : []
    if (wanted.length === 0) return
    // Every ref already answered for: nothing to do, and re-running would loop.
    if (wanted.every((r) => images.has(r))) return

    let cancelled = false
    void (async () => {
      const next = new Map<string, string | null>()
      for (const raw of wanted.slice(0, MAX_INLINE_IMAGES)) {
        const rel = resolveInRepo(docPath, raw)
        if (!rel) {
          next.set(raw, null)
          continue
        }
        try {
          const r = await window.gitty.git.readImage(root, rev, rel)
          next.set(raw, r.dataUrl)
        } catch {
          // Not in the repository at this revision; the placeholder says so.
          next.set(raw, null)
        }
      }
      // Anything past the cap stays a blank pixel rather than a broken one.
      for (const raw of wanted.slice(MAX_INLINE_IMAGES)) next.set(raw, null)
      if (!cancelled) setImages(next)
    })()
    return () => {
      cancelled = true
    }
  }, [refsKey, images, root, docPath, rev])

  // Highlight the outline entry for the heading currently at the top.
  useEffect(() => {
    const el = bodyRef.current
    if (!el) return
    const onScroll = (): void => {
      scrollTop.current = el.scrollTop
      if (headings.length === 0) return
      let current = headings[0].id
      for (const h of headings) {
        const node = el.querySelector<HTMLElement>(`[id="${CSS.escape(h.id)}"]`)
        if (!node) continue
        if (node.offsetTop - el.scrollTop <= 8) current = h.id
        else break
      }
      setActiveHeading(current)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [headings])

  const find = useFind({ hostRef: bodyRef, active, contentKey: html, resetKey: docKey })

  // The prop object, not just the string. React sets innerHTML whenever the
  // dangerouslySetInnerHTML prop is a different object — a fresh `{__html}`
  // every render means the whole document is rebuilt on every state change
  // (a scroll updating the outline was enough), which throws away the find
  // Ranges and any other node identity the document has.
  const htmlProp = useMemo(() => ({ __html: html }), [html])

  const goto = (id: string): void => {
    const el = bodyRef.current
    const node = el?.querySelector<HTMLElement>(`[id="${CSS.escape(id)}"]`)
    if (el && node) el.scrollTo({ top: node.offsetTop - 4 })
    setActiveHeading(id)
  }

  return (
    <div className="md-host" onContextMenu={(e) => {
      e.preventDefault()
      onMenu({ x: e.clientX, y: e.clientY, items: [] })
    }}>
      {find.bar}
      {outline && headings.length > 0 && (
        <nav className="md-outline">
          <div className="md-outline-title">{msg.diff.outline}</div>
          {headings.map((h) => (
            <div
              key={h.id}
              className={`md-toc-item lvl-${h.level}${activeHeading === h.id ? ' active' : ''}`}
              title={h.text}
              onClick={() => goto(h.id)}
            >
              {h.text}
            </div>
          ))}
        </nav>
      )}
      <div
        className={`md-body${wrap ? ' wrap' : ''}${find.open ? ' finding' : ''}`}
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
        dangerouslySetInnerHTML={htmlProp}
      />
    </div>
  )
}
