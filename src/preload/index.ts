import os from 'node:os'
import { contextBridge, ipcRenderer } from 'electron'
import type {
  AboutInfo,
  ApplyDirection,
  BlameLine,
  Branch,
  ChurnSpec,
  Commit,
  CommitDetail,
  CommitFile,
  CommitMeta,
  DiffOptions,
  DiffRequest,
  DiffResult,
  FileChurn,
  GitOpResult,
  GrepResult,
  HunkPick,
  ImageFileContent,
  LogFilterMode,
  PtyExit,
  RepoChanged,
  RepoStatus,
  SnapshotFileContent,
  TerminalOptions,
  WebUrl
} from '../shared/types'

const api = {
  /** Used to shorten paths for display. */
  homeDir: os.homedir(),
  /** The app icon as a data URL, for the title bar; null when unavailable. */
  appIcon: (): Promise<string | null> => ipcRenderer.invoke('app:icon'),
  /** Facts for the About dialog: version, author, home page, build time. */
  about: (): Promise<AboutInfo> => ipcRenderer.invoke('app:about'),
  repo: {
    initial: (): Promise<string> => ipcRenderer.invoke('repo:initial'),
    resolve: (cwd: string): Promise<string | null> => ipcRenderer.invoke('repo:resolve', cwd),
    pick: (): Promise<string | null> => ipcRenderer.invoke('repo:pick'),
    watch: (root: string): Promise<boolean> => ipcRenderer.invoke('repo:watch', root),
    close: (root: string): Promise<boolean> => ipcRenderer.invoke('repo:close', root),
    /** Repositories opened before, most recent first. */
    recent: (): Promise<string[]> => ipcRenderer.invoke('recent:list'),
    remember: (root: string): Promise<string[]> => ipcRenderer.invoke('recent:add', root),
    forget: (root: string): Promise<string[]> => ipcRenderer.invoke('recent:remove', root),
    forgetAll: (): Promise<void> => ipcRenderer.invoke('recent:clear'),
    onChanged: (cb: (changed: RepoChanged) => void): (() => void) => {
      const h = (_e: unknown, changed: RepoChanged): void => cb(changed)
      ipcRenderer.on('repo:changed', h)
      return () => ipcRenderer.removeListener('repo:changed', h)
    },
    /** Fired by the File ▸ Open Repository menu item. */
    onMenuOpen: (cb: () => void): (() => void) => {
      const h = (): void => cb()
      ipcRenderer.on('menu:open-repo', h)
      return () => ipcRenderer.removeListener('menu:open-repo', h)
    },
    /** Fired by the File ▸ Settings item and the Cmd/Ctrl+, accelerator. */
    onMenuSettings: (cb: () => void): (() => void) => {
      const h = (): void => cb()
      ipcRenderer.on('menu:open-settings', h)
      return () => ipcRenderer.removeListener('menu:open-settings', h)
    }
  },
  git: {
    status: (root: string): Promise<RepoStatus> => ipcRenderer.invoke('git:status', root),
    /** `ref` points the log at another branch; null or omitted means HEAD.
     *  `filter` narrows it when non-empty — by message and author, or through
     *  the pickaxe over the diffs themselves, depending on `mode`. */
    log: (
      root: string,
      limit: number,
      skip = 0,
      ref: string | null = null,
      filter = '',
      mode: LogFilterMode = 'text'
    ): Promise<Commit[]> => ipcRenderer.invoke('git:log', root, limit, skip, ref, filter, mode),
    branches: (root: string): Promise<Branch[]> => ipcRenderer.invoke('git:branches', root),
    /** Push the checked-out branch; `branch` is named only to set an upstream. */
    push: (root: string, branch: string | null = null): Promise<GitOpResult> =>
      ipcRenderer.invoke('git:push', root, branch),
    pull: (root: string): Promise<GitOpResult> => ipcRenderer.invoke('git:pull', root),
    commitDetail: (root: string, hash: string): Promise<CommitDetail> =>
      ipcRenderer.invoke('git:commitDetail', root, hash),
    commitMeta: (root: string, hash: string): Promise<CommitMeta> =>
      ipcRenderer.invoke('git:commitMeta', root, hash),
    /** Which commit last touched each line. `rev` null blames the work tree. */
    blame: (root: string, rev: string | null, filePath: string): Promise<BlameLine[]> =>
      ipcRenderer.invoke('git:blame', root, rev, filePath),
    /** Every commit that touched this file, newest first, following renames. */
    fileHistory: (root: string, rev: string | null, filePath: string): Promise<Commit[]> =>
      ipcRenderer.invoke('git:fileHistory', root, rev, filePath),
    /** How a range of lines got this way: `git log -L`, raw, headers and all. */
    lineHistory: (
      root: string,
      rev: string | null,
      filePath: string,
      start: number,
      end: number
    ): Promise<string> =>
      ipcRenderer.invoke('git:lineHistory', root, rev, filePath, start, end),
    /** Search the work tree, or a revision when one is named. */
    grep: (root: string, pattern: string, rev: string | null): Promise<GrepResult> =>
      ipcRenderer.invoke('git:grep', root, pattern, rev),
    rangeFiles: (root: string, from: string, to: string): Promise<CommitFile[]> =>
      ipcRenderer.invoke('git:rangeFiles', root, from, to),
    diff: (root: string, req: DiffRequest, opts: DiffOptions): Promise<DiffResult> =>
      ipcRenderer.invoke('git:diff', root, req, opts),
    /** Put a whole file into the index. */
    stageFile: (root: string, filePath: string): Promise<GitOpResult> =>
      ipcRenderer.invoke('git:stageFile', root, filePath),
    /** Take a whole file back out of the index; the work tree is untouched. */
    unstageFile: (root: string, filePath: string): Promise<GitOpResult> =>
      ipcRenderer.invoke('git:unstageFile', root, filePath),
    /** Throw away a tracked file's uncommitted changes, after a native
     *  confirmation. Null when the confirmation was declined. No undo. */
    discardFile: (root: string, filePath: string): Promise<GitOpResult | null> =>
      ipcRenderer.invoke('git:discardFile', root, filePath),
    /** The whole index as a patch, for handing to something outside Gitty. */
    stagedDiff: (root: string): Promise<string> => ipcRenderer.invoke('git:stagedDiff', root),
    /** Stage or unstage picked hunks and lines of one file. `opts` must be the
     *  options the pane drew the diff with, or the hunks would not line up. */
    applyHunks: (
      root: string,
      filePath: string,
      picks: HunkPick[],
      direction: ApplyDirection,
      opts: DiffOptions
    ): Promise<GitOpResult> =>
      ipcRenderer.invoke('git:applyHunks', root, filePath, picks, direction, opts),
    snapshotFiles: (root: string, hash: string): Promise<string[]> =>
      ipcRenderer.invoke('git:snapshotFiles', root, hash),
    /** Every file on disk now — tracked and untracked — for browsing the work tree. */
    worktreeFiles: (root: string): Promise<string[]> =>
      ipcRenderer.invoke('git:worktreeFiles', root),
    snapshotFile: (root: string, hash: string, filePath: string): Promise<SnapshotFileContent> =>
      ipcRenderer.invoke('git:snapshotFile', root, hash, filePath),
    snapshotOpen: (root: string, hash: string, filePath: string): Promise<string | null> =>
      ipcRenderer.invoke('git:snapshotOpen', root, hash, filePath),
    readWorking: (root: string, filePath: string): Promise<SnapshotFileContent> =>
      ipcRenderer.invoke('git:readWorking', root, filePath),
    readImage: (root: string, rev: string | null, filePath: string): Promise<ImageFileContent> =>
      ipcRenderer.invoke('git:readImage', root, rev, filePath),
    /** Count lines for a batch of files; returns counts in the same order. */
    fileLines: (
      root: string,
      pairs: Array<{ rev: string | null; filePath: string }>
    ): Promise<Array<number | null>> => ipcRenderer.invoke('git:fileLines', root, pairs),
    /** Lines added and removed per path, for one commit, range or the work tree. */
    fileChurn: (
      root: string,
      spec: ChurnSpec,
      opts: DiffOptions
    ): Promise<Record<string, FileChurn>> => ipcRenderer.invoke('git:fileChurn', root, spec, opts)
  },
  file: {
    open: (abs: string): Promise<string | null> => ipcRenderer.invoke('file:open', abs),
    reveal: (abs: string): Promise<void> => ipcRenderer.invoke('file:reveal', abs),
    openExternal: (url: string): Promise<void> => ipcRenderer.invoke('file:openExternal', url),
    /** Send a work-tree file to the trash, after a native confirmation.
     *  Resolves true only when it is gone; the watcher refreshes the panes. */
    trash: (root: string, filePath: string): Promise<boolean> =>
      ipcRenderer.invoke('file:trash', root, filePath)
  },
  /** gource, when it is installed: an animation of the repository's history.
   *  It draws its own window; `play` resolves once it is up, or with what it
   *  said if it died on the spot. */
  gource: {
    available: (): Promise<boolean> => ipcRenderer.invoke('gource:available'),
    play: (root: string): Promise<GitOpResult> => ipcRenderer.invoke('gource:play', root)
  },
  /** The local web server that renders commits for the browser. */
  web: {
    repoUrl: (root: string): Promise<WebUrl> => ipcRenderer.invoke('web:repoUrl', root),
    commitUrl: (root: string, hash: string): Promise<WebUrl> =>
      ipcRenderer.invoke('web:commitUrl', root, hash)
  },
  /** The shells this machine offers, for the settings list. */
  shells: (): Promise<string[]> => ipcRenderer.invoke('settings:shells'),
  clipboard: {
    write: (text: string): Promise<void> => ipcRenderer.invoke('clipboard:write', text)
  },
  /** Settings that live in the main process. */
  settings: {
    /** Switch the application menu and all UI text to `locale`. */
    setLocale: (locale: string): void => ipcRenderer.send('settings:setLocale', locale)
  },
  // Several shells can be alive at once — the pane splits — so every call and
  // every event names the session it belongs to.
  terminal: {
    start: (
      id: string,
      root: string,
      cols: number,
      rows: number,
      opts: TerminalOptions
    ): Promise<boolean> => ipcRenderer.invoke('terminal:start', id, root, cols, rows, opts),
    input: (id: string, data: string): void => ipcRenderer.send('terminal:input', id, data),
    resize: (id: string, cols: number, rows: number): void =>
      ipcRenderer.send('terminal:resize', id, cols, rows),
    close: (id: string): void => ipcRenderer.send('terminal:close', id),
    onData: (cb: (id: string, data: string) => void): (() => void) => {
      const h = (_e: unknown, id: string, data: string): void => cb(id, data)
      ipcRenderer.on('terminal:data', h)
      return () => ipcRenderer.removeListener('terminal:data', h)
    },
    onExit: (cb: (id: string, info: PtyExit) => void): (() => void) => {
      const h = (_e: unknown, id: string, info: PtyExit): void => cb(id, info)
      ipcRenderer.on('terminal:exit', h)
      return () => ipcRenderer.removeListener('terminal:exit', h)
    }
  }
}

export type GittyApi = typeof api

contextBridge.exposeInMainWorld('gitty', api)
