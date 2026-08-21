import { useEffect, useLayoutEffect, useMemo, useRef, useState, type JSX } from 'react'
import MarkdownIt, { type Token } from 'markdown-it'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { hljs } from '../highlight'
import { useMsg } from '../locale'
import { useDocumentMarks, type DocumentMarks } from '../plugins'
import { decorateSegment } from '../../../plugins/marks'
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
 * What `render` passes to (and collects from) the rules below.
 * markdown-it types `env` as an index signature, hence the cast at each use.
 */
interface RenderEnv {
  [key: string | symbol]: unknown
  /** Every repository-relative src the document mentions, in reading order. */
  refs: Set<string>
  /** Bytes already fetched: src → data URL, or null when it could not be read. */
  loaded: Map<string, string | null>
  /** Number source lines in the gutter. */
  lines: boolean
  /** New-side source lines the diff marks as added; those gutter numbers are
   *  drawn green. Null when there is no diff to mirror. */
  changed: Set<number> | null
  /** Lines of front matter sliced off before parsing; see `render`. */
  lineOffset: number
  /** Every enabled plugin's marks for this document, or null when none is —
   *  see `ref/spec/plugins.md`. */
  marks: DocumentMarks | null
  /** Every text segment some plugin wants, collected as the document renders. */
  wanted: Set<string>
}

/**
 * A plugin's marks go on here, in the render pass, for the same reason the
 * images are substituted here: React owns the document through
 * `dangerouslySetInnerHTML` and rewrites it wholesale, so a mark painted onto
 * the rendered DOM would be discarded by the next change to anything at all.
 *
 * Overriding `text` also gets the scope right for free: a fence, an inline
 * code span and an HTML block are other token types, so code is never marked
 * as if it were prose.
 *
 * The pane knows nothing about what is being marked — see the `marks`
 * extension point in `ref/spec/plugins.md`.
 */
md.renderer.rules.text = (tokens, idx, _options, rawEnv) => {
  const env = rawEnv as unknown as RenderEnv
  const content = tokens[idx].content
  if (!env.marks || !env.marks.wanted(content)) return md.utils.escapeHtml(content)
  env.wanted.add(content)
  const placed = env.marks.placed(content)
  return placed.length > 0 ? decorateSegment(content, placed) : md.utils.escapeHtml(content)
}

md.renderer.rules.image = (tokens, idx, options, rawEnv, self) => {
  const env = rawEnv as unknown as RenderEnv
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

/**
 * A fence carries its attributes on the inner `<code>`, which scrolls sideways
 * with the code when wrapping is off — so the gutter number, which has to stay
 * put, is written onto the `<pre>` here instead of through `markLines`.
 */
const renderFence = md.renderer.rules.fence
md.renderer.rules.fence = (tokens, idx, options, rawEnv, self) => {
  const out = renderFence?.(tokens, idx, options, rawEnv, self) ?? ''
  const env = rawEnv as unknown as RenderEnv
  const map = tokens[idx].map
  if (!env.lines || !map) return out
  const line = map[0] + 1 + env.lineOffset
  const changed = env.changed?.has(line) ? ' data-changed=""' : ''
  return out.replace('<pre', `<pre data-line="${line}"${changed}`)
}

/**
 * A table scrolls sideways (`display: block; overflow-x: auto`), which both
 * clips a gutter number and puts its static position below the rows. Wrapping
 * it in a plain block gives the number something in normal flow to sit beside.
 */
md.renderer.rules.table_open = (tokens, idx, options, rawEnv, self) => {
  const env = rawEnv as unknown as RenderEnv
  const map = tokens[idx].map
  const open = self.renderToken(tokens, idx, options)
  if (!env.lines) return open
  const line = map ? map[0] + 1 + env.lineOffset : 0
  const at = map ? ` data-line="${line}"` : ''
  const changed = map && env.changed?.has(line) ? ' data-changed=""' : ''
  return `<div class="md-table"${at}${changed}>${open}`
}
md.renderer.rules.table_close = (tokens, idx, options, rawEnv, self) => {
  const env = rawEnv as unknown as RenderEnv
  const close = self.renderToken(tokens, idx, options)
  return env.lines ? `${close}</div>` : close
}

/**
 * Tag each block with the source line it starts on, for the gutter.
 *
 * Only top-level blocks are numbered, plus list items wherever they nest: a
 * list opens on the same line as its first item, so numbering both would put
 * two numbers on one gutter row, and a paragraph inside a list item or a row
 * inside a table would do the same. Fences and tables are left to the rules
 * above, which have their own reasons to write the attribute themselves.
 */
function markLines(tokens: Token[], offset: number, changed: Set<number> | null): void {
  let depth = 0
  for (const t of tokens) {
    if (t.nesting === -1) {
      depth--
      continue
    }
    const top = depth === 0
    if (t.nesting === 1) depth++
    if (!t.map || t.type === 'fence' || t.type === 'table_open') continue
    if (t.type === 'bullet_list_open' || t.type === 'ordered_list_open') continue
    if (t.type === 'list_item_open' || top) {
      const line = t.map[0] + 1 + offset
      t.attrSet('data-line', String(line))
      if (changed?.has(line)) t.attrSet('data-changed', '')
    }
  }
}

/**
 * A link whose target is another file in this repository, i.e. one Ctrl+click
 * would open. Rendered as a hover title rather than a colour of its own: the
 * link already looks like a link, and what is worth saying is that this one
 * leads somewhere Gitty can go.
 */
function markRepoLinks(tokens: Token[], docPath: string, hint: string): void {
  for (const t of tokens) {
    if (t.children) markRepoLinks(t.children, docPath, hint)
    if (t.type !== 'link_open') continue
    const href = String(t.attrGet('href') ?? '')
    // A scheme (https:, mailto:, file:) or a bare anchor is not a file here.
    if (!href || href.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(href)) continue
    if (!resolveInRepo(docPath, href)) continue
    // Never over a title the author wrote — that one says something this
    // does not.
    if (t.attrGet('title') === null) t.attrSet('title', hint)
  }
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

/**
 * The heading a link's `#fragment` names, or null. Our slugs and a forge's
 * agree on ordinary headings; when they do not — or when the fragment names an
 * anchor written as raw HTML, which is inert here — there is nothing to scroll
 * to and the document opens at its top rather than somewhere arbitrary.
 */
function headingFor(headings: Heading[], fragment: string): Heading | null {
  let want = fragment
  try {
    want = decodeURIComponent(fragment)
  } catch {
    /* a malformed escape is not a reason to fail the jump */
  }
  const lower = want.toLowerCase()
  return (
    headings.find((h) => h.id === want) ??
    headings.find((h) => h.id.toLowerCase() === lower) ??
    null
  )
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

function renderFrontMatter(yaml: string, lines: boolean, changed: Set<number> | null): string {
  let inner: string
  try {
    inner = hljs.highlight(yaml, { language: 'yaml', ignoreIllegals: true }).value
  } catch {
    inner = md.utils.escapeHtml(yaml)
  }
  // Front matter is always the top of the file, so its own line is 1.
  const at = lines ? ' data-line="1"' : ''
  const ch = lines && changed?.has(1) ? ' data-changed=""' : ''
  return `<div class="md-frontmatter"${at}${ch}><pre><code>${inner}</code></pre></div>`
}

/** Render markdown, collecting its headings and its image references. */
function render(
  source: string,
  loaded: Map<string, string | null>,
  lines: boolean,
  changed: Set<number> | null,
  docPath: string,
  linkHint: string,
  marks: DocumentMarks | null
): { html: string; headings: Heading[]; refs: string[]; segments: string[] } {
  const fm = FRONT_MATTER.exec(source)
  const body = fm ? source.slice(fm[0].length) : source
  // Token line numbers count from the start of what was parsed, and front
  // matter was sliced off first — so the gutter has to add it back.
  const lineOffset = fm ? (fm[0].match(/\n/g)?.length ?? 0) : 0
  const env: RenderEnv = { refs: new Set(), loaded, lines, changed, lineOffset, marks, wanted: new Set() }
  const tokens = md.parse(body, env as never)
  const headings: Heading[] = []
  const slug = slugger()

  if (lines) markLines(tokens, lineOffset, changed)
  markRepoLinks(tokens, docPath, linkHint)

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
    html: fm ? renderFrontMatter(fm[1], lines, changed) + html : html,
    headings,
    refs: [...env.refs],
    segments: [...env.wanted]
  }
}

export function MarkdownPane({
  source,
  docKey,
  root,
  docPath,
  rev,
  outline,
  lineNumbers,
  changedLines = null,
  wrap,
  active,
  onMenu,
  onOpenPath,
  onOpenDir,
  anchor
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
  /** Number each block in the gutter with the source line it starts on. */
  lineNumbers: boolean
  /** New-side source lines the diff on screen marks as added; their gutter
   *  numbers are drawn green, the diff's own add colour. Null when the diff
   *  does not cover this document. */
  changedLines?: Set<number> | null
  /** Wrap fenced code blocks and tables instead of scrolling them sideways. */
  wrap: boolean
  /** On screen in the active tab — only then does Ctrl+F belong to it. */
  active: boolean
  onMenu: (state: MenuState) => void
  /** Ctrl+click on a link into this repository opens that file, at this
   *  document's own revision rather than the view's — the link was written
   *  about the text it sits in. */
  onOpenPath?: (path: string, rev: string | null, anchor?: string) => void
  /** A link that names a directory: jump the file pane to that folder, at the
   *  document's own revision — a folder has no document of its own to open. */
  onOpenDir?: (path: string, rev: string | null) => void
  /** Heading this document was opened at, from the `#fragment` of the link
   *  that opened it. */
  anchor?: string
}): JSX.Element {
  const { msg } = useMsg()
  const [images, setImages] = useState<Map<string, string | null>>(new Map())
  // Whatever the enabled plugins make of this document's text. The pane hands
  // them the segments its own render pass collected and draws what comes back;
  // see `ref/spec/plugins.md`.
  const [segments, setSegments] = useState<string[]>([])
  const marks = useDocumentMarks(docKey, segments)
  const { html, headings, refs, segments: found } = useMemo(
    () => render(source, images, lineNumbers, changedLines, docPath, msg.diff.openLinkHint, marks),
    [source, images, lineNumbers, changedLines, docPath, msg, marks]
  )
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
    // What the last document wanted marked is not what this one does; the
    // hook drops its own answers on the same key.
    setSegments([])
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

  // What the render pass found worth marking, handed back to the hook. Kept as
  // state rather than passed straight through, because the render is what
  // discovers it and the analysis is what changes it.
  const foundKey = found.join('\u0000')
  useEffect(() => {
    setSegments(foundKey ? foundKey.split('\u0000') : [])
  }, [foundKey])

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

  // A link that named a heading opens there. Once per document-and-anchor:
  // where the reader scrolls afterwards is their own business, and the images
  // landing later must not drag them back. `html` is a dependency because the
  // headings have to be in the DOM before there is anything to scroll to.
  const jumped = useRef('')
  useLayoutEffect(() => {
    if (!anchor) return
    const key = `${docKey}#${anchor}`
    if (jumped.current === key) return
    const heading = headingFor(headings, anchor)
    if (!heading) return
    jumped.current = key
    goto(heading.id)
  }, [anchor, docKey, headings, html])

  const nav = (
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
  )

  const body = (
    <div
      className={`md-body${wrap ? ' wrap' : ''}${lineNumbers ? ' lines' : ''}${find.open ? ' finding' : ''}`}
      ref={bodyRef}
      onClick={(e) => {
        // Links must never navigate the window away from the app.
        const a = (e.target as HTMLElement).closest('a')
        if (!a) return
        e.preventDefault()
        const href = a.getAttribute('href') ?? ''
        if (/^https?:\/\//i.test(href)) void window.gitty.file.openExternal(href)
        else if (href.startsWith('#')) goto(href.slice(1))
        else if (e.ctrlKey || e.metaKey) {
          // A path in the repository. Anything that escapes the root — or names
          // another scheme — is left alone.
          if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return
          const target = resolveInRepo(docPath, href)
          if (!target) return
          // The fragment travels with it: `manual.md#the-window` opens the
          // manual at that heading, the way it would on a forge.
          const anchor = href.split('#')[1] || undefined
          // A link can name a directory as well as a file, and a folder has no
          // document of its own — so the kind is settled before anything is
          // opened, and a directory jumps the file pane to that folder instead.
          void window.gitty.git
            .pathKind(root, rev, target)
            .then((kind) => {
              if (kind === 'dir') onOpenDir?.(target, rev)
              else onOpenPath?.(target, rev, anchor)
            })
            .catch(() => onOpenPath?.(target, rev, anchor))
        }
      }}
      dangerouslySetInnerHTML={htmlProp}
    />
  )

  return (
    <div className="md-host" onContextMenu={(e) => {
      e.preventDefault()
      onMenu({ x: e.clientX, y: e.clientY, items: [] })
    }}>
      {find.bar}
      {marks.css ? <style>{marks.css}</style> : null}
      {outline && headings.length > 0 ? (
        // The width is shared by every document in this repository rather than
        // kept per file: it is a reading preference, not a property of the text.
        // Disabled while the tab is hidden — the library hit-tests every
        // registered group, and a display:none one reports a zero-sized rect.
        <Group
          orientation="horizontal"
          className="md-split"
          id={`md-outline-${root.replace(/[^A-Za-z0-9_-]/g, '_')}`}
          disabled={!active}
        >
          <Panel className="md-pane" defaultSize="22%" minSize="8%" maxSize="50%">
            {nav}
          </Panel>
          <Separator className="sep-v" />
          <Panel className="md-pane" minSize="30%">
            {body}
          </Panel>
        </Group>
      ) : (
        body
      )}
    </div>
  )
}
