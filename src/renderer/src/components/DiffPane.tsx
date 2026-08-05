import { useEffect, useMemo, useRef, useState, type JSX } from 'react'
import type { MenuState } from './ContextMenu'

/** Rows rendered before the first scroll, and added each time the end nears. */
const CHUNK = 1500

type LineKind = 'add' | 'del' | 'ctx' | 'hunk' | 'file' | 'meta'

export type DiffView = 'inline' | 'split'

interface DiffLine {
  kind: LineKind
  text: string
  oldNo: number | null
  newNo: number | null
}

/** One rendered row: either a pair of sides, or a header spanning both. */
interface Row {
  left?: DiffLine
  right?: DiffLine
  full?: DiffLine
}

const CLS: Record<LineKind, string> = {
  add: 'dl-add',
  del: 'dl-del',
  ctx: '',
  hunk: 'dl-hunk',
  file: 'dl-file',
  meta: 'dl-meta'
}

const META_PREFIXES = [
  'index ',
  '--- ',
  '+++ ',
  'old mode',
  'new mode',
  'new file',
  'deleted file',
  'similarity index',
  'dissimilarity index',
  'rename from',
  'rename to',
  'copy from',
  'copy to',
  'Binary files',
  '\\ No newline'
]

/** Parse a unified diff into lines carrying old/new line numbers. */
function parsePatch(patch: string): DiffLine[] {
  if (!patch) return []
  const out: DiffLine[] = []
  let oldNo = 0
  let newNo = 0

  for (const text of patch.split('\n')) {
    if (text.startsWith('diff --git') || text.startsWith('diff --cc')) {
      out.push({ kind: 'file', text, oldNo: null, newNo: null })
    } else if (META_PREFIXES.some((p) => text.startsWith(p))) {
      out.push({ kind: 'meta', text, oldNo: null, newNo: null })
    } else if (text.startsWith('@@')) {
      const m = /^@@+ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text)
      if (m) {
        oldNo = Number(m[1])
        newNo = Number(m[2])
      }
      out.push({ kind: 'hunk', text, oldNo: null, newNo: null })
    } else if (text.startsWith('+')) {
      out.push({ kind: 'add', text, oldNo: null, newNo: newNo++ })
    } else if (text.startsWith('-')) {
      out.push({ kind: 'del', text, oldNo: oldNo++, newNo: null })
    } else {
      out.push({ kind: 'ctx', text, oldNo: oldNo++, newNo: newNo++ })
    }
  }

  if (out.length && out[out.length - 1].text === '') out.pop()
  return out
}

/**
 * Group lines into side-by-side rows: a run of deletions is zipped with the
 * additions that follow it, so a modified line shows old and new next to
 * each other. Headers span both columns.
 */
function pairLines(lines: DiffLine[]): Row[] {
  const rows: Row[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (line.kind === 'del') {
      const dels: DiffLine[] = []
      while (i < lines.length && lines[i].kind === 'del') dels.push(lines[i++])
      const adds: DiffLine[] = []
      while (i < lines.length && lines[i].kind === 'add') adds.push(lines[i++])
      for (let k = 0; k < Math.max(dels.length, adds.length); k++) {
        rows.push({ left: dels[k], right: adds[k] })
      }
    } else if (line.kind === 'add') {
      rows.push({ right: line })
      i++
    } else if (line.kind === 'ctx') {
      rows.push({ left: line, right: line })
      i++
    } else {
      rows.push({ full: line })
      i++
    }
  }
  return rows
}

/** Drop the leading +/-/space marker; the colour already carries that meaning. */
function body(line: DiffLine): string {
  return line.kind === 'add' || line.kind === 'del' || line.kind === 'ctx'
    ? line.text.slice(1)
    : line.text
}

export function DiffPane({
  patch,
  notice,
  placeholder,
  wrap,
  view,
  onMenu
}: {
  patch: string
  notice?: string
  placeholder: string
  wrap: boolean
  view: DiffView
  onMenu: (state: MenuState) => void
}): JSX.Element {
  const lines = useMemo(() => parsePatch(patch), [patch])
  const rows = useMemo(() => (view === 'split' ? pairLines(lines) : []), [lines, view])
  const total = view === 'split' ? rows.length : lines.length
  const hostRef = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(CHUNK)

  // Rows are variable height once wrapping is on, so grow the rendered slice
  // as the end comes into view instead of positioning a fixed-height window.
  useEffect(() => {
    setShown(CHUNK)
    if (hostRef.current) hostRef.current.scrollTop = 0
  }, [patch, view])

  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const onScroll = (): void => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 600) {
        setShown((n) => (n >= total ? n : n + CHUNK))
      }
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [total])

  if (total === 0) {
    return (
      <div className="pane-body">
        {notice && <div className="notice">{notice}</div>}
        <div className="empty">{placeholder}</div>
      </div>
    )
  }

  const cls = `pane-body diff${wrap ? ' wrap' : ''} ${view}`

  return (
    <div
      className={cls}
      ref={hostRef}
      onContextMenu={(e) => {
        e.preventDefault()
        onMenu({ x: e.clientX, y: e.clientY, items: [] })
      }}
    >
      {notice && <div className="notice">{notice}</div>}

      {view === 'inline' ? (
        <div className="diff-lines">
          {lines.slice(0, shown).map((l, i) => (
            <div key={i} className={`diff-line ${CLS[l.kind]}`}>
              <span className="diff-gutter">{l.oldNo ?? ''}</span>
              <span className="diff-gutter">{l.newNo ?? ''}</span>
              <span className="diff-text">{l.text || ' '}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="diff-split">
          {rows.slice(0, shown).map((r, i) =>
            r.full ? (
              <div key={i} className={`diff-line diff-full ${CLS[r.full.kind]}`}>
                <span className="diff-text">{r.full.text || ' '}</span>
              </div>
            ) : (
              <div key={i} className="diff-pair">
                <div className={`diff-line ${r.left ? CLS[r.left.kind] : 'dl-empty'}`}>
                  <span className="diff-gutter">{r.left?.oldNo ?? ''}</span>
                  <span className="diff-text">{r.left ? body(r.left) || ' ' : ''}</span>
                </div>
                <div className={`diff-line ${r.right ? CLS[r.right.kind] : 'dl-empty'}`}>
                  <span className="diff-gutter">{r.right?.newNo ?? ''}</span>
                  <span className="diff-text">{r.right ? body(r.right) || ' ' : ''}</span>
                </div>
              </div>
            )
          )}
        </div>
      )}

      {shown < total && (
        <div className="diff-more" onClick={() => setShown((n) => n + CHUNK)}>
          {total - shown} more lines — scroll or click to load
        </div>
      )}
    </div>
  )
}
