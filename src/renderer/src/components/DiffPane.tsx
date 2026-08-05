import { useEffect, useMemo, useRef, useState, type JSX } from 'react'

const ROW_H = 20
const OVERSCAN = 20

type LineKind = 'add' | 'del' | 'ctx' | 'hunk' | 'file' | 'meta'

interface DiffLine {
  kind: LineKind
  text: string
  oldNo: number | null
  newNo: number | null
}

const CLS: Record<LineKind, string> = {
  add: 'dl-add',
  del: 'dl-del',
  ctx: '',
  hunk: 'dl-hunk',
  file: 'dl-file',
  meta: 'dl-meta'
}

/** Parse a unified diff into renderable lines with old/new line numbers. */
function parsePatch(patch: string): DiffLine[] {
  if (!patch) return []
  const out: DiffLine[] = []
  let oldNo = 0
  let newNo = 0

  for (const text of patch.split('\n')) {
    if (text.startsWith('diff --git') || text.startsWith('diff --cc')) {
      out.push({ kind: 'file', text, oldNo: null, newNo: null })
    } else if (
      text.startsWith('index ') ||
      text.startsWith('--- ') ||
      text.startsWith('+++ ') ||
      text.startsWith('old mode') ||
      text.startsWith('new mode') ||
      text.startsWith('new file') ||
      text.startsWith('deleted file') ||
      text.startsWith('similarity index') ||
      text.startsWith('rename from') ||
      text.startsWith('rename to') ||
      text.startsWith('Binary files') ||
      text.startsWith('\\ No newline')
    ) {
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

  // Trailing newline from git produces one empty line; drop it.
  if (out.length && out[out.length - 1].text === '') out.pop()
  return out
}

export function DiffPane({
  patch,
  notice,
  placeholder
}: {
  patch: string
  notice?: string
  placeholder: string
}): JSX.Element {
  const lines = useMemo(() => parsePatch(patch), [patch])
  const hostRef = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState({ start: 0, end: 80 })

  // Recompute the visible window on scroll, resize and content change.
  useEffect(() => {
    const el = hostRef.current
    if (!el) return
    const update = (): void => {
      const start = Math.max(0, Math.floor(el.scrollTop / ROW_H) - OVERSCAN)
      const count = Math.ceil(el.clientHeight / ROW_H) + OVERSCAN * 2
      setRange({ start, end: Math.min(lines.length, start + count) })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [lines.length])

  // A new diff always starts at the top.
  useEffect(() => {
    if (hostRef.current) hostRef.current.scrollTop = 0
  }, [patch])

  if (lines.length === 0) {
    return (
      <div className="pane-body">
        {notice && <div className="notice">{notice}</div>}
        <div className="empty">{placeholder}</div>
      </div>
    )
  }

  const visible = lines.slice(range.start, range.end)

  return (
    <div className="pane-body diff" ref={hostRef}>
      {notice && <div className="notice">{notice}</div>}
      <div style={{ height: lines.length * ROW_H, position: 'relative' }}>
        <div style={{ position: 'absolute', top: range.start * ROW_H, left: 0, right: 0 }}>
          {visible.map((l, i) => (
            <div key={range.start + i} className={`diff-line ${CLS[l.kind]}`}>
              <span className="diff-gutter">{l.oldNo ?? ''}</span>
              <span className="diff-gutter">{l.newNo ?? ''}</span>
              <span className="diff-text">{l.text || ' '}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
