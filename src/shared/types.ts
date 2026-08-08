/** Types shared between the main process, the preload bridge and the renderer. */

/** Single-letter git status codes we surface in the UI. */
export type FileStatusCode = 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '?' | ' '

export interface WorkingFile {
  /** Repo-relative path, forward slashes. */
  path: string
  /** Absolute path on disk. */
  absPath: string
  /** Status in the index (staged side). */
  index: FileStatusCode
  /** Status in the work tree (unstaged side). */
  worktree: FileStatusCode
  /** Original path for renames/copies. */
  origPath?: string
  untracked: boolean
}

export interface RepoStatus {
  root: string
  branch: string
  upstream: string | null
  ahead: number
  behind: number
  files: WorkingFile[]
}

/** Outcome of a git command that talks to a remote (push, pull). */
export interface GitOpResult {
  ok: boolean
  /** What git said, stdout and stderr together — it reports progress on stderr. */
  output: string
}

/** A ref the commit log can be pointed at, local or remote-tracking. */
export interface Branch {
  /** Short name: "main", "origin/main". */
  name: string
  remote: boolean
  /** The checked-out branch — the one the work tree belongs to. */
  head: boolean
  /** Subject of the commit it points at, for the menu. */
  subject: string
  date: string
}

export interface Commit {
  hash: string
  short: string
  author: string
  email: string
  date: string
  subject: string
  /** Decorations such as "HEAD -> main, origin/main". */
  refs: string
  parents: string[]
}

export interface CommitFile {
  path: string
  absPath: string
  status: FileStatusCode
  origPath?: string
}

export interface CommitDetail {
  commit: Commit
  body: string
  files: CommitFile[]
}

/** A commit's author, date and full message — for showing a commit, not its files. */
export interface CommitMeta {
  author: string
  email: string
  date: string
  subject: string
  body: string
}

/** Which side of the index a working-tree diff should be read from. */
export type DiffSide = 'worktree' | 'index'

export interface DiffRequestWorking {
  kind: 'working'
  /** Omit for every uncommitted change at once. */
  path?: string
  side: DiffSide
  untracked: boolean
}

export interface DiffRequestCommit {
  kind: 'commit'
  hash: string
  /** Omit for the whole commit. */
  path?: string
}

export interface DiffRequestRange {
  kind: 'range'
  from: string
  to: string
  path?: string
}

export type DiffRequest = DiffRequestWorking | DiffRequestCommit | DiffRequestRange

export interface DiffResult {
  /** Raw unified diff text, may be empty. */
  patch: string
  /** Human-readable title for the diff pane header. */
  title: string
  /** Set when the diff was skipped because it is binary or too large. */
  notice?: string
}

/** A single file's contents at a commit, for read-only snapshot browsing. */
export interface SnapshotFileContent {
  content: string
  /** True when the file is binary or too large to display; content is empty. */
  binary: boolean
}

/**
 * One image file, inlined for the preview. A data: URL rather than a path
 * because the renderer cannot read the disk, and a revision's bytes were never
 * on it in the first place.
 */
export interface ImageFileContent {
  /** null when the image is too large to inline or cannot be read. */
  dataUrl: string | null
  /** Why there is no image, when there is none. */
  notice: string | null
  /** Size of the file on disk, for the caption. */
  bytes: number
}

/** One shell's exit, delivered alongside the session id it came from. */
export interface PtyExit {
  exitCode: number
  signal?: number
}

/** A repository watcher fired; tells the renderer which repo changed. */
export interface RepoChanged {
  root: string
}

/**
 * A URL the local web server serves for a repository or commit, or null when
 * the server is not running or the repo is not open.
 */
export type WebUrl = string | null
