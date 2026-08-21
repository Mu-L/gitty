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

/**
 * One row of a file's history: the commit, and how long the file was once that
 * commit had landed. `lines` is null where the count cannot be derived — a
 * binary revision, or anything older than one.
 */
export interface FileHistoryEntry {
  commit: Commit
  lines: number | null
}

export interface CommitFile {
  path: string
  absPath: string
  status: FileStatusCode
  origPath?: string
}

/** Lines a change added and removed in one file. Binary files have neither. */
export interface FileChurn {
  added: number
  deleted: number
}

/** Which change the churn of a file list is measured against. */
export type ChurnSpec =
  | { kind: 'worktree' }
  | { kind: 'commit'; hash: string }
  | { kind: 'range'; from: string; to: string }

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

/** One source line from `git blame --line-porcelain`. */
export interface BlameLine {
  /** The commit that wrote the line; all zeros means uncommitted work-tree content. */
  sha: string
  author: string
  /** Unix timestamp of the commit that wrote the line. */
  time: number
  summary: string
  line: string
}

/** The sha a blame line that is not committed yet carries. */
export const UNCOMMITTED_SHA = '0'.repeat(40)

/**
 * What the commit filter box searches.
 *
 * `text` is the message and the author. The other two are git's pickaxe, and
 * they are not the same question: `content` (`-S`) finds the commits where the
 * *number of occurrences* of a string changed — where it was introduced or
 * removed — while `regex` (`-G`) finds every commit whose diff text matches,
 * including the ones that merely moved the line about.
 */
export type LogFilterMode = 'text' | 'content' | 'regex'

/** One line `git grep` matched, in the revision that was searched. */
export interface GrepHit {
  path: string
  /** 1-based line number, as git counts. */
  line: number
  text: string
}

/** A grep's hits, and whether the list stops short of everything git found. */
export interface GrepResult {
  hits: GrepHit[]
  /** True when the search was cut off at the ceiling; the count is what is here. */
  truncated: boolean
}

/** Which side of the index a working-tree diff should be read from. */
export type DiffSide = 'worktree' | 'index'

/** Putting part of a file into the index, or taking it back out. */
export type ApplyDirection = 'stage' | 'unstage'

/**
 * Which hunk of a file's diff to apply, and — when the user picked lines
 * rather than the whole thing — which of its lines. Both indices are into the
 * patch the main process fetches, which is the same one the pane drew: the
 * context setting travels with the request so the two cannot disagree.
 */
export interface HunkPick {
  hunk: number
  lines?: number[]
}

/**
 * How git is asked to compute a diff, rather than which diff is wanted — a
 * preference the renderer carries with every request, since the main process
 * holds no view state of its own.
 */
export interface DiffOptions {
  /** Lines of context around each hunk; git's own default is 3. */
  context: number
  /** `change` is git's -b (amount of space), `all` its -w. */
  ignoreWhitespace: 'none' | 'change' | 'all'
}

export const DEFAULT_DIFF_OPTIONS: DiffOptions = { context: 3, ignoreWhitespace: 'none' }

/** Which shell a terminal session starts, and how. */
export interface TerminalOptions {
  /** Empty means the system's own — $SHELL, or COMSPEC on Windows. */
  shell: string
  /** Start it as a login shell, so the user's profile is sourced. */
  login: boolean
}

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

/**
 * One entry of "browse working tree". `ignored` is what `.gitignore` says
 * about it — the file is listed either way, and the pane draws it differently.
 */
export interface WorktreeFile {
  path: string
  ignored: boolean
  /** The executable bit is set on disk, so the file tree can offer to run it. */
  exec: boolean
}

/**
 * One entry of a commit's tree listing. `exec` is git's own record of the mode
 * — `100755` rather than `100644` — which is what "this file was a program at
 * that revision" means; nothing on disk is consulted for it.
 */
export interface SnapshotEntry {
  path: string
  exec: boolean
}

/**
 * How large a commit's tree may be before Gitty refuses to check it out for
 * **Run in the Terminal**. A repository that carries its binaries, its
 * datasets or its vendored dependencies would otherwise write gigabytes into
 * the temp directory on a right-click, and the point of the item is to run a
 * script, not to clone the repository sideways. Both sides need the number —
 * main to enforce it, the renderer to say what the limit was.
 */
export const MAX_SNAPSHOT_EXPORT_BYTES = 256 * 1024 * 1024

/** The result of checking a snapshot out: its directory, or why there is none. */
export interface SnapshotExport {
  dir: string | null
  /** The tree is over `MAX_SNAPSHOT_EXPORT_BYTES`; nothing was written. */
  tooLarge: boolean
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

/** What the About dialog shows: version, author, home page and runtimes. */
export interface AboutInfo {
  readonly version: string
  readonly author: string
  /** The project's home page, opened in the system browser when clicked. */
  readonly github: string
  /** When the app was built, as an ISO timestamp; empty if unreadable. */
  readonly builtAt: string
  readonly electron: string
  readonly chromium: string
  readonly node: string
}

/**
 * Reading marks: the extra colour a language analyser puts on the prose of a
 * rendered markdown document. See `ref/spec/prose.md`.
 */

/** Which analyser finds the spans: local segmentation, or a configured model. */
export type ProseAnalyzer = 'jieba' | 'llm'

export const PROSE_ANALYZERS: readonly ProseAnalyzer[] = ['jieba', 'llm']

/**
 * What was found. `proper` is the catch-all among the proper nouns — one that
 * is none of the other three — and is what an analyser that cannot tell them
 * apart says. `latin` is not a proper noun at all: it is a run of latin
 * letters and digits inside CJK prose, which is a different thing to see and
 * so a different thing to paint.
 */
export type ProseKind = 'person' | 'place' | 'org' | 'proper' | 'latin'

export const PROSE_KINDS: readonly ProseKind[] = [
  'person',
  'place',
  'org',
  'proper',
  'latin'
]

/**
 * One marked range of a segment: half-open, in JavaScript string indices.
 * Spans never overlap and always arrive in ascending order.
 */
export interface ProseSpan {
  start: number
  end: number
  kind: ProseKind
}

/** How a line is drawn under a marked span; `none` leaves it undrawn. */
export type ProseUnderline = 'none' | 'solid' | 'dotted' | 'dashed' | 'double' | 'wavy'

export const PROSE_UNDERLINES: readonly ProseUnderline[] = [
  'none',
  'solid',
  'dotted',
  'dashed',
  'double',
  'wavy'
]

/**
 * What one kind looks like. Every field is validated before it reaches a
 * stylesheet — the values come from a file the reader writes, so there is no
 * "any CSS you like" field, on purpose.
 */
export interface ProseDecoration {
  underline: ProseUnderline
  /** `#rgb`, `#rrggbb` or `#rrggbbaa`; null leaves the text's own colour. */
  underlineColor: string | null
  color: string | null
  background: string | null
  bold: boolean
  italic: boolean
}

/** The reader's `prose-rules.json`, one decoration per kind. */
export type ProseRules = Record<ProseKind, ProseDecoration>

/** Underline in the accent blue, which is what a first run gets. */
const DEFAULT_MARK: ProseDecoration = {
  underline: 'solid',
  underlineColor: '#7aa2f7',
  color: null,
  background: null,
  bold: false,
  italic: false
}

export const DEFAULT_PROSE_RULES: ProseRules = {
  person: { ...DEFAULT_MARK },
  place: { ...DEFAULT_MARK },
  org: { ...DEFAULT_MARK },
  proper: { ...DEFAULT_MARK },
  // A colour rather than a line, so the two marks use different channels and
  // an English name inside a Chinese sentence can be both at once. The palette
  // here is the dark theme's; the file holds literal colours and knows nothing
  // about themes, so a reader on the light one edits it.
  latin: {
    underline: 'none',
    underlineColor: null,
    color: '#4fc3d0',
    background: null,
    bold: false,
    italic: false
  }
}

/** Where the two files live, for the settings pane to name and open. */
export interface ProseConfigPaths {
  rules: string
  models: string
}
