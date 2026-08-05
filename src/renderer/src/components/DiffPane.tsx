import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type JSX
} from 'react'
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
  /** Heading of the file this line belongs to, so files can be collapsed. */
  file: string
  /** Word-level segments for add/del rows, when a finer highlight is available. */
  wd?: WordDiffInfo
}

export interface DiffPaneHandle {
  /** Collapse every file, or expand them all if they already are collapsed. */
  toggleAll(): void
}

export interface CollapseState {
  files: number
  allCollapsed: boolean
}

/** One word of a changed line: common across both sides, or only on one. */
interface WordSeg {
  text: string
  kind: 'same' | 'add' | 'del'
}

interface WordDiffInfo {
  oldSegs: WordSeg[]
  newSegs: WordSeg[]
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

/**
 * Header lines worth nothing once the file name is a heading of its own: blob
 * hashes and the a/ b/ paths already shown above. Dropped from the output.
 */
const HEADER_NOISE = ['index ', '--- ', '+++ ']

/** Header lines that say something the diff body does not. */
const HEADER_FACTS = [
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
  'Binary files'
]

/** `diff --git a/x b/y` — the readable part is the path, not the command. */
const FILE_LINE = /^diff --(?:git|cc) (?:a\/(.+?) b\/(.+)|(.+))$/

function fileLabel(text: string): string {
  const m = FILE_LINE.exec(text)
  if (!m) return text
  const [, from, to, combined] = m
  if (combined) return combined
  return from === to ? from : `${from} → ${to}`
}

/** Parse a unified diff into lines carrying old/new line numbers. */
function parsePatch(patch: string): DiffLine[] {
  if (!patch) return []
  const out: DiffLine[] = []
  let oldNo = 0
  let newNo = 0

  // Header prefixes are only header prefixes between "diff --git" and the
  // first hunk: a deleted line reading "-- so long" also starts with "--- ".
  let inHeader = false
  // Lines before any "diff --git" (a --no-index patch, say) belong to no file
  // heading and must never be hidden by a collapse.
  let file = ''

  for (const text of patch.split('\n')) {
    if (text.startsWith('diff --git') || text.startsWith('diff --cc')) {
      inHeader = true
      file = fileLabel(text)
      out.push({ kind: 'file', text: file, oldNo: null, newNo: null, file })
    } else if (text.startsWith('\\ No newline')) {
      // Belongs to the hunk it follows, not to any header.
      out.push({ kind: 'meta', text, oldNo: null, newNo: null , file })
    } else if (inHeader && HEADER_NOISE.some((p) => text.startsWith(p))) {
      continue
    } else if (inHeader && HEADER_FACTS.some((p) => text.startsWith(p))) {
      out.push({ kind: 'meta', text, oldNo: null, newNo: null , file })
    } else if (text.startsWith('@@')) {
      inHeader = false
      const m = /^@@+ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text)
      if (m) {
        oldNo = Number(m[1])
        newNo = Number(m[2])
      }
      out.push({ kind: 'hunk', text, oldNo: null, newNo: null , file })
    } else if (text.startsWith('+')) {
      out.push({ kind: 'add', text, oldNo: null, newNo: newNo++ , file })
    } else if (text.startsWith('-')) {
      out.push({ kind: 'del', text, oldNo: oldNo++, newNo: null , file })
    } else {
      out.push({ kind: 'ctx', text, oldNo: oldNo++, newNo: newNo++ , file })
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

/** Lines above this token count skip word-level diff — the DP is too heavy. */
const MAX_TOKENS = 200

/** Split a line into tokens (words and whitespace), for word-level diffing. */
function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? []
}

/**
 * Word-level diff of two line bodies. Runs a length-LCS over tokens and marks
 * each as common or changed. Returns null when the lines are too large to make
 * the DP worthwhile, or when nothing actually differs.
 */
function computeWordDiff(oldText: string, newText: string): WordDiffInfo | null {
  const a = tokenize(oldText)
  const b = tokenize(newText)
  if (a.length > MAX_TOKENS || b.length > MAX_TOKENS) return null
  // Single-token lines can't be split any further; row-level colour suffices.
  if (a.length <= 1 && b.length <= 1) return null

  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const oldSegs: WordSeg[] = []
  const newSegs: WordSeg[] = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      oldSegs.push({ text: a[i], kind: 'same' })
      newSegs.push({ text: a[i], kind: 'same' })
      i++
      j++
    } else if (j < m && (i === n || dp[i][j + 1] >= dp[i + 1][j])) {
      newSegs.push({ text: b[j], kind: 'add' })
      j++
    } else {
      oldSegs.push({ text: a[i], kind: 'del' })
      i++
    }
  }
  if (!oldSegs.some((s) => s.kind === 'del') && !newSegs.some((s) => s.kind === 'add')) {
    return null
  }
  return { oldSegs, newSegs }
}

/**
 * Map every add/del row's index to its word-level diff. Runs of deletions are
 * paired positionally with the additions that follow them — the same pairing
 * the side-by-side view uses — so a modified line highlights against its match.
 */
function pairWordDiffs(lines: DiffLine[]): Map<number, WordDiffInfo> {
  const map = new Map<number, WordDiffInfo>()
  let i = 0
  while (i < lines.length) {
    if (lines[i].kind !== 'del') {
      i++
      continue
    }
    const delStart = i
    while (i < lines.length && lines[i].kind === 'del') i++
    const delEnd = i
    while (i < lines.length && lines[i].kind === 'add') i++
    const addEnd = i
    const nDel = delEnd - delStart
    const nAdd = addEnd - delEnd
    for (let k = 0; k < Math.max(nDel, nAdd); k++) {
      const oldText = k < nDel ? body(lines[delStart + k]) : ''
      const newText = k < nAdd ? body(lines[delEnd + k]) : ''
      const wd = computeWordDiff(oldText, newText)
      if (!wd) continue
      if (k < nDel) map.set(delStart + k, wd)
      if (k < nAdd) map.set(delEnd + k, wd)
    }
  }
  return map
}

/** Render a line's word segments; changed words get the extra highlight. */
function Segs({ segs }: { segs: WordSeg[] }): JSX.Element {
  return (
    <>
      {segs.map((s, i) =>
        s.kind === 'same' ? (
          <span key={i}>{s.text}</span>
        ) : (
          <span key={i} className={`wd wd-${s.kind}`}>
            {s.text}
          </span>
        )
      )}
    </>
  )
}

/**
 * A rename reads as "old → new"; the file to open is the new one.
 */
export function headingPath(name: string): string {
  const arrow = name.lastIndexOf(' → ')
  return arrow < 0 ? name : name.slice(arrow + 3)
}

/** Clickable file heading: the anchor of a multi-file diff, and its fold. */
function FileHeading({
  name,
  collapsed,
  onToggle,
  onOpen,
  onMenu
}: {
  name: string
  collapsed: boolean
  onToggle: () => void
  onOpen: () => void
  onMenu: (state: MenuState) => void
}): JSX.Element {
  return (
    <div
      className={`diff-line dl-file${collapsed ? ' collapsed' : ''}`}
      onClick={(e) => (e.ctrlKey || e.metaKey ? onOpen() : onToggle())}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onMenu({ x: e.clientX, y: e.clientY, items: [] })
      }}
      title={`${name}\n\nClick to ${collapsed ? 'expand' : 'collapse'}\nCtrl+click to open it in a new tab\nRight-click for more`}
    >
      <span className="twisty">{collapsed ? '▶' : '▼'}</span>
      <span className="diff-text">{name}</span>
    </div>
  )
}

export const DiffPane = forwardRef<
  DiffPaneHandle,
  {
    patch: string
    notice?: string
    placeholder: string
    wrap: boolean
    view: DiffView
    wordDiff: boolean
    onMenu: (state: MenuState) => void
    /** Ctrl+click or right-click on a file heading, with its path. */
    onOpenFile?: (path: string) => void
    onFileMenu?: (path: string, state: MenuState) => void
    /** Reported so the pane header can offer Collapse All / Expand All. */
    onCollapseState?: (state: CollapseState) => void
  }
>(function DiffPane(
  { patch, notice, placeholder, wrap, view, wordDiff, onMenu, onOpenFile, onFileMenu, onCollapseState },
  ref
): JSX.Element {
  const parsed = useMemo(() => {
    const ls = parsePatch(patch)
    if (!wordDiff) return ls
    const wd = pairWordDiffs(ls)
    if (wd.size === 0) return ls
    return ls.map((l, idx) => (wd.has(idx) ? { ...l, wd: wd.get(idx) } : l))
  }, [patch, wordDiff])

  const fileNames = useMemo(
    () => parsed.filter((l) => l.kind === 'file').map((l) => l.text),
    [parsed]
  )
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  // A new diff arrives fully expanded.
  useEffect(() => setCollapsed(new Set()), [patch])

  const allCollapsed = fileNames.length > 0 && collapsed.size >= fileNames.length
  useImperativeHandle(
    ref,
    () => ({
      toggleAll: () => setCollapsed(allCollapsed ? new Set() : new Set(fileNames))
    }),
    [allCollapsed, fileNames]
  )
  useEffect(() => {
    onCollapseState?.({ files: fileNames.length, allCollapsed })
  }, [fileNames.length, allCollapsed, onCollapseState])

  const toggleFile = (name: string): void =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  // A collapsed file keeps only its heading.
  const lines = useMemo(
    () => (collapsed.size === 0 ? parsed : parsed.filter((l) => l.kind === 'file' || !collapsed.has(l.file))),
    [parsed, collapsed]
  )
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
          {lines.slice(0, shown).map((l, i) =>
            // A file heading spans the full width; gutters would only indent it.
            l.kind === 'file' ? (
              <FileHeading
                key={i}
                name={l.text}
                collapsed={collapsed.has(l.text)}
                onToggle={() => toggleFile(l.text)}
                onOpen={() => onOpenFile?.(headingPath(l.text))}
                onMenu={(at) => onFileMenu?.(headingPath(l.text), at)}
              />
            ) : (
              <div key={i} className={`diff-line ${CLS[l.kind]}`}>
                <span className="diff-gutter">{l.oldNo ?? ''}</span>
                <span className="diff-gutter">{l.newNo ?? ''}</span>
                <span className="diff-text">
                  {l.wd
                    ? l.kind === 'add'
                      ? <Segs segs={l.wd.newSegs} />
                      : <Segs segs={l.wd.oldSegs} />
                    : (l.text || ' ')}
                </span>
              </div>
            )
          )}
        </div>
      ) : (
        <div className="diff-split">
          {rows.slice(0, shown).map((r, i) =>
            r.full ? (
              r.full.kind === 'file' ? (
                <FileHeading
                  key={i}
                  name={r.full.text}
                  collapsed={collapsed.has(r.full.text)}
                  onToggle={() => toggleFile(r.full!.text)}
                  onOpen={() => onOpenFile?.(headingPath(r.full!.text))}
                  onMenu={(at) => onFileMenu?.(headingPath(r.full!.text), at)}
                />
              ) : (
                <div key={i} className={`diff-line diff-full ${CLS[r.full.kind]}`}>
                  <span className="diff-text">{r.full.text || ' '}</span>
                </div>
              )
            ) : (
              <div key={i} className="diff-pair">
                <div className={`diff-line ${r.left ? CLS[r.left.kind] : 'dl-empty'}`}>
                  <span className="diff-gutter">{r.left?.oldNo ?? ''}</span>
                  <span className="diff-text">
                    {r.left
                      ? r.left.wd
                        ? <Segs segs={r.left.wd.oldSegs} />
                        : (body(r.left) || ' ')
                      : ''}
                  </span>
                </div>
                <div className={`diff-line ${r.right ? CLS[r.right.kind] : 'dl-empty'}`}>
                  <span className="diff-gutter">{r.right?.newNo ?? ''}</span>
                  <span className="diff-text">
                    {r.right
                      ? r.right.wd
                        ? <Segs segs={r.right.wd.newSegs} />
                        : (body(r.right) || ' ')
                      : ''}
                  </span>
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
})
