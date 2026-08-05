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

/** Which side of the index a working-tree diff should be read from. */
export type DiffSide = 'worktree' | 'index'

export interface DiffRequestWorking {
  kind: 'working'
  path: string
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

export interface PtyExit {
  exitCode: number
  signal?: number
}
