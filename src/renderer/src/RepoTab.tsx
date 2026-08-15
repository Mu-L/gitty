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
import { ContextMenu, type MenuItem, type MenuState } from './components/ContextMenu'
import { PromptDialog } from './components/PromptDialog'
import {
  DiffPane,
  type CollapseState,
  type DiffPaneHandle,
  type DiffView
} from './components/DiffPane'
import { FilesPane, matchesFilter, type FileEntry } from './components/FilesPane'
import { CommitInfo } from './components/CommitInfo'
import { useMsg } from './locale'
import { LogPane, WORKTREE_ROW } from './components/LogPane'
import { destroyTerminals, runInTerminal } from './terminals'
import { isHtmlPath, isImagePath, isMarkdownPath } from './paths'
import { FullButton, HideButton } from './components/PaneChrome'
import type { Theme } from './components/SettingsPane'
import { Tooltip } from './components/Tooltip'
import { createContextMenus, type View } from './contextMenus'
import {
  newNavHistory,
  pushPlace,
  type FileDocState,
  type NavHistory,
  type NavPlace
} from './nav'
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
  ApplyDirection,
  ChurnSpec,
  Commit,
  CommitFile,
  CommitMeta,
  DiffOptions,
  DiffRequest,
  DiffResult,
  DiffSide,
  FileChurn,
  HunkPick,
  LogFilterMode,
  RepoStatus,
  TerminalOptions,
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
  /** Go to a place in this tab's browsing history, by index into `places`. */
  goTo(index: number): void
  back(): void
  forward(): void
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
  /** Number markdown blocks with their source lines. */
  mdLineNumbers: boolean
  /** Sort file names the way a reader does, rather than by code unit. */
  naturalSort: boolean
  /** The monospace font setting, passed through to the terminal. */
  fontFamily: string
  /** How git is asked to compute every diff this tab shows. */
  diffOptions: DiffOptions
  /** Which shell a terminal in this tab starts, and how. */
  terminalOptions: TerminalOptions
  /** The command "Send to agent" types into this tab's focused shell. */
  agentCommand: string
  /** The commands its dropdown offers, most recently used first. */
  agentCommands: string[]
  /** Make one of them the current command and remember it. */
  onAgentCommand: (command: string) => void
  /** Drop one from the remembered list. */
  onForgetAgentCommand: (command: string) => void
  /** Draw the lane graph beside the commit hashes. */
  graph: boolean
  setGraph: Dispatch<SetStateAction<boolean>>
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
  /** Report the browsing history, which the title bar's buttons act on. */
  onNav: (root: string, history: NavHistory) => void
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
    mdLineNumbers,
    naturalSort,
    fontFamily,
    diffOptions,
    terminalOptions,
    agentCommand,
    agentCommands,
    onAgentCommand,
    onForgetAgentCommand,
    graph,
    setGraph,
    panes,
    onHidePane,
    browsing,
    settingsOpen,
    onStatus,
    onNav
  },
  ref
): JSX.Element {
  const { msg } = useMsg()
  const [status, setStatus] = useState<RepoStatus | null>(null)
  const [commits, setCommits] = useState<Commit[]>([])
  const [view, setView] = useState<View>({ mode: 'worktree' })
  const [viewFiles, setViewFiles] = useState<FileEntry[]>([])
  // The commit being read, shown above its file list; null outside commit and
  // snapshot mode.
  const [commitMeta, setCommitMeta] = useState<CommitMeta | null>(null)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<string | null>(WORKTREE_ROW)
  const [compareCommit, setCompareCommit] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  // The "New command…" prompt from the agent dropdown.
  const [agentPrompt, setAgentPrompt] = useState(false)
  // The diff is always the first document; opening a file adds another beside
  // it rather than replacing it, so a diff can stay on screen while a file is
  // read. Snapshots have no diff, so there the first document is a file.
  const [docs, setDocs] = useState<FileDocState[]>([])
  const [activeDoc, setActiveDoc] = useState<string | null>(null)
  // The pane filling the window, if any. One at a time, and per tab: another
  // repository's layout is none of its business.
  const [full, setFull] = useState<PaneId | null>(null)
  const [docSource, setDocSource] = useState<string | null>(null)
  // Where this repository has been looked at, and where in that list we are.
  // Per tab, like the view it records: another repository's history is none of
  // its business.
  const [nav, setNav] = useState<NavHistory>(newNavHistory)
  const diffRef = useRef<DiffPaneHandle>(null)
  const [collapseState, setCollapseState] = useState<CollapseState>({
    files: 0,
    allCollapsed: false
  })
  const [tick, setTick] = useState(0)
  // The push or pull in flight, and what the last external command said —
  // push, pull or gource; the strip below the header is the one place any of
  // them gets to speak in its own words.
  const [remoteOp, setRemoteOp] = useState<'push' | 'pull' | null>(null)
  // Which side of the index a work-tree file's diff is read from, when the
  // reader has said. Null follows the file's own state, which is what it did
  // before there was anything to stage.
  const [sideOverride, setSideOverride] = useState<DiffSide | null>(null)
  // An apply is in flight; the hunk buttons go quiet rather than queueing.
  const [staging, setStaging] = useState(false)
  // The repository search box, above the file list. Open is a state of its own
  // rather than a document, so the pattern can be edited before anything runs.
  // Every branch at once, rather than the one the log is pointed at. A log
  // view like the filter, not a preference: it belongs to this repository's
  // session and starts off again next time.
  const [allBranches, setAllBranches] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  // Ctrl+F over the file list narrows the tree rather than searching text: the
  // pane is a list of paths, and what a reader wants from it is fewer of them.
  const [treeFilterOpen, setTreeFilterOpen] = useState(false)
  const [treeFilter, setTreeFilter] = useState('')
  const treeFilterRef = useRef<HTMLInputElement>(null)
  const filesBodyRef = useRef<HTMLDivElement>(null)
  const [remoteMsg, setRemoteMsg] = useState<{ ok: boolean; text: string } | null>(null)
  // gource is optional: the button exists only where the binary does.
  const [hasGource, setHasGource] = useState(false)
  const [gourceStarting, setGourceStarting] = useState(false)
  const loadingMore = useRef(false)
  const exhausted = useRef(false)
  // The log filter. `filter` is what the box shows, so typing stays fluid; the
  // debounced copy is what git sees, so a keystroke per character does not each
  // fire a git log.
  const [filter, setFilter] = useState('')
  const [debouncedFilter, setDebouncedFilter] = useState('')
  // What the filter searches. A pickaxe mode reads every diff in the history,
  // so the log reports that it is working rather than looking briefly empty.
  const [filterMode, setFilterMode] = useState<LogFilterMode>('text')
  const [searching, setSearching] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedFilter(filter), 250)
    return () => clearTimeout(t)
  }, [filter])

  // The watcher can fire again — and a manual refresh can land — while `git
  // status` is still running, so replies come back out of order. Without this
  // guard a slow earlier call overwrites a newer one and the file list keeps
  // showing changes that are already committed, while the diff pane (which
  // re-runs git every time) shows the truth.
  const refreshSeq = useRef(0)
  // The filter of the last run; a change means old results belong to a
  // different query and must be swapped for the new ones, never merged.
  const lastFilter = useRef('')

  const refresh = useCallback(async () => {
    const seq = ++refreshSeq.current
    const pickaxe = debouncedFilter !== '' && filterMode !== 'text'
    if (pickaxe) setSearching(true)
    const [st, log] = await Promise.all([
      window.gitty.git.status(root),
      window.gitty.git.log(root, PAGE, 0, browsing, debouncedFilter, filterMode, allBranches)
    ])
    if (seq !== refreshSeq.current) return
    setSearching(false)
    setStatus(st)
    onStatus(st)
    // The mode is half of the query, so changing it invalidates the loaded
    // rows exactly as changing the text does.
    const query = `${filterMode}\u0000${allBranches}\u0000${debouncedFilter}`
    const filterChanged = lastFilter.current !== query
    lastFilter.current = query
    if (filterChanged) exhausted.current = false
    setCommits(
      filterChanged ? log : (prev) => (prev.length > PAGE ? mergeLog(prev, log) : log)
    )
    setTick((t) => t + 1)
  }, [root, browsing, onStatus, debouncedFilter, filterMode, allBranches])

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
      // Clear the previous view's message before loading this one's.
      setCommitMeta(null)

      if (view.mode === 'worktree') {
        rev = null
        entries = (status?.files ?? []).map<FileEntry>((f) => ({
          path: f.path,
          absPath: f.absPath,
          marks: statusMarks(f),
          deleted: f.worktree === 'D' || f.index === 'D',
          // Anything the index carries, whether or not the work tree has more
          // on top of it. Only the work tree has an index to speak of.
          staged: !f.untracked && f.index !== ' ',
          untracked: f.untracked,
          origPath: f.origPath
        }))
      } else if (view.mode === 'snapshot') {
        if (view.hash === null) {
          // Browse working tree: every file on disk — tracked and untracked —
          // read-only like a snapshot but with real paths. Opening a file works
          // ("Open in system app" and "Reveal" too), and its contents come from
          // the disk as it is now rather than from a revision.
          rev = null
          const paths = await window.gitty.git.worktreeFiles(root)
          if (cancelled) return
          entries = paths.map<FileEntry>((p) => ({
            path: p,
            absPath: `${root}/${p}`,
            marks: [],
            deleted: false
          }))
        } else {
          // Snapshot mode: the whole tree at that commit, read-only.
          rev = view.hash
          const [paths, meta] = await Promise.all([
            window.gitty.git.snapshotFiles(root, view.hash),
            window.gitty.git.commitMeta(root, view.hash)
          ])
          if (cancelled) return
          setCommitMeta(meta)
          entries = paths.map<FileEntry>((p) => ({
            path: p,
            // Virtual path — no file on disk; fileMenu/onOpen branch on this prefix.
            absPath: `gitty:snapshot:${view.hash}:${p}`,
            marks: [],
            deleted: false
          }))
        }
      } else {
        if (view.mode === 'commit') {
          rev = view.hash
          const detail = await window.gitty.git.commitDetail(root, view.hash)
          if (cancelled) return
          setCommitMeta({
            author: detail.commit.author,
            email: detail.commit.email,
            date: detail.commit.date,
            subject: detail.commit.subject,
            body: detail.body
          })
          entries = detail.files.map<FileEntry>((f) => ({
            path: f.path,
            absPath: f.absPath,
            marks: commitMarks(f),
            deleted: f.status === 'D',
            origPath: f.origPath
          }))
        } else {
          rev = view.to
          const files = await window.gitty.git.rangeFiles(root, view.from, view.to)
          if (cancelled) return
          entries = files.map<FileEntry>((f) => ({
            path: f.path,
            absPath: f.absPath,
            marks: commitMarks(f),
            deleted: f.status === 'D',
            origPath: f.origPath
          }))
        }
      }

      // Fetch line counts in one batch so the tree shows them right away, and
      // the churn of the same change beside them. A snapshot is a tree, not a
      // change, so it has none.
      if (!cancelled && entries.length > 0) {
        const pairs = entries.map((e) => ({ rev, filePath: e.path }))
        const spec: ChurnSpec | null =
          view.mode === 'worktree'
            ? { kind: 'worktree' }
            : view.mode === 'commit'
              ? { kind: 'commit', hash: view.hash }
              : view.mode === 'range'
                ? { kind: 'range', from: view.from, to: view.to }
                : null
        const [counts, churn] = await Promise.all([
          window.gitty.git.fileLines(root, pairs),
          spec
            ? window.gitty.git.fileChurn(root, spec, diffOptions)
            : Promise.resolve<Record<string, FileChurn>>({})
        ])
        if (!cancelled) {
          for (let i = 0; i < entries.length; i++) {
            entries[i] = { ...entries[i], lines: counts[i], churn: churn[entries[i].path] ?? null }
          }
        }
      }

      if (!cancelled) setViewFiles(entries)
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [root, view, status, diffOptions])

  /* ---------- documents (diff + opened files) ---------- */

  /** Revision a file opened from this view should be read at. */
  const revForView = useCallback((): string | null => {
    if (view.mode === 'commit' || view.mode === 'snapshot') return view.hash
    if (view.mode === 'range') return view.to
    return null
  }, [view])

  // Which tree the file pane is listing. Both the collapsed set and the filter
  // belong to one tree: another commit's files are not the ones that was typed
  // against.
  const treeKey =
    view.mode === 'snapshot'
      ? `snapshot:${view.hash ?? 'worktree'}`
      : view.mode === 'commit'
        ? `commit:${view.hash}`
        : view.mode === 'range'
          ? `range:${view.from}..${view.to}`
          : 'worktree'
  useEffect(() => {
    setTreeFilterOpen(false)
    setTreeFilter('')
  }, [treeKey])

  // One document per kind+revision+path; a blame of a file and the file itself
  // can sit beside each other, and so can two blame views of different revisions.
  const addDoc = useCallback(
    (kind: FileDocState['kind'], path: string) => {
      const rev = revForView()
      const prefix = kind === 'file' ? '' : `${kind}:`
      const id = `${prefix}${rev ?? 'work'}:${path}`
      setDocs((prev) =>
        prev.some((d) => d.id === id)
          ? prev
          : [
              ...prev,
              {
                kind,
                id,
                path,
                rev,
                preview: kind === 'file' && (isMarkdownPath(path) || isHtmlPath(path))
              }
            ]
      )
      setActiveDoc(id)
    },
    [revForView]
  )

  const openFileDoc = useCallback((path: string) => addDoc('file', path), [addDoc])

  /** Put a document in the strip and show it, unless it is already there. */
  const showDoc = useCallback((doc: FileDocState) => {
    setDocs((prev) =>
      prev.some((d) => d.id === doc.id)
        ? prev.map((d) => (d.id === doc.id ? doc : d))
        : [...prev, doc]
    )
    setActiveDoc(doc.id)
  }, [])

  /** `git log -L` over a range of one file's lines, from a blame row. */
  const openLineHistory = useCallback(
    (path: string, start: number, end: number) => {
      const rev = revForView()
      showDoc({
        kind: 'lines',
        id: `lines:${rev ?? 'work'}:${path}:${start}-${end}`,
        path,
        rev,
        preview: false,
        range: { start, end }
      })
    },
    [revForView, showDoc]
  )

  /** A repository-wide search, at whatever revision is being read. */
  const openSearch = useCallback(
    (pattern: string) => {
      const rev = revForView()
      showDoc({
        kind: 'grep',
        id: `grep:${rev ?? 'work'}:${pattern}`,
        path: pattern,
        rev,
        preview: false
      })
    },
    [revForView, showDoc]
  )

  /**
   * Open the file a search hit names, at the line it names. Source rather than
   * a rendered preview even for markdown: the line is the point.
   */
  const openHit = useCallback(
    (path: string, line: number) => {
      const rev = revForView()
      showDoc({ kind: 'file', id: `${rev ?? 'work'}:${path}`, path, rev, preview: false, line })
    },
    [revForView, showDoc]
  )
  /**
   * A link inside a rendered document, Ctrl+clicked. The revision comes from
   * the document that holds the link rather than from the view: a README read
   * at a commit links to that commit's files, whatever the log has selected
   * since.
   */
  const openLinkedPath = useCallback(
    (path: string, rev: string | null, anchor?: string) => {
      showDoc({
        kind: 'file',
        id: `${rev ?? 'work'}:${path}`,
        path,
        rev,
        preview: isMarkdownPath(path) || isHtmlPath(path),
        anchor
      })
    },
    [showDoc]
  )

  const openBlame = useCallback((path: string) => addDoc('blame', path), [addDoc])
  const openHistory = useCallback((path: string) => addDoc('history', path), [addDoc])

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
  const previewing =
    viewingFile && doc.preview && (isMarkdownPath(doc.path) || isHtmlPath(doc.path))

  // Which side to read is a choice about the file in front of you; another
  // file starts from its own state again.
  useEffect(() => setSideOverride(null), [selectedFile, view])

  // Snapshots have no diff, so a file selected there opens as a document.
  useEffect(() => {
    if (view.mode === 'snapshot' && selectedFile) openFileDoc(selectedFile)
  }, [view, selectedFile, openFileDoc])

  /* ---------- browsing history ---------- */

  // What the two top panes are showing, as one value the history can hold and
  // hand back later. Every way of moving around the repository — the log, the
  // file list, the context menus, Escape — ends up changing one of these three,
  // so recording them is enough and no navigation path can forget to.
  const place = useMemo<NavPlace>(() => ({ view, selectedFile, doc }), [view, selectedFile, doc])

  useEffect(() => {
    setNav((h) => pushPlace(h, place))
  }, [place])

  useEffect(() => onNav(root, nav), [onNav, root, nav])

  /**
   * Put a recorded place back on screen. No guard against this being recorded
   * again is needed: the index moves first, so by the time the effect above
   * runs, the place it would push is the one already at `nav.index` and
   * `pushPlace` recognises it as where we are.
   *
   * The document list is replaced rather than merged, so going back reproduces
   * that stop exactly instead of accumulating every file ever opened.
   */
  const goTo = useCallback(
    (index: number) => {
      const p = nav.places[index]
      if (!p || index === nav.index) return
      setNav({ ...nav, index })
      setView(p.view)
      setSelectedFile(p.selectedFile)
      setDocs(p.doc ? [p.doc] : [])
      setActiveDoc(p.doc?.id ?? null)
      // Keep the log's highlight in step: a range lit both of its ends, and a
      // work-tree browse is the work tree itself.
      setSelectedCommit(
        p.view.mode === 'worktree'
          ? WORKTREE_ROW
          : p.view.mode === 'range'
            ? p.view.to
            : p.view.mode === 'snapshot' && p.view.hash === null
              ? WORKTREE_ROW
              : p.view.hash
      )
      setCompareCommit(p.view.mode === 'range' ? p.view.from : null)
    },
    [nav]
  )

  const back = useCallback(() => goTo(nav.index - 1), [goTo, nav.index])
  const forward = useCallback(() => goTo(nav.index + 1), [goTo, nav.index])

  useImperativeHandle(ref, () => ({ refresh, goTo, back, forward }), [
    refresh,
    goTo,
    back,
    forward
  ])

  /* ---------- diff loading ---------- */

  // Same ordering hazard as `refresh`: clicking through files faster than git
  // answers would otherwise leave the previous file's patch on screen.
  const diffSeq = useRef(0)

  const loadDiff = useCallback(
    async (req: DiffRequest) => {
      const seq = ++diffSeq.current
      try {
        const d = await window.gitty.git.diff(root, req, diffOptions)
        if (seq === diffSeq.current) setDiff(d)
      } catch (e) {
        if (seq === diffSeq.current) setDiff({ patch: '', title: msg.diff.errorTitle, notice: String(e) })
      }
    },
    [root, msg, diffOptions]
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
        side: sideOverride ?? (f.worktree === ' ' && f.index !== ' ' ? 'index' : 'worktree'),
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
  }, [view, selectedFile, status, tick, sideOverride, loadDiff, clearDiff])

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

  /** Browse the whole repository as it is on disk right now — tracked and
   *  untracked files alike, read-only. The worktree row's context menu offers
   *  this. A null hash is what makes it the work tree rather than a revision. */
  const browseWorktree = useCallback(() => {
    setCompareCommit(null)
    setSelectedCommit(WORKTREE_ROW)
    setSelectedFile(null)
    setDocs([])
    setActiveDoc(null)
    setView({ mode: 'snapshot', hash: null, short: '', subject: '' })
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
      // Escape unwinds one level at a time: a dialog, full screen, then view.
      if (e.key === 'Escape') {
        if (settingsOpen || agentPrompt) return
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
  }, [active, settingsOpen, agentPrompt, full, panes, backToWorkTree, refresh])

  const loadMore = useCallback(async () => {
    if (loadingMore.current || exhausted.current) return
    loadingMore.current = true
    try {
      const more = await window.gitty.git.log(
        root,
        PAGE,
        commits.length,
        browsing,
        debouncedFilter,
        filterMode,
        allBranches
      )
      if (more.length === 0) exhausted.current = true
      else setCommits((prev) => mergeLog(prev, more))
    } finally {
      loadingMore.current = false
    }
  }, [root, browsing, commits.length, debouncedFilter, filterMode, allBranches])

  /* ---------- staging ---------- */

  /** The work-tree file the diff is showing, if that is what it is showing. */
  const workingFile = useMemo(
    () =>
      view.mode === 'worktree' && selectedFile
        ? (status?.files.find((f) => f.path === selectedFile) ?? null)
        : null,
    [view, selectedFile, status]
  )

  /**
   * Which way staging goes for the diff on screen — and whether it can be
   * offered at all. It cannot when the diff is not exactly one tracked file's
   * work (a whole work tree merges staged and unstaged changes, and the hunks
   * of a many-file diff are not numbered the way git numbers one file's), and
   * it must not when whitespace is being ignored: that diff does not hold
   * every change it would apply, so applying it would drop the rest silently.
   */
  const stageDirection: ApplyDirection | null = useMemo(() => {
    if (!workingFile || workingFile.untracked || viewingFile) return null
    if (diffOptions.ignoreWhitespace !== 'none') return null
    const side = sideOverride ?? (workingFile.worktree === ' ' && workingFile.index !== ' ' ? 'index' : 'worktree')
    return side === 'index' ? 'unstage' : 'stage'
  }, [workingFile, viewingFile, diffOptions, sideOverride])

  /** Report what git said; a success is only worth a line when it failed to be one. */
  const said = useCallback((res: { ok: boolean; output: string } | null) => {
    if (res && !res.ok) setRemoteMsg({ ok: false, text: res.output })
  }, [])

  const applyPicks = useCallback(
    async (picks: HunkPick[]) => {
      if (!workingFile || !stageDirection) return
      setStaging(true)
      try {
        said(
          await window.gitty.git.applyHunks(
            root,
            workingFile.path,
            picks,
            stageDirection,
            diffOptions
          )
        )
      } finally {
        setStaging(false)
        void refresh()
      }
    },
    [root, workingFile, stageDirection, diffOptions, refresh, said]
  )

  const toggleStage = useCallback(
    async (path: string, staged: boolean) => {
      said(
        staged
          ? await window.gitty.git.unstageFile(root, path)
          : await window.gitty.git.stageFile(root, path)
      )
      void refresh()
    },
    [root, refresh, said]
  )

  const discardChanges = useCallback(
    async (path: string) => {
      said(await window.gitty.git.discardFile(root, path))
      void refresh()
    },
    [root, refresh, said]
  )

  const copyStagedDiff = useCallback(() => {
    void window.gitty.git.stagedDiff(root).then((text) => window.gitty.clipboard.write(text))
  }, [root])

  /**
   * Hand the curated index over. Gitty writes one line into the shell that is
   * already in the window and stops there: no model is called from inside the
   * app, so nothing about the repository leaves the machine that the user did
   * not send themselves.
   */
  const sendToAgent = useCallback(
    (pick?: string) => {
      const command = (pick ?? agentCommand).trim()
      if (!command) {
        setRemoteMsg({ ok: false, text: msg.files.agentNoCommand })
        return
      }
      if (!runInTerminal(root, command)) {
        setRemoteMsg({ ok: false, text: msg.files.agentNoTerminal })
        return
      }
      // Remembered because it ran, not because it was typed: the list is a
      // record of what this machine actually has.
      onAgentCommand(command)
      setRemoteMsg(null)
    },
    [agentCommand, root, msg, onAgentCommand]
  )

  /**
   * The dropdown beside the button: every remembered command, the current one
   * ticked, and a way to type one that is not there yet. This is the only
   * place the command is chosen — a setting would be a second answer to a
   * question asked once per commit rather than once per install.
   */
  const agentItems = useCallback(
    (list: string[]): MenuItem[] => [
      ...list.map((c) => ({
        label: c,
        accel: c === agentCommand ? '✓' : undefined,
        title: `${c}${msg.files.agentCommandTooltip}`,
        action: () => sendToAgent(c),
        remove: {
          title: msg.files.agentForget,
          // Confirmed in the main process, so the dialog is modal to the
          // window. The menu is rebuilt rather than closed, so several can be
          // forgotten in a row.
          action: () => {
            void window.gitty.settings.confirmForget(c).then((yes) => {
              if (!yes) return
              onForgetAgentCommand(c)
              setMenu((m) => (m ? { ...m, items: agentItems(list.filter((x) => x !== c)) } : m))
            })
          }
        }
      })),
      {
        label: msg.files.agentNewCommand,
        separatorBefore: list.length > 0,
        action: () => setAgentPrompt(true)
      }
    ],
    [agentCommand, msg, sendToAgent, onForgetAgentCommand]
  )

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

  /* ---------- gource ---------- */

  useEffect(() => {
    void window.gitty.gource.available().then(setHasGource)
  }, [])

  /**
   * Start the animation. gource opens a window of its own and outlives the
   * click, so the button only waits long enough to learn whether it survived
   * its first seconds — and says nothing at all when it did.
   */
  const playGource = useCallback(async () => {
    setGourceStarting(true)
    setRemoteMsg(null)
    try {
      const res = await window.gitty.gource.play(root)
      if (res.output) setRemoteMsg({ ok: res.ok, text: res.output })
    } finally {
      setGourceStarting(false)
    }
  }, [root])

  // Success has been read by the time it matters; a failure stays until it is
  // dismissed, since it is the only place git's own words appear.
  useEffect(() => {
    if (!remoteMsg?.ok) return
    const t = setTimeout(() => setRemoteMsg(null), 5000)
    return () => clearTimeout(t)
  }, [remoteMsg])

  /* ---------- context menus ---------- */

  const { diffMenu, diffFileMenu, fileMenu, commitMenu, worktreeMenu } = createContextMenus({
    msg,
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
    openBlame,
    openHistory,
    showCommit,
    showSnapshot,
    onSelectCommit,
    revForView,
    setSelectedFile,
    setActiveDoc,
    setMenu,
    browseWorktree,
    toggleStage: (path, staged) => void toggleStage(path, staged),
    discardChanges: (path) => void discardChanges(path),
    copyStagedDiff
  })

  /* ---------- headers ---------- */

  const filesTitle = useMemo(() => {
    if (view.mode === 'worktree') return msg.files.workingTreeTitle
    if (view.mode === 'commit') return msg.files.commitTitle(view.short, view.subject)
    // A null-hash snapshot is the work tree being browsed, not a revision.
    if (view.mode === 'snapshot' && view.hash === null) return msg.files.workingTreeTitle
    if (view.mode === 'snapshot') return msg.files.snapshotTitle(view.short, view.subject)
    return msg.files.rangeTitle(view.from, view.to)
  }, [view, msg])

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

  const toggleFull = useCallback((id: PaneId): void => setFull((f) => (f === id ? null : id)), [])

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
    ? msg.pushPull.push
    : upstream === null
      ? msg.pushPull.publishTitle(status.branch)
      : ahead > 0
        ? msg.pushPull.pushAhead(ahead, status.branch, upstream)
        : msg.pushPull.nothingToPush(status.branch, upstream)
  const pullTitle = !status
    ? msg.pushPull.pull
    : upstream === null
      ? msg.pushPull.pullNoUpstream(status.branch)
      : behind > 0
        ? msg.pushPull.pullBehind(status.branch, upstream, behind)
        : msg.pushPull.pullFastForward(status.branch, upstream)

  const diffTitle = doc
    ? `${doc.path}${previewing ? ' (preview)' : ''}` +
      (doc.rev ? ` @ ${doc.rev.slice(0, 8)}` : '')
    : (diff?.title ?? msg.diff.titleFallback)

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
                      { key: 'dbl-click', desc: msg.log.tooltipViews },
                      { key: 'right-click', desc: msg.log.tooltipMore },
                      ...paneControls('files', msg)
                    ]}
                  >
                    {filesTitle}
                  </Tooltip>
                  <span className="spacer" />
                  {/* The index is curated here, so this is where it is handed
                      over. Only ever text into the shell below. */}
                  {view.mode === 'worktree' && (
                    <span className="split-button">
                      <button
                        className="toggle"
                        title={msg.files.sendToAgentTitle(agentCommand)}
                        onClick={() => sendToAgent()}
                      >
                        {msg.files.sendToAgent}
                      </button>
                      {/* Which agent to hand it to is a per-commit decision, so
                          the whole choice lives here: the remembered commands
                          and the box for one that is not remembered yet. */}
                      <button
                        className="toggle split-more"
                        title={msg.files.agentCommandsTitle}
                        onClick={(e) => {
                          const r = e.currentTarget.getBoundingClientRect()
                          setMenu({ x: r.left, y: r.bottom, items: agentItems(agentCommands) })
                        }}
                      >
                        ▾
                      </button>
                    </span>
                  )}
                  {/* Searching is about the whole repository, so it belongs to
                      the pane that lists it — and it follows the revision on
                      screen rather than always asking about the disk. */}
                  <button
                    className={`toggle${searchOpen ? ' on' : ''}`}
                    title={msg.files.searchTitle}
                    onClick={() => setSearchOpen((o) => !o)}
                  >
                    {msg.files.search}
                  </button>
                  {view.mode !== 'worktree' && (
                    <button onClick={backToWorkTree}>{msg.files.backToWorkTree}</button>
                  )}
                  {hideButton('files')}
                </div>
                {searchOpen && (
                  <div className="log-filter">
                    <input
                      type="text"
                      autoFocus
                      value={searchText}
                      placeholder={msg.files.searchPlaceholder}
                      spellCheck={false}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyDown={(e) => {
                        // Enter runs it; Escape puts the box away without
                        // disturbing the view behind it.
                        if (e.key === 'Enter' && searchText.trim()) {
                          e.stopPropagation()
                          openSearch(searchText.trim())
                        } else if (e.key === 'Escape') {
                          e.stopPropagation()
                          setSearchOpen(false)
                        }
                      }}
                    />
                    <span className="log-filter-busy">
                      {revForView()
                        ? msg.files.searchInRevision((revForView() as string).slice(0, 8))
                        : msg.files.searchInWorktree}
                    </span>
                  </div>
                )}
                {treeFilterOpen && (
                  <div className="log-filter">
                    <input
                      ref={treeFilterRef}
                      type="text"
                      value={treeFilter}
                      placeholder={msg.files.filterPlaceholder}
                      spellCheck={false}
                      onChange={(e) => setTreeFilter(e.target.value)}
                      onKeyDown={(e) => {
                        // Escape puts the strip away and the whole tree back;
                        // the focus goes where the arrow keys are read.
                        if (e.key === 'Escape') {
                          e.stopPropagation()
                          setTreeFilterOpen(false)
                          setTreeFilter('')
                          filesBodyRef.current?.focus()
                        }
                      }}
                    />
                    <span className="log-filter-busy">
                      {treeFilter === ''
                        ? ''
                        : msg.files.filterCount(
                            viewFiles.filter((f) => matchesFilter(f.path, treeFilter)).length,
                            viewFiles.length
                          )}
                    </span>
                    <button
                      className="log-filter-clear"
                      title={msg.files.filterClear}
                      onClick={() => {
                        setTreeFilterOpen(false)
                        setTreeFilter('')
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
                <div
                  ref={filesBodyRef}
                  className="pane-body"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
                      // Ctrl+F belongs to whichever view has the focus, and the
                      // document search listens on the window — so this one
                      // stops the event before it gets there.
                      e.preventDefault()
                      e.stopPropagation()
                      setTreeFilterOpen(true)
                      // A second Ctrl+F selects what is in the box, so the next
                      // thing typed replaces it — as it does in a browser.
                      requestAnimationFrame(() => {
                        treeFilterRef.current?.focus()
                        treeFilterRef.current?.select()
                      })
                    }
                  }}
                >
                  {commitMeta && <CommitInfo meta={commitMeta} />}
                  <FilesPane
                    entries={viewFiles}
                    naturalSort={naturalSort}
                    // A whole repository — browsing the work tree or a commit's
                    // snapshot — opens shut: it is a tree to descend into, not
                    // a list of changes to read.
                    startCollapsed={view.mode === 'snapshot'}
                    filter={treeFilterOpen ? treeFilter : ''}
                    treeKey={treeKey}
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
                    onToggleStage={
                      view.mode === 'worktree'
                        ? (f) => void toggleStage(f.path, !!f.staged)
                        : undefined
                    }
                    emptyText={
                      view.mode === 'worktree' ||
                      (view.mode === 'snapshot' && view.hash === null)
                        ? msg.files.emptyWorktree
                        : view.mode === 'snapshot'
                          ? msg.files.emptySnapshot
                          : msg.files.emptyDiff
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
                  <Tooltip className="title" lines={[{ key: '', desc: diffTitle }, ...paneControls('diff', msg)]}>
                    {diffTitle}
                  </Tooltip>
                  <span className="spacer" title={msg.diff.dblClickFullScreen} />
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
                            ? msg.diff.widenWorktree
                            : msg.diff.widenCommit
                          : view.mode === 'worktree'
                            ? msg.diff.allShown
                            : msg.diff.allCommitShown
                      }
                      onClick={() => {
                        setActiveDoc(null)
                        setSelectedFile(null)
                      }}
                    >
                      {msg.diff.showWholeDiff}
                    </button>
                  )}
                  {/* Which side of the index this file is being read from.
                      Only where both sides hold something: with one of them
                      empty the diff already says which it is. */}
                  {workingFile &&
                    !viewingFile &&
                    workingFile.index !== ' ' &&
                    workingFile.worktree !== ' ' && (
                      <div className="seg">
                        {(['worktree', 'index'] as const).map((side) => (
                          <button
                            key={side}
                            className={`toggle${(sideOverride ?? 'worktree') === side ? ' on' : ''}`}
                            title={
                              side === 'worktree'
                                ? msg.diff.sideUnstagedTitle
                                : msg.diff.sideStagedTitle
                            }
                            onClick={() => setSideOverride(side)}
                          >
                            {side === 'worktree' ? msg.diff.sideUnstaged : msg.diff.sideStaged}
                          </button>
                        ))}
                      </div>
                    )}
                  {selectedFile && view.mode !== 'snapshot' && !viewingFile && (
                    <button
                      className="toggle"
                      title={
                        isMarkdownPath(selectedFile)
                          ? msg.diff.previewTitle
                          : isHtmlPath(selectedFile)
                            ? msg.diff.htmlPreviewTitle
                            : isImagePath(selectedFile)
                              ? msg.diff.viewImageTitle
                              : msg.diff.viewFileTitle
                      }
                      onClick={() => openFileDoc(selectedFile)}
                    >
                      {isMarkdownPath(selectedFile) || isHtmlPath(selectedFile)
                        ? msg.diff.preview
                        : isImagePath(selectedFile)
                          ? msg.diff.viewImage
                          : msg.diff.viewFile}
                    </button>
                  )}
                  {previewing && doc && (
                    <button
                      className="toggle on"
                      title={
                        isHtmlPath(doc.path)
                          ? msg.diff.htmlSourceTitle
                          : msg.diff.markdownSourceTitle
                      }
                      onClick={() =>
                        setDocs((prev) =>
                          prev.map((d) => (d.id === doc.id ? { ...d, preview: false } : d))
                        )
                      }
                    >
                      {msg.diff.preview}
                    </button>
                  )}
                  {viewingFile &&
                    doc &&
                    !previewing &&
                    (isMarkdownPath(doc.path) || isHtmlPath(doc.path)) && (
                      <button
                        className="toggle"
                        title={
                          isHtmlPath(doc.path)
                            ? msg.diff.htmlPreviewTitle
                            : msg.diff.renderMarkdownTitle
                        }
                        onClick={() =>
                          setDocs((prev) =>
                            prev.map((d) => (d.id === doc.id ? { ...d, preview: true } : d))
                          )
                        }
                      >
                        {msg.diff.preview}
                      </button>
                    )}
                  {!viewingFile && collapseState.files > 1 && (
                    <button
                      className="toggle"
                      title={
                        collapseState.allCollapsed
                          ? msg.diff.expandAllTitle
                          : msg.diff.collapseAllTitle
                      }
                      onClick={() => diffRef.current?.toggleAll()}
                    >
                      {collapseState.allCollapsed ? msg.diff.expandAll : msg.diff.collapseAll}
                    </button>
                  )}
                  {/* An image has no lines to wrap. */}
                  {!(doc && isImagePath(doc.path)) && (
                    <button
                      className={`toggle${wrap ? ' on' : ''}`}
                      title={previewing ? msg.diff.wrapCode : msg.diff.wrapLong}
                      onClick={() => setWrap((w) => !w)}
                    >
                      {msg.diff.wrap}
                    </button>
                  )}
                  {previewing && (
                    <button
                      className={`toggle${mdOutline ? ' on' : ''}`}
                      title={msg.diff.showOutline}
                      onClick={() => setMdOutline((o) => !o)}
                    >
                      {msg.diff.outline}
                    </button>
                  )}
                  {!viewingFile && (
                    <button
                      className="toggle"
                      title={msg.diff.switchView}
                      onClick={() => setDiffView((v) => (v === 'inline' ? 'split' : 'inline'))}
                    >
                      {diffView === 'inline' ? msg.diff.inline : msg.diff.sideBySide}
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
                        title={msg.diff.docTabDiffTitle}
                      >
                        {msg.diff.docTabDiff}
                      </div>
                    )}
                    {docs.map((d) => (
                      <div
                        key={d.id}
                        className={`doc-tab${activeDoc === d.id ? ' active' : ''}`}
                        onClick={() => setActiveDoc(d.id)}
                        title={d.rev ? `${d.path} @ ${d.rev.slice(0, 8)}` : d.path}
                      >
                        {d.kind !== 'file' && (
                          <span className="doc-kind">
                            {d.kind === 'blame'
                              ? msg.diff.docTabBlame
                              : d.kind === 'history'
                                ? msg.diff.docTabHistory
                                : d.kind === 'lines'
                                  ? msg.diff.docTabLines
                                  : msg.diff.docTabSearch}
                          </span>
                        )}
                        <span className="doc-name">
                          {d.kind === 'grep' ? d.path : d.path.split('/').pop()}
                        </span>
                        <span
                          className="doc-close"
                          title={msg.diff.docTabClose}
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
                        <div className="empty">{msg.common.loading}</div>
                      </div>
                    }
                  >
                    <FileDoc
                      key={doc.id}
                      root={root}
                      path={doc.path}
                      rev={doc.rev}
                      kind={doc.kind}
                      preview={doc.preview}
                      wrap={wrap}
                      outline={mdOutline}
                      lineNumbers={mdLineNumbers}
                      active={active}
                      reloadKey={tick}
                      onSource={setDocSource}
                      onMenu={diffMenu}
                      setMenu={setMenu}
                      onOpenCommit={showCommit}
                      range={doc.range}
                      gotoLine={doc.line}
                      onOpenHit={openHit}
                      onOpenPath={openLinkedPath}
                      anchor={doc.anchor}
                      onLineHistory={(start, end) => openLineHistory(doc.path, start, end)}
                    />
                  </Suspense>
                ) : (
                  <DiffPane
                    ref={diffRef}
                    active={active}
                    onOpenFile={openFileDoc}
                    onFileMenu={diffFileMenu}
                    onCollapseState={setCollapseState}
                    stage={
                      stageDirection
                        ? { direction: stageDirection, busy: staging, onApply: applyPicks }
                        : undefined
                    }
                    patch={diff?.patch ?? ''}
                    notice={diff?.notice}
                    wrap={wrap}
                    view={diffView}
                    wordDiff={wordDiff}
                    onMenu={diffMenu}
                    placeholder={
                      view.mode === 'worktree'
                        ? msg.diff.emptyWorktree
                        : view.mode === 'snapshot' && view.hash === null
                          ? msg.diff.emptyBrowseWorktree
                          : view.mode === 'snapshot'
                            ? msg.diff.emptySnapshot
                            : msg.diff.emptyDiff
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
                      { key: '↑↓', desc: msg.log.keyMove },
                      { key: 'Enter', desc: msg.log.keyShow },
                      { key: 'Ctrl+Click', desc: msg.log.keyCompare },
                      { key: 'Esc', desc: msg.log.keyWorktree },
                      ...paneControls('log', msg)
                    ]}
                  >
                    {msg.log.commits}
                  </Tooltip>
                  {/* Only worth saying when it is not the checked-out branch;
                      otherwise the title bar already says it. */}
                  {browsing && (
                    <span className="badge branch-badge" title={msg.log.browsingAnother}>
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
                    {remoteOp === 'push' ? msg.pushPull.pushing : ahead > 0 ? msg.pushPull.pushCount(ahead) : msg.pushPull.push}
                  </button>
                  <button
                    className="toggle"
                    disabled={!canPull || remoteOp !== null}
                    title={pullTitle}
                    onClick={() => void runRemote('pull')}
                  >
                    {remoteOp === 'pull' ? msg.pushPull.pulling : behind > 0 ? msg.pushPull.pullCount(behind) : msg.pushPull.pull}
                  </button>
                  {/* Only where gource is installed — an absent companion is
                      better said by silence than by a dead button. */}
                  {hasGource && (
                    <button
                      className="toggle"
                      disabled={gourceStarting}
                      title={msg.log.gourceTitle}
                      onClick={() => void playGource()}
                    >
                      {gourceStarting ? msg.log.gourceStarting : msg.log.gource}
                    </button>
                  )}
                  <button
                    className={`toggle${graph ? ' on' : ''}`}
                    title={msg.log.graphTitle}
                    onClick={() => setGraph((g) => !g)}
                  >
                    {msg.log.graph}
                  </button>
                  <button
                    className={`toggle${allBranches ? ' on' : ''}`}
                    title={msg.log.allBranchesTitle}
                    onClick={() => setAllBranches((a) => !a)}
                  >
                    {msg.log.allBranches}
                  </button>
                  <button
                    className="toggle"
                    title={msg.log.openRepoCommitsTitle}
                    onClick={() => {
                      void window.gitty.web.repoUrl(root).then((url) => {
                        if (url) void window.gitty.file.openExternal(url)
                      })
                    }}
                  >
                    {msg.log.openInBrowser}
                  </button>
                  <span className="spacer" />
                  {compareCommit && <span className="badge">{msg.log.comparing2}</span>}
                  {hideButton('log')}
                </div>
                {/* What git said. Failures stay until dismissed: a push that
                    needs a password or a pull that cannot fast-forward is
                    finished by hand in the terminal pane. */}
                {remoteMsg && (
                  <div
                    className={`remote-msg${remoteMsg.ok ? '' : ' error'}`}
                    title={msg.log.clickToDismiss}
                    onClick={() => setRemoteMsg(null)}
                  >
                    {remoteMsg.text}
                  </div>
                )}
                <LogPane
                  commits={commits}
                  graph={graph}
                  selected={selectedCommit}
                  compare={compareCommit}
                  changedCount={status?.files.length ?? 0}
                  filter={filter}
                  onFilter={setFilter}
                  filterMode={filterMode}
                  onFilterMode={setFilterMode}
                  searching={searching}
                  onSelect={onSelectCommit}
                  onWorktreeMenu={worktreeMenu}
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
                      <span className="title">{msg.terminal.title}</span>
                    </div>
                    <div className="term-body">
                      <div className="empty">{msg.terminal.starting}</div>
                    </div>
                  </div>
                }
              >
                <TerminalsPane
                  root={root}
                  theme={theme}
                  fontSize={fontSize}
                  fontFamily={fontFamily}
                  options={terminalOptions}
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
      <PromptDialog
        open={agentPrompt}
        title={msg.files.agentPromptTitle}
        placeholder={msg.files.agentCommandPlaceholder}
        initial={agentCommand}
        submitLabel={msg.files.agentPromptRun}
        cancelLabel={msg.files.agentPromptCancel}
        onCancel={() => setAgentPrompt(false)}
        onSubmit={(c) => {
          setAgentPrompt(false)
          sendToAgent(c)
        }}
      />
    </div>
  )
})

/** Append newly fetched commits, skipping any we already hold. */
function mergeLog(prev: Commit[], next: Commit[]): Commit[] {
  const seen = new Set(prev.map((c) => c.hash))
  return [...prev, ...next.filter((c) => !seen.has(c.hash))]
}
