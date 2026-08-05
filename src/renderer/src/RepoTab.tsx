import {
  forwardRef,
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
import { CodePane } from './components/CodePane'
import { DiffPane, type DiffView } from './components/DiffPane'
import { FilesPane, type FileEntry } from './components/FilesPane'
import { LogPane, WORKTREE_ROW } from './components/LogPane'
import { MarkdownPane } from './components/MarkdownPane'
import { TerminalsPane } from './components/TerminalsPane'
import type { Theme } from './components/SettingsPane'
import type {
  Commit,
  CommitFile,
  DiffRequest,
  DiffResult,
  RepoStatus,
  WorkingFile
} from '../../shared/types'

const PAGE = 300

type View =
  | { mode: 'worktree' }
  | { mode: 'commit'; hash: string; short: string; subject: string }
  | { mode: 'range'; from: string; to: string }
  | { mode: 'snapshot'; hash: string; short: string; subject: string }

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
  // Viewing a whole file is a one-off action, not a remembered preference:
  // selecting anything else drops back to its diff.
  const [fileView, setFileView] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [fileSource, setFileSource] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const loadingMore = useRef(false)
  const exhausted = useRef(false)

  const refresh = useCallback(async () => {
    const [st, log] = await Promise.all([
      window.gitty.git.status(root),
      window.gitty.git.log(root, PAGE, 0, browsing)
    ])
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
    setFileView(false)
  }, [browsing])

  useImperativeHandle(ref, () => ({ refresh }), [refresh])

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
      if (view.mode === 'worktree') {
        const files = (status?.files ?? []).map<FileEntry>((f) => ({
          path: f.path,
          absPath: f.absPath,
          marks: statusMarks(f),
          deleted: f.worktree === 'D' || f.index === 'D',
          origPath: f.origPath
        }))
        if (!cancelled) setViewFiles(files)
        return
      }
      // Snapshot mode: the whole tree at that commit, read-only.
      if (view.mode === 'snapshot') {
        const paths = await window.gitty.git.snapshotFiles(root, view.hash)
        if (cancelled) return
        setViewFiles(
          paths.map<FileEntry>((p) => ({
            path: p,
            // Virtual path — no file on disk; fileMenu/onOpen branch on this prefix.
            absPath: `gitty:snapshot:${view.hash}:${p}`,
            marks: [],
            deleted: false
          }))
        )
        return
      }
      const files =
        view.mode === 'commit'
          ? (await window.gitty.git.commitDetail(root, view.hash)).files
          : await window.gitty.git.rangeFiles(root, view.from, view.to)
      if (cancelled) return
      setViewFiles(
        files.map<FileEntry>((f) => ({
          path: f.path,
          absPath: f.absPath,
          marks: commitMarks(f),
          deleted: f.status === 'D',
          origPath: f.origPath
        }))
      )
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [root, view, status])

  /* ---------- whole-file view ---------- */

  const isMarkdown = /\.(md|markdown|mdown|mkd)$/i.test(selectedFile ?? '')
  // A snapshot has no diff to show, so it is always a file view.
  const viewingFile = !!selectedFile && (fileView || view.mode === 'snapshot')
  const previewing = viewingFile && isMarkdown

  // The file view always shows the file as a whole: on disk for the work tree,
  // at the selected revision everywhere else.
  useEffect(() => {
    if (!viewingFile || !selectedFile) {
      setFileSource(null)
      return
    }
    let cancelled = false
    const rev =
      view.mode === 'commit' || view.mode === 'snapshot'
        ? view.hash
        : view.mode === 'range'
          ? view.to
          : null

    void (async () => {
      try {
        const r = rev
          ? await window.gitty.git.snapshotFile(root, rev, selectedFile)
          : await window.gitty.git.readWorking(root, selectedFile)
        if (cancelled) return
        setFileSource(r.binary ? null : r.content)
        setFileError(r.binary ? 'Binary or oversized file.' : null)
      } catch (e) {
        if (cancelled) return
        setFileSource(null)
        setFileError(String(e))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [root, view, selectedFile, viewingFile, tick])

  /* ---------- diff loading ---------- */

  const loadDiff = useCallback(
    async (req: DiffRequest) => {
      try {
        setDiff(await window.gitty.git.diff(root, req))
      } catch (e) {
        setDiff({ patch: '', title: 'error', notice: String(e) })
      }
    },
    [root]
  )

  // Whenever the view, the selected file or the repo state changes, reload the diff.
  useEffect(() => {
    if (view.mode === 'worktree') {
      if (!selectedFile) {
        setDiff(null)
        return
      }
      const f = status?.files.find((x) => x.path === selectedFile)
      if (!f) {
        setDiff(null)
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
      setDiff(null)
    }
  }, [view, selectedFile, status, tick, loadDiff])

  /* ---------- commit interactions ---------- */

  const showCommit = useCallback((c: Commit) => {
    setCompareCommit(null)
    setSelectedCommit(c.hash)
    setSelectedFile(null)
    setFileView(false)
    setView({ mode: 'commit', hash: c.hash, short: c.short, subject: c.subject })
  }, [])

  /** Browse the whole repository as it was at this commit, read-only. */
  const showSnapshot = useCallback((c: Commit) => {
    setCompareCommit(null)
    setSelectedCommit(c.hash)
    setSelectedFile(null)
    setFileView(false)
    setView({ mode: 'snapshot', hash: c.hash, short: c.short, subject: c.subject })
  }, [])

  const backToWorkTree = useCallback(() => {
    setView({ mode: 'worktree' })
    setSelectedCommit(WORKTREE_ROW)
    setCompareCommit(null)
    setSelectedFile(null)
    setFileView(false)
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
      setFileView(false)
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
        if (maximized) setMaximized(false)
        else backToWorkTree()
      } else if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
        e.preventDefault()
        void refresh()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, settingsOpen, maximized, backToWorkTree, refresh])

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

  /* ---------- context menus ---------- */

  const diffMenu = (at: MenuState): void => {
    const selection = window.getSelection()?.toString() ?? ''
    const items: MenuItem[] = []
    if (selection) {
      items.push({
        label: 'Copy Selection',
        accel: 'Ctrl+C',
        action: () => void window.gitty.clipboard.write(selection)
      })
    }
    if (viewingFile) {
      items.push({
        label: previewing ? 'Copy Markdown Source' : 'Copy File Contents',
        separatorBefore: items.length > 0,
        action: () => void window.gitty.clipboard.write(fileSource ?? '')
      })
      items.push({
        label: wrap ? 'Disable Word Wrap' : 'Enable Word Wrap',
        separatorBefore: true,
        action: () => setWrap((w) => !w)
      })
      if (previewing) {
        items.push({
          label: mdOutline ? 'Hide Outline' : 'Show Outline',
          action: () => setMdOutline((o) => !o)
        })
      }
      // A snapshot has no diff to go back to.
      if (view.mode !== 'snapshot') {
        items.push({
          label: 'Show Diff Instead',
          action: () => setFileView(false)
        })
      }
    } else {
      items.push({
        label: 'Copy Whole Diff',
        separatorBefore: items.length > 0,
        action: () => void window.gitty.clipboard.write(diff?.patch ?? '')
      })
      if (selectedFile) {
        items.push({
          label: isMarkdown ? 'Preview Markdown' : 'View File',
          separatorBefore: true,
          action: () => setFileView(true)
        })
      }
      items.push({
        label: wrap ? 'Disable Word Wrap' : 'Enable Word Wrap',
        separatorBefore: !selectedFile,
        action: () => setWrap((w) => !w)
      })
      items.push({
        label: wordDiff ? 'Disable Word Highlight' : 'Enable Word Highlight',
        action: () => setWordDiff((w) => !w)
      })
      items.push({
        label: diffView === 'inline' ? 'Side-by-Side View' : 'Inline View',
        action: () => setDiffView((v) => (v === 'inline' ? 'split' : 'inline'))
      })
    }
    setMenu({ ...at, items })
  }

  const fileMenu = (entry: FileEntry, at: MenuState): void => {
    const rel = entry.path
    // Snapshot entries carry a virtual absPath; opening must go through the
    // snapshot temp file, and "Reveal" has nothing to reveal on disk.
    const snapshot = entry.absPath.startsWith('gitty:snapshot:')
    const items: MenuItem[] = [
      {
        label: 'View File',
        accel: 'Double click',
        action: () => {
          setSelectedFile(entry.path)
          setFileView(true)
        }
      }
    ]
    if (snapshot && view.mode === 'snapshot') {
      items.push({
        label: 'Open in System App',
        action: () => void window.gitty.git.snapshotOpen(root, view.hash, rel)
      })
    } else {
      items.push(
        { label: 'Open in System App', action: () => void window.gitty.file.open(entry.absPath) },
        { label: 'Reveal in File Manager', action: () => void window.gitty.file.reveal(entry.absPath) }
      )
    }
    items.push({
      label: 'Copy Relative Path',
      separatorBefore: items.length > 0,
      action: () => void window.gitty.clipboard.write(rel)
    })
    items.push({ label: 'Copy Absolute Path', action: () => void window.gitty.clipboard.write(entry.absPath) })
    items.push({
      label: 'Copy File Name',
      action: () => void window.gitty.clipboard.write(rel.split('/').pop() ?? rel)
    })
    setMenu({ ...at, items })
  }

  const commitMenu = (c: Commit, at: MenuState): void => {
    const items: MenuItem[] = [
      { label: 'Show Commit Diff', accel: 'Enter', action: () => showCommit(c) },
      {
        label: 'Copy Commit Hash',
        separatorBefore: true,
        action: () => void window.gitty.clipboard.write(c.hash)
      },
      { label: 'Copy Short Hash', action: () => void window.gitty.clipboard.write(c.short) },
      { label: 'Copy Subject', action: () => void window.gitty.clipboard.write(c.subject) },
      {
        label: 'Browse Snapshot',
        separatorBefore: true,
        action: () => showSnapshot(c)
      }
    ]
    if (selectedCommit && selectedCommit !== c.hash) {
      items.push({
        label: 'Diff Against Selected',
        accel: 'Ctrl+Click',
        separatorBefore: true,
        action: () => onSelectCommit(c.hash, true)
      })
    }
    setMenu({ ...at, items })
  }

  /* ---------- headers ---------- */

  const filesTitle = useMemo(() => {
    if (view.mode === 'worktree') return 'Working Tree'
    if (view.mode === 'commit') return `Commit ${view.short} — ${view.subject}`
    if (view.mode === 'snapshot') return `Snapshot ${view.short} — ${view.subject}`
    return `Range ${view.from.slice(0, 8)}..${view.to.slice(0, 8)}`
  }, [view])

  const diffTitle = viewingFile
    ? `${selectedFile}${previewing ? ' (preview)' : ''}` +
      (view.mode === 'snapshot' ? ` @ ${view.short}` : '')
    : (diff?.title ?? 'Diff')

  return (
    <div className="repo-tab" onContextMenu={(e) => e.preventDefault()}>
      {/* Hidden tabs stay mounted, so their groups must opt out of hit
          testing: react-resizable-panels checks every registered group against
          the pointer, and a display:none group reports a zero-sized rect. */}
      <Group
        orientation="vertical"
        className="grid"
        id={groupId(root, 'rows')}
        disabled={!active}
      >
        <Panel defaultSize="55%" minSize="20%">
          <Group orientation="horizontal" id={groupId(root, 'top')} disabled={!active}>
            <Panel defaultSize="38%" minSize="15%">
              <div className="pane">
                <div className="pane-header">
                  <span className="title">{filesTitle}</span>
                  <span className="spacer" />
                  {view.mode !== 'worktree' && (
                    <button onClick={backToWorkTree}>Back to Work Tree</button>
                  )}
                  <span className="hint">dbl-click views · right-click for more</span>
                </div>
                <div className="pane-body">
                  <FilesPane
                    entries={viewFiles}
                    selected={selectedFile}
                    onSelect={(f) => {
                      setSelectedFile(f.path)
                      setFileView(false)
                    }}
                    onOpen={(f) => {
                      // Double-click views the file in the pane beside it;
                      // the system application is a context-menu choice.
                      setSelectedFile(f.path)
                      setFileView(true)
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
            <Separator className="sep-v" />
            <Panel minSize="20%">
              <div className={`pane${maximized ? ' maximized' : ''}`}>
                <div
                  className="pane-header"
                  onDoubleClick={(e) => {
                    // Buttons in the header have their own meaning.
                    if ((e.target as HTMLElement).closest('button')) return
                    setMaximized((m) => !m)
                  }}
                >
                  {/* Tooltips live on the individual parts: a title on the
                      header itself would show up under every button that has
                      none of its own. */}
                  <span className="title" title={diffTitle}>
                    {diffTitle}
                  </span>
                  <span className="spacer" title="Double-click to toggle full screen" />
                  {/* Only commit and range diffs have a "whole" to widen back
                      to; a snapshot is always one file at a time. */}
                  {selectedFile &&
                    !viewingFile &&
                    (view.mode === 'commit' || view.mode === 'range') && (
                      <button
                        title="Widen the diff back to every file in this commit"
                        onClick={() => setSelectedFile(null)}
                      >
                        Show Whole Diff
                      </button>
                    )}
                  {selectedFile && view.mode !== 'snapshot' && (
                    <button
                      className={`toggle${viewingFile ? ' on' : ''}`}
                      title={
                        isMarkdown
                          ? 'Render this markdown file'
                          : 'Show the whole file instead of the diff'
                      }
                      onClick={() => setFileView((v) => !v)}
                    >
                      {isMarkdown ? 'Preview' : 'View File'}
                    </button>
                  )}
                  <button
                    className={`toggle${wrap ? ' on' : ''}`}
                    title={previewing ? 'Wrap code blocks and tables' : 'Wrap long lines'}
                    onClick={() => setWrap((w) => !w)}
                  >
                    Wrap
                  </button>
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
                  <button
                    className={`toggle${maximized ? ' on' : ''}`}
                    title={maximized ? 'Restore the four-pane layout (Esc)' : 'Fill the window'}
                    onClick={() => setMaximized((m) => !m)}
                  >
                    {maximized ? 'Restore' : 'Full Screen'}
                  </button>
                </div>
                {viewingFile ? (
                  fileSource === null ? (
                    <div className="pane-body">
                      <div className="empty">{fileError ?? 'Loading…'}</div>
                    </div>
                  ) : previewing ? (
                    <MarkdownPane
                      source={fileSource}
                      outline={mdOutline}
                      wrap={wrap}
                      onMenu={diffMenu}
                    />
                  ) : (
                    <CodePane
                      source={fileSource}
                      path={selectedFile ?? ''}
                      wrap={wrap}
                      onMenu={diffMenu}
                    />
                  )
                ) : (
                  <DiffPane
                    patch={diff?.patch ?? ''}
                    notice={diff?.notice}
                    wrap={wrap}
                    view={diffView}
                    wordDiff={wordDiff}
                    onMenu={diffMenu}
                    placeholder={
                      view.mode === 'worktree'
                        ? 'Select a file to see its diff.'
                        : view.mode === 'snapshot'
                          ? 'Select a file to view it at this commit.'
                          : 'No textual changes.'
                    }
                  />
                )}
              </div>
            </Panel>
          </Group>
        </Panel>

        <Separator className="sep-h" />

        <Panel minSize="20%">
          <Group orientation="horizontal" id={groupId(root, 'bottom')} disabled={!active}>
            <Panel defaultSize="58%" minSize="20%">
              <div className="pane">
                <div className="pane-header">
                  <span className="title">Commits</span>
                  {/* Only worth saying when it is not the checked-out branch;
                      otherwise the title bar already says it. */}
                  {browsing && (
                    <span className="badge branch-badge" title="Browsing another branch">
                      ⎇ {browsing}
                    </span>
                  )}
                  <span className="spacer" />
                  {compareCommit && <span className="badge">comparing 2 commits</span>}
                  <span className="hint">
                    ↑↓ move · Enter show · Ctrl+Click compare · Esc work tree
                  </span>
                </div>
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
            <Separator className="sep-v" />
            <Panel minSize="15%">
              {/* A repo tab owns its terminal group; the shells are keyed by
                  session id in the main process, so they survive tab switches
                  and are disposed when this tab unmounts. */}
              <TerminalsPane root={root} theme={theme} fontSize={fontSize} disabled={!active} />
            </Panel>
          </Group>
        </Panel>
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
