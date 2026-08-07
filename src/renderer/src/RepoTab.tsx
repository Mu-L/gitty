import {
  forwardRef,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type JSX,
  type SetStateAction
} from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { ContextMenu, type MenuState } from './components/ContextMenu'
import {
  DiffPane,
  type CollapseState,
  type DiffPaneHandle,
  type DiffView
} from './components/DiffPane'
import { FilesPane, type FileEntry } from './components/FilesPane'
import { LogPane, WORKTREE_ROW } from './components/LogPane'
import { destroyTerminals } from './terminals'
import { isImagePath, isMarkdownPath } from './paths'
import { FullButton, HideButton } from './components/PaneChrome'
import type { Theme } from './components/SettingsPane'
import { Tooltip } from './components/Tooltip'
import { createContextMenus, type View } from './contextMenus'
import {
  PANE_ORDER,
  paneAccel,
  paneControls,
  paneFullAccel,
  visibleCount,
  type PaneId,
  type PaneVisibility
} from './panes'
import type {
  Commit,
  CommitFile,
  DiffRequest,
  DiffResult,
  RepoStatus,
  WorkingFile
} from '../../shared/types'

// The two panes that pull in whole libraries are loaded on demand: opening a
// file costs highlight.js + markdown-it (plus the code and markdown viewers),
// and showing the terminal costs xterm. Neither should gate the first paint of
// the tab. The session/layout registries those chunks need live in terminals.ts,
// which stays in the main bundle.
const FileDoc = lazy(() => import('./components/FileDoc').then((m) => ({ default: m.FileDoc })))
const TerminalsPane = lazy(() =>
  import('./components/TerminalsPane').then((m) => ({ default: m.TerminalsPane }))
)

const PAGE = 300

/** A file opened in the diff pane, beside (not instead of) the diff. */
interface FileDocState {
  /** Revision + path; opening the same file twice reuses its document. */
  id: string
  path: string
  /** Revision to read at; null is the work tree. */
  rev: string | null
  /** Markdown documents open rendered, with a toggle back to the source. */
  preview: boolean
}

function statusMarks(f: WorkingFile): FileEntry['marks'] {
  if (f.untracked) {
    return [
      { char: '?', cls: 'st-untracked' },
      { char: '?', cls: 'st-untracked' }
    ]
  }
  return [
    { char: f.index === ' ' ? ' ' : f.index, cls: f.index === ' ' ? '' : 'st-staged' },
    { char: f.worktree === ' ' ? ' ' : f.worktree, cls: `st-${f.worktree.trim() || 'none'}` }
  ]
}

function commitMarks(f: CommitFile): FileEntry['marks'] {
  return [{ char: f.status, cls: `st-${f.status}` }]
}

export interface RepoTabHandle {
  refresh(): void
}

export interface RepoTabProps {
  root: string
  /** Whether this is the tab the user is looking at. Inactive tabs stay
   *  mounted (their view state and shells survive) but skip global key
   *  handling. */
  active: boolean
  theme: Theme
  fontSize: number
  wrap: boolean
  setWrap: Dispatch<SetStateAction<boolean>>
  diffView: DiffView
  setDiffView: Dispatch<SetStateAction<DiffView>>
  wordDiff: boolean
  setWordDiff: Dispatch<SetStateAction<boolean>>
  mdOutline: boolean
  setMdOutline: Dispatch<SetStateAction<boolean>>
  /** Which panes are on screen; hidden ones are not rendered at all. */
  panes: PaneVisibility
  /** Hide a pane from its own header button. */
  onHidePane: (id: PaneId) => void
  /** Branch whose history the log shows; null is HEAD, the checked-out one.
   *  Browsing another branch never touches the work tree — the top-left pane
   *  and its diffs still come from disk. */
  browsing: string | null
  /** Settings dialog open; Escape belongs to it first, not to this tab. */
  settingsOpen: boolean
  /** Report the latest status so the tab bar and title bar can reflect it. */
  onStatus: (status: RepoStatus) => void
}

/**
 * react-resizable-panels keeps layout state per Group id, and several tabs are
 * mounted at once — so the ids must not collide across repositories.
 */
function groupId(root: string, id: string): string {
  return `${id}-${root.replace(/[^A-Za-z0-9_-]/g, '_')}`
}

/**
 * One open repository: its own four-pane layout, selection state and terminal
 * group. Tab switching only changes which of these is visible, so browsing a
 * repo never disturbs the state or shells of the others.
 */
export const RepoTab = forwardRef<RepoTabHandle, RepoTabProps>(function RepoTab(
  {
    root,
    active,
    theme,
    fontSize,
    wrap,
    setWrap,
    diffView,
    setDiffView,
    wordDiff,
    setWordDiff,
    mdOutline,
    setMdOutline,
    panes,
    onHidePane,
    browsing,
    settingsOpen,
    onStatus
  },
  ref
): JSX.Element {
  const [status, setStatus] = useState<RepoStatus | null>(null)
  const [commits, setCommits] = useState<Commit[]>([])
  const [view, setView] = useState<View>({ mode: 'worktree' })
  const [viewFiles, setViewFiles] = useState<FileEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<string | null>(WORKTREE_ROW)
  const [compareCommit, setCompareCommit] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  // The diff is always the first document; opening a file adds another beside
  // it rather than replacing it, so a diff can stay on screen while a file is
  // read. Snapshots have no diff, so there the first document is a file.
  const [docs, setDocs] = useState<FileDocState[]>([])
  const [activeDoc, setActiveDoc] = useState<string | null>(null)
  // The pane filling the window, if any. One at a time, and per tab: another
  // repository's layout is none of its business.
  const [full, setFull] = useState<PaneId | null>(null)
  const [docSource, setDocSource] = useState<string | null>(null)
  const diffRef = useRef<DiffPaneHandle>(null)
  const [collapseState, setCollapseState] = useState<CollapseState>({
    files: 0,
    allCollapsed: false
  })
  const [tick, setTick] = useState(0)
  // The push or pull in flight, and what the last one said.
  const [remoteOp, setRemoteOp] = useState<'push' | 'pull' | null>(null)
  const [remoteMsg, setRemoteMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const loadingMore = useRef(false)
  const exhausted = useRef(false)

  // The watcher can fire again — and a manual refresh can land — while `git
  // status` is still running, so replies come back out of order. Without this
  // guard a slow earlier call overwrites a newer one and the file list keeps
  // showing changes that are already committed, while the diff pane (which
  // re-runs git every time) shows the truth.
  const refreshSeq = useRef(0)

  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current
    const [st, log] = await Promise.all([
      window.gitty.git.status(root),
      window.gitty.git.log(root, PAGE, 0, browsing)
    ])
    if (seq !== refreshSeq.current) return
    setStatus(st)
    onStatus(st)
    setCommits((prev) => (prev.length > PAGE ? mergeLog(prev, log) : log))
    setTick((t) => t + 1)
  }, [root, browsing, onStatus])

  // Another branch means another history: drop what is loaded rather than
  // merging two logs, and let go of a selection that may not be in it. The
  // work tree is unaffected, so the work-tree row stays where it is.
  const firstBrowse = useRef(true)
  useEffect(() => {
    if (firstBrowse.current) {
      firstBrowse.current = false
      return
    }
    setCommits([])
    exhausted.current = false
    setView({ mode: 'worktree' })
    setSelectedCommit(WORKTREE_ROW)
    setCompareCommit(null)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
  }, [browsing])

  useImperativeHandle(ref, () => ({ refresh }), [refresh])

  // Hiding the terminal pane only unmounts it; its shells keep running and are
  // re-parented when it comes back. They end with the repository tab itself.
  useEffect(() => () => destroyTerminals(root), [root])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // The watcher fires for every open repository; only react to our own.
  useEffect(
    () =>
      window.gitty.repo.onChanged(({ root: r }) => {
        if (r === root) void refresh()
      }),
    [refresh, root]
  )

  /* ---------- file list per view ---------- */

  useEffect(() => {
    let cancelled = false

    const run = async (): Promise<void> => {
      let entries: FileEntry[] = []
      // The revision each file lives at; null means the work tree on disk.
      let rev: string | null = null

      if (view.mode === 'worktree') {
        rev = null
        entries = (status?.files ?? []).map<FileEntry>((f) => ({
          path: f.path,
          absPath: f.absPath,
          marks: statusMarks(f),
          deleted: f.worktree === 'D' || f.index === 'D',
          origPath: f.origPath
        }))
      } else if (view.mode === 'snapshot') {
        // Snapshot mode: the whole tree at that commit, read-only.
        rev = view.hash
        const paths = await window.gitty.git.snapshotFiles(root, view.hash)
        if (cancelled) return
        entries = paths.map<FileEntry>((p) => ({
          path: p,
          // Virtual path — no file on disk; fileMenu/onOpen branch on this prefix.
          absPath: `gitty:snapshot:${view.hash}:${p}`,
          marks: [],
          deleted: false
        }))
      } else {
        rev = view.mode === 'commit' ? view.hash : view.to
        const files =
          view.mode === 'commit'
            ? (await window.gitty.git.commitDetail(root, view.hash)).files
            : await window.gitty.git.rangeFiles(root, view.from, view.to)
        if (cancelled) return
        entries = files.map<FileEntry>((f) => ({
          path: f.path,
          absPath: f.absPath,
          marks: commitMarks(f),
          deleted: f.status === 'D',
          origPath: f.origPath
        }))
      }

      // Fetch line counts in one batch so the tree shows them right away.
      if (!cancelled && entries.length > 0) {
        const pairs = entries.map((e) => ({ rev, filePath: e.path }))
        const counts = await window.gitty.git.fileLines(root, pairs)
        if (!cancelled) {
          for (let i = 0; i < entries.length; i++) {
            entries[i] = { ...entries[i], lines: counts[i] }
          }
        }
      }

      if (!cancelled) setViewFiles(entries)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [root, view, status])

  /* ---------- documents (diff + opened files) ---------- */

  /** Revision a file opened from this view should be read at. */
  const revForView = useCallback((): string | null => {
    if (view.mode === 'commit' || view.mode === 'snapshot') return view.hash
    if (view.mode === 'range') return view.to
    return null
  }, [view])

  const openFileDoc = useCallback(
    (path: string) => {
      const rev = revForView()
      const id = `${rev ?? 'work'}:${path}`
      setDocs((prev) =>
        prev.some((d) => d.id === id)
          ? prev
          : [...prev, { id, path, rev, preview: isMarkdownPath(path) }]
      )
      setActiveDoc(id)
    },
    [revForView]
  )

  const closeDoc = useCallback((id: string) => {
    setDocs((prev) => {
      const i = prev.findIndex((d) => d.id === id)
      if (i < 0) return prev
      const next = prev.filter((d) => d.id !== id)
      setActiveDoc((cur) => (cur === id ? (next[Math.min(i, next.length - 1)]?.id ?? null) : cur))
      return next
    })
  }, [])

  const doc = docs.find((d) => d.id === activeDoc) ?? null
  const viewingFile = doc !== null
  const previewing = viewingFile && doc.preview && isMarkdownPath(doc.path)

  // Snapshots have no diff, so a file selected there opens as a document.
  useEffect(() => {
    if (view.mode === 'snapshot' && selectedFile) openFileDoc(selectedFile)
  }, [view, selectedFile, openFileDoc])

  /* ---------- diff loading ---------- */

  // Same ordering hazard as `refresh`: clicking through files faster than git
  // answers would otherwise leave the previous file's patch on screen.
  const diffSeq = useRef(0)

  const loadDiff = useCallback(
    async (req: DiffRequest) => {
      const seq = ++diffSeq.current
      try {
        const d = await window.gitty.git.diff(root, req)
        if (seq === diffSeq.current) setDiff(d)
      } catch (e) {
        if (seq === diffSeq.current) setDiff({ patch: '', title: 'error', notice: String(e) })
      }
    },
    [root]
  )

  /** Bumps the sequence too, so a load already in flight cannot undo it. */
  const clearDiff = useCallback(() => {
    diffSeq.current++
    setDiff(null)
  }, [])

  // Whenever the view, the selected file or the repo state changes, reload the diff.
  useEffect(() => {
    if (view.mode === 'worktree') {
      // No file picked: show every uncommitted change at once.
      if (!selectedFile) {
        void loadDiff({ kind: 'working', side: 'worktree', untracked: false })
        return
      }
      const f = status?.files.find((x) => x.path === selectedFile)
      if (!f) {
        clearDiff()
        return
      }
      void loadDiff({
        kind: 'working',
        path: f.path,
        side: f.worktree === ' ' && f.index !== ' ' ? 'index' : 'worktree',
        untracked: f.untracked
      })
    } else if (view.mode === 'commit') {
      void loadDiff({ kind: 'commit', hash: view.hash, path: selectedFile ?? undefined })
    } else if (view.mode === 'range') {
      void loadDiff({
        kind: 'range',
        from: view.from,
        to: view.to,
        path: selectedFile ?? undefined
      })
    } else {
      // Snapshot has no diff; the file view renders its contents instead.
      clearDiff()
    }
  }, [view, selectedFile, status, tick, loadDiff, clearDiff])

  /* ---------- commit interactions ---------- */

  const showCommit = useCallback((c: Commit) => {
    setCompareCommit(null)
    setSelectedCommit(c.hash)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
    setView({ mode: 'commit', hash: c.hash, short: c.short, subject: c.subject })
  }, [])

  /** Browse the whole repository as it was at this commit, read-only. */
  const showSnapshot = useCallback((c: Commit) => {
    setCompareCommit(null)
    setSelectedCommit(c.hash)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
    setView({ mode: 'snapshot', hash: c.hash, short: c.short, subject: c.subject })
  }, [])

  const backToWorkTree = useCallback(() => {
    setView({ mode: 'worktree' })
    setSelectedCommit(WORKTREE_ROW)
    setCompareCommit(null)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
  }, [])

  const onSelectCommit = useCallback(
    (hash: string, additive: boolean) => {
      if (hash === WORKTREE_ROW) {
        backToWorkTree()
        return
      }
      const c = commits.find((x) => x.hash === hash)
      if (!c) return

      if (!additive) {
        showCommit(c)
        return
      }
      // Second pick: diff the two commits, oldest first.
      if (!selectedCommit || selectedCommit === hash) {
        setCompareCommit(null)
        return
      }
      const iSel = commits.findIndex((x) => x.hash === selectedCommit)
      const iCmp = commits.findIndex((x) => x.hash === hash)
      const [from, to] = iSel > iCmp ? [selectedCommit, hash] : [hash, selectedCommit]
      setCompareCommit(hash)
      setSelectedFile(null)
      setDocs([])
      setActiveDoc(null)
      setView({ mode: 'range', from, to })
    },
    [commits, selectedCommit, showCommit, backToWorkTree]
  )

  // Only the active tab handles the shared Escape / refresh keys; the others
  // stay mounted and must not react to keys while hidden.
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent): void => {
      // Escape unwinds one level at a time: settings, full screen, then view.
      if (e.key === 'Escape') {
        if (settingsOpen) return
        if (full) setFull(null)
        else backToWorkTree()
      } else if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
        e.preventDefault()
        void refresh()
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && /^Digit[1-4]$/.test(e.code)) {
        // Ctrl+Shift+1..4 fill the window with that pane. Read from the code:
        // with Shift down the key itself is a punctuation mark.
        e.preventDefault()
        const id = PANE_ORDER[Number(e.code.slice(-1)) - 1]
        if (panes[id]) setFull((f) => (f === id ? null : id))
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, settingsOpen, full, panes, backToWorkTree, refresh])

  const loadMore = useCallback(async () => {
    if (loadingMore.current || exhausted.current) return
    loadingMore.current = true
    try {
      const more = await window.gitty.git.log(root, PAGE, commits.length, browsing)
      if (more.length === 0) exhausted.current = true
      else setCommits((prev) => mergeLog(prev, more))
    } finally {
      loadingMore.current = false
    }
  }, [root, browsing, commits.length])

  /* ---------- push and pull ---------- */

  const runRemote = useCallback(
    async (op: 'push' | 'pull') => {
      setRemoteOp(op)
      setRemoteMsg(null)
      try {
        const res =
          op === 'push'
            ? // A branch with no upstream has to name one; otherwise git knows.
              await window.gitty.git.push(root, status?.upstream ? null : status?.branch ?? null)
            : await window.gitty.git.pull(root)
        setRemoteMsg({ ok: res.ok, text: res.output })
      } finally {
        setRemoteOp(null)
        void refresh()
      }
    },
    [root, status, refresh]
  )

  // Success has been read by the time it matters; a failure stays until it is
  // dismissed, since it is the only place git's own words appear.
  useEffect(() => {
    if (!remoteMsg?.ok) return
    const t = setTimeout(() => setRemoteMsg(null), 5000)
    return () => clearTimeout(t)
  }, [remoteMsg])

  /* ---------- context menus ---------- */

  const { diffMenu, diffFileMenu, fileMenu, commitMenu } = createContextMenus({
    root,
    view,
    viewingFile,
    previewing,
    docSource,
    wrap,
    setWrap,
    mdOutline,
    setMdOutline,
    wordDiff,
    setWordDiff,
    diffView,
    setDiffView,
    diff,
    selectedFile,
    selectedCommit,
    openFileDoc,
    showCommit,
    showSnapshot,
    onSelectCommit,
    revForView,
    setSelectedFile,
    setActiveDoc,
    setMenu
  })

  /* ---------- headers ---------- */

  const filesTitle = useMemo(() => {
    if (view.mode === 'worktree') return 'Working Tree'
    if (view.mode === 'commit') return `Commit ${view.short} — ${view.subject}`
    if (view.mode === 'snapshot') return `Snapshot ${view.short} — ${view.subject}`
    return `Range ${view.from.slice(0, 8)}..${view.to.slice(0, 8)}`
  }, [view])

  /* ---------- which panes are on screen ---------- */

  // A pane hidden while full screen must not come back still filling the window.
  useEffect(() => {
    setFull((f) => (f && !panes[f] ? null : f))
  }, [panes])

  const topRow = panes.files || panes.diff
  const bottomRow = panes.log || panes.terminal
  // Panels keep their sizes by position, so a changed set of children needs a
  // group id of its own — otherwise two visible panes would take up the sizes
  // stored for three.
  const rowsKey = `${topRow ? 't' : ''}${bottomRow ? 'b' : ''}`
  const topKey = `${panes.files ? 'f' : ''}${panes.diff ? 'd' : ''}`
  const bottomKey = `${panes.log ? 'l' : ''}${panes.terminal ? 't' : ''}`
  // The last pane standing keeps its close button hidden: there would be no
  // pane left to hold the layout.
  const canHide = visibleCount(panes) > 1
  const hideButton = (id: PaneId): JSX.Element | null =>
    canHide ? <HideButton accel={paneAccel(id)} onHide={() => onHidePane(id)} /> : null

  const toggleFull = (id: PaneId): void => setFull((f) => (f === id ? null : id))

  const fullButton = (id: PaneId): JSX.Element => (
    <FullButton full={full === id} accel={paneFullAccel(id)} onToggle={() => toggleFull(id)} />
  )

  /** Double-clicking a header is the other way in and out of full screen. */
  const headerDoubleClick =
    (id: PaneId) =>
    (e: { target: EventTarget | null }): void => {
      // Buttons in the header have their own meaning.
      if ((e.target as HTMLElement).closest('button')) return
      toggleFull(id)
    }

  const paneClass = (id: PaneId): string => `pane${full === id ? ' maximized' : ''}`

  /* ---------- push / pull state, from the checked-out branch ---------- */

  const ahead = status?.ahead ?? 0
  const behind = status?.behind ?? 0
  const upstream = status?.upstream ?? null
  // With an upstream git has counted what is unpushed; without one, the branch
  // has never been published, so there is always something to send.
  const canPush = status !== null && (upstream === null ? true : ahead > 0)
  const canPull = upstream !== null
  const pushTitle = !status
    ? 'Push'
    : upstream === null
      ? `Publish ${status.branch} to origin and track it`
      : ahead > 0
        ? `Push ${ahead} commit${ahead === 1 ? '' : 's'} to ${upstream}`
        : `Nothing to push — ${status.branch} matches ${upstream}`
  const pullTitle = !status
    ? 'Pull'
    : upstream === null
      ? `${status.branch} tracks no branch — nothing to pull from`
      : behind > 0
        ? `Fast-forward ${status.branch} to ${upstream} (${behind} behind)`
        : `Fetch and fast-forward ${status.branch} from ${upstream}`

  const diffTitle = doc
    ? `${doc.path}${previewing ? ' (preview)' : ''}` +
      (doc.rev ? ` @ ${doc.rev.slice(0, 8)}` : '')
    : (diff?.title ?? 'Diff')

  return (
    <div className="repo-tab" onContextMenu={(e) => e.preventDefault()}>
      {/* Hidden tabs stay mounted, so their groups must opt out of hit
          testing: react-resizable-panels checks every registered group against
          the pointer, and a display:none group reports a zero-sized rect. */}
      <Group
        orientation="vertical"
        className="grid"
        id={groupId(root, `rows-${rowsKey}`)}
        disabled={!active}
      >
        {topRow && (
        <Panel defaultSize={bottomRow ? '55%' : undefined} minSize="20%">
          <Group orientation="horizontal" id={groupId(root, `top-${topKey}`)} disabled={!active}>
            {panes.files && (
            <Panel defaultSize={panes.diff ? '38%' : undefined} minSize="15%">
              <div className={paneClass('files')}>
                <div className="pane-header" onDoubleClick={headerDoubleClick('files')}>
                  {fullButton('files')}
                  <Tooltip
                    className="title"
                    lines={[
                      { key: 'dbl-click', desc: ' views' },
                      { key: 'right-click', desc: ' for more' },
                      ...paneControls('files')
                    ]}
                  >
                    {filesTitle}
                  </Tooltip>
                  <span className="spacer" />
                  {view.mode !== 'worktree' && (
                    <button onClick={backToWorkTree}>Back to Work Tree</button>
                  )}
                  {hideButton('files')}
                </div>
                <div className="pane-body">
                  <FilesPane
                    entries={viewFiles}
                    selected={selectedFile}
                    onSelect={(f) => {
                      setSelectedFile(f.path)
                      // A single click browses the diff; opened files stay open.
                      if (view.mode !== 'snapshot') setActiveDoc(null)
                    }}
                    onOpen={(f) => {
                      // Double-click opens the file as its own document beside
                      // the diff; the system application is a menu choice.
                      setSelectedFile(f.path)
                      openFileDoc(f.path)
                    }}
                    onMenu={fileMenu}
                    emptyText={
                      view.mode === 'worktree'
                        ? 'Working tree clean.'
                        : view.mode === 'snapshot'
                          ? 'No files in this snapshot.'
                          : 'No files in this diff.'
                    }
                  />
                </div>
              </div>
            </Panel>
            )}
            {panes.files && panes.diff && <Separator className="sep-v" />}
            {panes.diff && (
            <Panel minSize="20%">
              <div className={paneClass('diff')}>
                <div className="pane-header" onDoubleClick={headerDoubleClick('diff')}>
                  {fullButton('diff')}
                  {/* Tooltips live on the individual parts: a title on the
                      header itself would show up under every button that has
                      none of its own. */}
                  <Tooltip className="title" lines={[{ key: '', desc: diffTitle }, ...paneControls('diff')]}>
                    {diffTitle}
                  </Tooltip>
                  <span className="spacer" title="Double-click to toggle full screen" />
                  {/* Only commit and range diffs have a "whole" to widen back
                      to; a snapshot is always one file at a time. */}
                  {/* Always present for a commit or a range, lit when the
                      whole diff is what is already on screen: a button that
                      comes and goes is harder to find than one that stays. */}
                  {view.mode !== 'snapshot' && (
                    <button
                      className={`toggle${selectedFile ? '' : ' on'}`}
                      title={
                        selectedFile
                          ? view.mode === 'worktree'
                            ? 'Widen the diff back to every uncommitted change'
                            : 'Widen the diff back to every file in this commit'
                          : view.mode === 'worktree'
                            ? 'Every uncommitted change is shown'
                            : 'Every file in this commit is shown'
                      }
                      onClick={() => {
                        setActiveDoc(null)
                        setSelectedFile(null)
                      }}
                    >
                      Show Whole Diff
                    </button>
                  )}
                  {selectedFile && view.mode !== 'snapshot' && !viewingFile && (
                    <button
                      className="toggle"
                      title={
                        isMarkdownPath(selectedFile)
                          ? 'Open this markdown file rendered, beside the diff'
                          : isImagePath(selectedFile)
                            ? 'Show this image beside the diff'
                            : 'Open the whole file beside the diff'
                      }
                      onClick={() => openFileDoc(selectedFile)}
                    >
                      {isMarkdownPath(selectedFile)
                        ? 'Preview'
                        : isImagePath(selectedFile)
                          ? 'View Image'
                          : 'View File'}
                    </button>
                  )}
                  {previewing && doc && (
                    <button
                      className="toggle on"
                      title="Show the markdown source instead"
                      onClick={() =>
                        setDocs((prev) =>
                          prev.map((d) => (d.id === doc.id ? { ...d, preview: false } : d))
                        )
                      }
                    >
                      Preview
                    </button>
                  )}
                  {viewingFile && doc && !previewing && isMarkdownPath(doc.path) && (
                    <button
                      className="toggle"
                      title="Render this markdown file"
                      onClick={() =>
                        setDocs((prev) =>
                          prev.map((d) => (d.id === doc.id ? { ...d, preview: true } : d))
                        )
                      }
                    >
                      Preview
                    </button>
                  )}
                  {!viewingFile && collapseState.files > 1 && (
                    <button
                      className="toggle"
                      title={
                        collapseState.allCollapsed
                          ? 'Expand every file'
                          : 'Collapse every file to its name'
                      }
                      onClick={() => diffRef.current?.toggleAll()}
                    >
                      {collapseState.allCollapsed ? 'Expand All' : 'Collapse All'}
                    </button>
                  )}
                  {/* An image has no lines to wrap. */}
                  {!(doc && isImagePath(doc.path)) && (
                    <button
                      className={`toggle${wrap ? ' on' : ''}`}
                      title={previewing ? 'Wrap code blocks and tables' : 'Wrap long lines'}
                      onClick={() => setWrap((w) => !w)}
                    >
                      Wrap
                    </button>
                  )}
                  {previewing && (
                    <button
                      className={`toggle${mdOutline ? ' on' : ''}`}
                      title="Show the heading outline"
                      onClick={() => setMdOutline((o) => !o)}
                    >
                      Outline
                    </button>
                  )}
                  {!viewingFile && (
                    <button
                      className="toggle"
                      title="Switch between inline and side-by-side"
                      onClick={() => setDiffView((v) => (v === 'inline' ? 'split' : 'inline'))}
                    >
                      {diffView === 'inline' ? 'Inline' : 'Side-by-Side'}
                    </button>
                  )}
                  {hideButton('diff')}
                </div>
                {/* One strip per open document: the diff, then each opened
                    file. Only shown once there is something to switch to. */}
                {docs.length > 0 && (
                  <div className="doc-tabs">
                    {view.mode !== 'snapshot' && (
                      <div
                        className={`doc-tab${activeDoc === null ? ' active' : ''}`}
                        onClick={() => setActiveDoc(null)}
                        title="The diff"
                      >
                        Diff
                      </div>
                    )}
                    {docs.map((d) => (
                      <div
                        key={d.id}
                        className={`doc-tab${activeDoc === d.id ? ' active' : ''}`}
                        onClick={() => setActiveDoc(d.id)}
                        title={d.rev ? `${d.path} @ ${d.rev.slice(0, 8)}` : d.path}
                      >
                        <span className="doc-name">{d.path.split('/').pop()}</span>
                        <span
                          className="doc-close"
                          title="Close"
                          onClick={(e) => {
                            e.stopPropagation()
                            closeDoc(d.id)
                          }}
                        >
                          ×
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {doc ? (
                  <Suspense
                    fallback={
                      <div className="pane-body">
                        <div className="empty">Loading…</div>
                      </div>
                    }
                  >
                    <FileDoc
                      key={doc.id}
                      root={root}
                      path={doc.path}
                      rev={doc.rev}
                      preview={doc.preview}
                      wrap={wrap}
                      outline={mdOutline}
                      reloadKey={tick}
                      onSource={setDocSource}
                      onMenu={diffMenu}
                    />
                  </Suspense>
                ) : (
                  <DiffPane
                    ref={diffRef}
                    onOpenFile={openFileDoc}
                    onFileMenu={diffFileMenu}
                    onCollapseState={setCollapseState}
                    patch={diff?.patch ?? ''}
                    notice={diff?.notice}
                    wrap={wrap}
                    view={diffView}
                    wordDiff={wordDiff}
                    onMenu={diffMenu}
                    placeholder={
                      view.mode === 'worktree'
                        ? 'Working tree clean.'
                        : view.mode === 'snapshot'
                          ? 'Select a file to view it at this commit.'
                          : 'No textual changes.'
                    }
                  />
                )}
              </div>
            </Panel>
            )}
          </Group>
        </Panel>
        )}

        {topRow && bottomRow && <Separator className="sep-h" />}

        {bottomRow && (
        <Panel minSize="20%">
          <Group
            orientation="horizontal"
            id={groupId(root, `bottom-${bottomKey}`)}
            disabled={!active}
          >
            {panes.log && (
            <Panel defaultSize={panes.terminal ? '58%' : undefined} minSize="20%">
              <div className={paneClass('log')}>
                <div className="pane-header" onDoubleClick={headerDoubleClick('log')}>
                  {fullButton('log')}
                  <Tooltip
                    className="title"
                    lines={[
                      { key: '↑↓', desc: ' move' },
                      { key: 'Enter', desc: ' show' },
                      { key: 'Ctrl+Click', desc: ' compare' },
                      { key: 'Esc', desc: ' work tree' },
                      ...paneControls('log')
                    ]}
                  >
                    Commits
                  </Tooltip>
                  {/* Only worth saying when it is not the checked-out branch;
                      otherwise the title bar already says it. */}
                  {browsing && (
                    <span className="badge branch-badge" title="Browsing another branch">
                      ⎇ {browsing}
                    </span>
                  )}
                  {/* Both act on the checked-out branch, whichever branch the
                      log is pointed at — nothing here checks anything out. */}
                  <button
                    className="toggle"
                    disabled={!canPush || remoteOp !== null}
                    title={pushTitle}
                    onClick={() => void runRemote('push')}
                  >
                    {remoteOp === 'push' ? 'Pushing…' : ahead > 0 ? `Push ${ahead}` : 'Push'}
                  </button>
                  <button
                    className="toggle"
                    disabled={!canPull || remoteOp !== null}
                    title={pullTitle}
                    onClick={() => void runRemote('pull')}
                  >
                    {remoteOp === 'pull' ? 'Pulling…' : behind > 0 ? `Pull ${behind}` : 'Pull'}
                  </button>
                  <button
                    className="toggle"
                    title="Open this repository's commits in the browser"
                    onClick={() => {
                      void window.gitty.web.repoUrl(root).then((url) => {
                        if (url) void window.gitty.file.openExternal(url)
                      })
                    }}
                  >
                    Open in Browser
                  </button>
                  <span className="spacer" />
                  {compareCommit && <span className="badge">comparing 2 commits</span>}
                  {hideButton('log')}
                </div>
                {/* What git said. Failures stay until dismissed: a push that
                    needs a password or a pull that cannot fast-forward is
                    finished by hand in the terminal pane. */}
                {remoteMsg && (
                  <div
                    className={`remote-msg${remoteMsg.ok ? '' : ' error'}`}
                    title="Click to dismiss"
                    onClick={() => setRemoteMsg(null)}
                  >
                    {remoteMsg.text}
                  </div>
                )}
                <LogPane
                  commits={commits}
                  selected={selectedCommit}
                  compare={compareCommit}
                  changedCount={status?.files.length ?? 0}
                  onSelect={onSelectCommit}
                  onEnter={(hash) => {
                    if (hash === WORKTREE_ROW) {
                      backToWorkTree()
                      return
                    }
                    const c = commits.find((x) => x.hash === hash)
                    if (c) showCommit(c)
                  }}
                  onMenu={commitMenu}
                  onScrollEnd={() => void loadMore()}
                />
              </div>
            </Panel>
            )}
            {panes.log && panes.terminal && <Separator className="sep-v" />}
            {panes.terminal && (
            <Panel minSize="15%">
              {/* A repo tab owns its terminal group; the shells are keyed by
                  session id in the main process, so they survive tab switches
                  and hiding this pane, and are disposed when the tab closes.
                  The pane itself is a lazy chunk (xterm); the placeholder keeps
                  the split from collapsing while it loads. */}
              <Suspense
                fallback={
                  <div className="pane">
                    <div className="pane-header">
                      <span className="title">Terminal</span>
                    </div>
                    <div className="term-body">
                      <div className="empty">Starting…</div>
                    </div>
                  </div>
                }
              >
                <TerminalsPane
                  root={root}
                  theme={theme}
                  fontSize={fontSize}
                  disabled={!active}
                  full={full === 'terminal'}
                  onToggleFull={() => toggleFull('terminal')}
                  onHide={canHide ? () => onHidePane('terminal') : undefined}
                />
              </Suspense>
            </Panel>
            )}
          </Group>
        </Panel>
        )}
      </Group>

      <ContextMenu state={menu} onClose={() => setMenu(null)} />
    </div>
  )
})

/** Append newly fetched commits, skipping any we already hold. */
function mergeLog(prev: Commit[], next: Commit[]): Commit[] {
  const seen = new Set(prev.map((c) => c.hash))
  return [...prev, ...next.filter((c) => !seen.has(c.hash))]
}
