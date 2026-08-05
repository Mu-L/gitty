import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { ContextMenu, type MenuItem, type MenuState } from './components/ContextMenu'
import { DiffPane } from './components/DiffPane'
import { FilesPane, type FileEntry } from './components/FilesPane'
import { LogPane } from './components/LogPane'
import { TerminalPane } from './components/TerminalPane'
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

export default function App(): JSX.Element {
  const [root, setRoot] = useState<string | null>(null)
  const [status, setStatus] = useState<RepoStatus | null>(null)
  const [commits, setCommits] = useState<Commit[]>([])
  const [view, setView] = useState<View>({ mode: 'worktree' })
  const [viewFiles, setViewFiles] = useState<FileEntry[]>([])
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [diff, setDiff] = useState<DiffResult | null>(null)
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null)
  const [compareCommit, setCompareCommit] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const loadingMore = useRef(false)
  const exhausted = useRef(false)

  /* ---------- repository bootstrap ---------- */

  const openRepo = useCallback(async (candidate: string) => {
    const resolved = await window.gitty.repo.resolve(candidate)
    if (!resolved) {
      setError(`${candidate} is not inside a git work tree. Use "Open Repository".`)
      return
    }
    setError(null)
    setRoot(resolved)
    setView({ mode: 'worktree' })
    setSelectedFile(null)
    setSelectedCommit(null)
    setCompareCommit(null)
    setDiff(null)
    setCommits([])
    exhausted.current = false
    await window.gitty.repo.watch(resolved)
  }, [])

  useEffect(() => {
    void window.gitty.repo.initial().then(openRepo)
  }, [openRepo])

  const refresh = useCallback(async () => {
    if (!root) return
    const [st, log] = await Promise.all([
      window.gitty.git.status(root),
      window.gitty.git.log(root, PAGE, 0)
    ])
    setStatus(st)
    setCommits((prev) => (prev.length > PAGE ? mergeLog(prev, log) : log))
    setTick((t) => t + 1)
  }, [root])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => window.gitty.repo.onChanged(() => void refresh()), [refresh])

  /* ---------- file list per view ---------- */

  useEffect(() => {
    if (!root) return
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

  /* ---------- diff loading ---------- */

  const loadDiff = useCallback(
    async (req: DiffRequest) => {
      if (!root) return
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
    if (!root) return
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
    } else {
      void loadDiff({
        kind: 'range',
        from: view.from,
        to: view.to,
        path: selectedFile ?? undefined
      })
    }
  }, [root, view, selectedFile, status, tick, loadDiff])

  /* ---------- commit interactions ---------- */

  const showCommit = useCallback((c: Commit) => {
    setCompareCommit(null)
    setSelectedCommit(c.hash)
    setSelectedFile(null)
    setView({ mode: 'commit', hash: c.hash, short: c.short, subject: c.subject })
  }, [])

  const onSelectCommit = useCallback(
    (hash: string, additive: boolean) => {
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
      setView({ mode: 'range', from, to })
    },
    [commits, selectedCommit, showCommit]
  )

  const backToWorkTree = useCallback(() => {
    setView({ mode: 'worktree' })
    setCompareCommit(null)
    setSelectedFile(null)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') backToWorkTree()
      else if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'r')) {
        e.preventDefault()
        void refresh()
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault()
        void window.gitty.repo.pick().then((p) => { if (p) void openRepo(p) })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [backToWorkTree, refresh, openRepo])

  const loadMore = useCallback(async () => {
    if (!root || loadingMore.current || exhausted.current) return
    loadingMore.current = true
    try {
      const more = await window.gitty.git.log(root, PAGE, commits.length)
      if (more.length === 0) exhausted.current = true
      else setCommits((prev) => mergeLog(prev, more))
    } finally {
      loadingMore.current = false
    }
  }, [root, commits.length])

  /* ---------- context menus ---------- */

  const fileMenu = (entry: FileEntry, at: MenuState): void => {
    const rel = entry.path
    const items: MenuItem[] = [
      { label: 'Open File', accel: 'Double click', action: () => void window.gitty.file.open(entry.absPath) },
      { label: 'Reveal in File Manager', action: () => void window.gitty.file.reveal(entry.absPath) },
      {
        label: 'Copy Relative Path',
        separatorBefore: true,
        action: () => void window.gitty.clipboard.write(rel)
      },
      { label: 'Copy Absolute Path', action: () => void window.gitty.clipboard.write(entry.absPath) },
      {
        label: 'Copy File Name',
        action: () => void window.gitty.clipboard.write(rel.split('/').pop() ?? rel)
      }
    ]
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
      { label: 'Copy Subject', action: () => void window.gitty.clipboard.write(c.subject) }
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
    return `Range ${view.from.slice(0, 8)}..${view.to.slice(0, 8)}`
  }, [view])

  const diffTitle = diff?.title ?? 'Diff'

  return (
    <div className="app" onContextMenu={(e) => e.preventDefault()}>
      <div className="titlebar">
        <strong>Gitty</strong>
        <span className="repo">{root ?? 'no repository'}</span>
        {status && (
          <>
            <span className="branch">⎇ {status.branch}</span>
            {status.upstream && (
              <span className="tracking">
                {status.upstream} ↑{status.ahead} ↓{status.behind}
              </span>
            )}
            <span className="tracking">{status.files.length} changed</span>
          </>
        )}
        {error && <span style={{ color: 'var(--red)' }}>{error}</span>}
        <span className="spacer" />
        <button onClick={() => void window.gitty.repo.pick().then((p) => { if (p) void openRepo(p) })}>
          Open Repository
        </button>
        <button onClick={() => void refresh()}>Refresh</button>
      </div>

      <Group orientation="vertical" className="grid" id="rows">
        <Panel defaultSize="55%" minSize="20%">
          <Group orientation="horizontal" id="top">
            <Panel defaultSize="38%" minSize="15%">
              <div className="pane">
                <div className="pane-header">
                  <span className="title">{filesTitle}</span>
                  <span className="spacer" />
                  {view.mode !== 'worktree' && (
                    <button onClick={backToWorkTree}>Back to Work Tree</button>
                  )}
                  <span className="hint">dbl-click opens · right-click copies</span>
                </div>
                <div className="pane-body">
                  <FilesPane
                    entries={viewFiles}
                    selected={selectedFile}
                    onSelect={(f) => setSelectedFile(f.path)}
                    onOpen={(f) => void window.gitty.file.open(f.absPath)}
                    onMenu={fileMenu}
                    emptyText={
                      view.mode === 'worktree' ? 'Working tree clean.' : 'No files in this diff.'
                    }
                  />
                </div>
              </div>
            </Panel>
            <Separator className="sep-v" />
            <Panel minSize="20%">
              <div className="pane">
                <div className="pane-header">
                  <span className="title">{diffTitle}</span>
                  <span className="spacer" />
                  {selectedFile && view.mode !== 'worktree' && (
                    <button onClick={() => setSelectedFile(null)}>Show Whole Diff</button>
                  )}
                </div>
                <DiffPane
                  patch={diff?.patch ?? ''}
                  notice={diff?.notice}
                  placeholder={
                    view.mode === 'worktree'
                      ? 'Select a file to see its diff.'
                      : 'No textual changes.'
                  }
                />
              </div>
            </Panel>
          </Group>
        </Panel>

        <Separator className="sep-h" />

        <Panel minSize="20%">
          <Group orientation="horizontal" id="bottom">
            <Panel defaultSize="58%" minSize="20%">
              <div className="pane">
                <div className="pane-header">
                  <span className="title">Commits</span>
                  {compareCommit && <span className="badge">comparing 2 commits</span>}
                  <span className="spacer" />
                  <span className="hint">
                    ↑↓ move · Enter show · Ctrl+Click compare · Esc work tree
                  </span>
                </div>
                <LogPane
                  commits={commits}
                  selected={selectedCommit}
                  compare={compareCommit}
                  onSelect={onSelectCommit}
                  onEnter={(hash) => {
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
              <div className="pane">
                <div className="pane-header">
                  <span className="title">Terminal</span>
                  <span className="spacer" />
                  <span className="hint">{root}</span>
                </div>
                {root && <TerminalPane root={root} />}
              </div>
            </Panel>
          </Group>
        </Panel>
      </Group>

      <ContextMenu state={menu} onClose={() => setMenu(null)} />
    </div>
  )
}

/** Append newly fetched commits, skipping any we already hold. */
function mergeLog(prev: Commit[], next: Commit[]): Commit[] {
  const seen = new Set(prev.map((c) => c.hash))
  return [...prev, ...next.filter((c) => !seen.has(c.hash))]
}
