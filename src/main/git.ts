import fs from 'node:fs'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import type {
  BlameLine,
  Branch,
  Commit,
  CommitDetail,
  ChurnSpec,
  CommitFile,
  CommitMeta,
  FileChurn,
  FileHistoryEntry,
  DiffOptions,
  DiffRequest,
  DiffResult,
  GitOpResult,
  GrepResult,
  ImageFileContent,
  LogFilterMode,
  RepoStatus,
  SnapshotEntry,
  SnapshotExport,
  SnapshotFileContent,
  WorktreeFile
} from '../shared/types'
import { DEFAULT_DIFF_OPTIONS, MAX_SNAPSHOT_EXPORT_BYTES } from '../shared/types'
import {
  parseBlame,
  parseBranches,
  parseLog,
  parseCommitNumstat,
  parseNameStatus,
  parseGrep,
  parseNumstat,
  parseStatus,
  RS,
  US
} from './parse'
import { buildPatch, parseFilePatch, type ApplyDirection, type HunkPick } from './patch'
import { commitUrlBase } from './remote'
import { grepExpr, grepPathspecs, parseQuery } from '../shared/query'
import { msg } from './messages'

const exec = promisify(execFile)

/** Diffs larger than this are not sent to the renderer; it would just lock up the pane. */
const MAX_PATCH_BYTES = 2 * 1024 * 1024

/** How many bytes to read when counting lines; skip files larger than this. */
const MAX_LINE_COUNT_BYTES = 8 * 1024 * 1024

/** Untracked files inlined into the whole-work-tree diff before giving up. */
const MAX_UNTRACKED_IN_DIFF = 50

async function git(cwd: string, args: string[]): Promise<string> {
  const { stdout } = await exec('git', args, {
    cwd,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
  })
  return stdout
}

/** Resolve the repository root for any path inside a work tree. */
export async function resolveRepo(cwd: string): Promise<string> {
  const out = await git(cwd, ['rev-parse', '--show-toplevel'])
  return out.trim()
}

export async function status(root: string): Promise<RepoStatus> {
  const raw = await git(root, [
    'status',
    '--porcelain=v2',
    '-z',
    '--branch',
    '--untracked-files=all'
  ])
  const p = parseStatus(raw)
  return {
    root,
    branch: p.branch,
    upstream: p.upstream,
    ahead: p.ahead,
    behind: p.behind,
    files: p.files.map((f) => ({ ...f, absPath: path.join(root, f.path) }))
  }
}

/**
 * Every local and remote-tracking branch, newest commit first. `origin/HEAD`
 * and friends are symbolic refs pointing at a branch that is already listed,
 * so they are dropped rather than shown twice.
 */
export async function branches(root: string): Promise<Branch[]> {
  const fmt =
    ['%(refname)', '%(refname:short)', '%(HEAD)', '%(committerdate:iso-strict)', '%(subject)'].join(
      US
    ) + RS
  let raw: string
  try {
    raw = await git(root, [
      'for-each-ref',
      `--format=${fmt}`,
      '--sort=-committerdate',
      'refs/heads',
      'refs/remotes'
    ])
  } catch {
    return []
  }
  return parseBranches(raw)
}

/**
 * Where this repository's commits can be read on the web, as a prefix a hash
 * is appended to — or null when there is no remote, or its host is not one
 * whose page layout we can infer (see `remote.ts`).
 *
 * The remote is whichever one the current branch tracks, else `origin`, else
 * the first one configured: the same order a reader would use when asking
 * "where does this repository live".
 */
export async function remoteCommitBase(root: string): Promise<string | null> {
  let names: string[]
  try {
    names = (await git(root, ['remote'])).split('\n').map((n) => n.trim()).filter(Boolean)
  } catch {
    return null
  }
  if (names.length === 0) return null
  let tracked = ''
  try {
    const branch = (await git(root, ['symbolic-ref', '--short', 'HEAD'])).trim()
    tracked = (await git(root, ['config', '--get', `branch.${branch}.remote`])).trim()
  } catch {
    // Detached HEAD, or a branch with no upstream: fall through to origin.
  }
  const name = names.includes(tracked) ? tracked : names.includes('origin') ? 'origin' : names[0]
  try {
    return commitUrlBase((await git(root, ['remote', 'get-url', name])).trim())
  } catch {
    return null
  }
}

/**
 * A `git log` that can be abandoned.
 *
 * Pickaxe searches walk the whole history and open every diff on the way, so
 * on a large repository they take seconds — long enough that the reader has
 * typed another character. Each root keeps at most one of these in flight and
 * the previous one is killed, rather than left to finish a query nobody is
 * waiting for. A killed search resolves empty; the call that killed it is the
 * one that will answer.
 */
const searches = new Map<string, ReturnType<typeof execFile>>()

/**
 * `kind` keeps the two kinds of search out of each other's way: a grep must not
 * cancel the log the pane is waiting for, and the log must not cancel a grep.
 */
function searchLog(root: string, args: string[], kind = 'log'): Promise<string> {
  const key = `${kind}:${root}`
  searches.get(key)?.kill()
  return new Promise((resolve) => {
    const child = execFile(
      'git',
      args,
      {
        cwd: root,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
      },
      (err, stdout) => {
        if (searches.get(key) === child) searches.delete(key)
        resolve(err ? '' : stdout)
      }
    )
    searches.set(key, child)
  })
}

/**
 * `ref` points the log at another branch; undefined means HEAD. `filter`, when
 * set, narrows it — by message and author, or through git's pickaxe over the
 * diffs themselves, depending on `mode`.
 *
 * Every part of the query is an argument in the array, never text spliced into
 * a command line: a regular expression is made almost entirely of characters a
 * shell would take for itself.
 */
export async function log(
  root: string,
  limit: number,
  skip = 0,
  ref?: string | null,
  filter?: string,
  mode: LogFilterMode = 'text',
  all = false
): Promise<Commit[]> {
  const fmt = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%D', '%P'].join(US) + RS
  // Every branch at once, which is how two branches can be seen relating to
  // each other; it replaces a named ref rather than narrowing it. Date order
  // rather than git's default topological-ish ordering, so the rows read as a
  // timeline and the lanes stay narrow.
  const scope = all ? ['--all', '--date-order'] : ref ? [ref] : []
  let raw: string
  try {
    if (filter && mode !== 'text') {
      // The pickaxe pages like an ordinary log, so no union pass is needed —
      // only the patience to let it run, and the ability to give up on it.
      raw = await searchLog(root, [
        'log',
        `--max-count=${limit}`,
        `--skip=${skip}`,
        `--pretty=format:${fmt}`,
        mode === 'content' ? `-S${filter}` : `-G${filter}`,
        ...scope,
        '--'
      ])
    } else if (filter) {
      // A filter is a union of two greps: one over the message, one over the
      // author. git ANDs --grep with --author, so a single command cannot
      // express the OR — hence a rev-list pass per side, merged by hash, then
      // one --no-walk pass (date-ordered) to shape and page the result.
      const base = scope
      const byMsg = await git(root, [
        'log',
        '--format=%H',
        '--regexp-ignore-case',
        `--grep=${filter}`,
        ...base,
        '--'
      ]).catch(() => '')
      const byAuthor = await git(root, [
        'log',
        '--format=%H',
        '--regexp-ignore-case',
        `--author=${filter}`,
        ...base,
        '--'
      ]).catch(() => '')
      const union = [
        ...new Set([
          ...byMsg.trim().split('\n').filter(Boolean),
          ...byAuthor.trim().split('\n').filter(Boolean)
        ])
      ]
      const paged = union.slice(skip, skip + limit)
      if (paged.length === 0) return []
      raw = await git(root, [
        'log',
        '--no-walk',
        '--date-order',
        `--pretty=format:${fmt}`,
        ...paged,
        '--'
      ])
    } else {
      raw = await git(root, [
        'log',
        `--max-count=${limit}`,
        `--skip=${skip}`,
        `--pretty=format:${fmt}`,
        ...scope,
        // Nothing after this is a path, so a branch cannot be read as one.
        '--'
      ])
    }
  } catch {
    return [] // fresh repo with no commits yet
  }
  return parseLog(raw)
}

/**
 * Which commit last touched each line of a file. A null `rev` blames the work
 * tree — lines not committed yet come back with an all-zero sha.
 */
export async function blame(
  root: string,
  rev: string | null,
  filePath: string
): Promise<BlameLine[]> {
  const args = ['blame', '--line-porcelain']
  // The `--` keeps the path from being read as a revision when it is empty
  // or shadows a ref name.
  if (rev) args.push(rev)
  args.push('--', filePath)
  const raw = await git(root, args)
  return parseBlame(raw)
}

/**
 * Every commit that touched this file, newest first, following renames, each
 * with the file's length at that point.
 */
export async function fileHistory(
  root: string,
  rev: string | null,
  filePath: string
): Promise<FileHistoryEntry[]> {
  const fmt = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%D', '%P'].join(US) + RS
  const args = ['log', '--follow', `--pretty=format:${fmt}`]
  if (rev) args.push(rev)
  args.push('--', filePath)
  const [raw, churnRaw] = await Promise.all([
    git(root, args),
    git(root, [
      'log',
      '--follow',
      '--format=%H',
      '--numstat',
      '-z',
      ...(rev ? [rev] : []),
      '--',
      filePath
    ])
  ])
  return withLineCounts(root, filePath, parseLog(raw), parseCommitNumstat(churnRaw))
}

/**
 * How long the file was at each of its commits. Reading every revision would be
 * one `git show` per row, so only the newest is counted and the rest are walked
 * backwards through the churn: what the file was before a commit is what it was
 * after it, less the lines that commit added, plus the ones it deleted. Only
 * this direction works — the newest name is the one the caller asked about,
 * while an older one may have been renamed since. A revision whose churn is not
 * in lines ends the walk: nothing older than a binary revision can be derived.
 */
async function withLineCounts(
  root: string,
  filePath: string,
  commits: Commit[],
  churn: Map<string, FileChurn | null>
): Promise<FileHistoryEntry[]> {
  if (commits.length === 0) return []
  // Nothing newer touched the file, so at its newest commit it still goes by
  // the name that was asked for.
  const [head] = await countFileLines(root, [{ rev: commits[0].hash, filePath }])
  let lines = head
  return commits.map((commit) => {
    const entry = { commit, lines }
    const c = churn.get(commit.hash)
    // A merge git kept in the history has no numstat of its own; it changed
    // nothing about this file, so the count carries over untouched.
    if (lines !== null && c !== undefined) {
      lines = c === null ? null : lines - c.added + c.deleted
      if (lines !== null && lines < 0) lines = null // the walk lost the thread
    }
    return entry
  })
}

/** Files touched by a commit, plus its message body. */
export async function commitDetail(root: string, hash: string): Promise<CommitDetail> {
  const [meta, body, files] = await Promise.all([
    one(root, hash),
    git(root, ['show', '-s', '--format=%b', hash]).then((s) => s.trimEnd()),
    nameStatus(root, ['show', '--name-status', '-z', '--format=', hash])
  ])
  return { commit: meta, body, files: files.map((f) => ({ ...f, absPath: path.join(root, f.path) })) }
}

/** A commit's author, date and full message, without touching its files. */
export async function commitMeta(root: string, hash: string): Promise<CommitMeta> {
  const fmt = ['%an', '%ae', '%aI', '%s', '%b'].join(US) + RS
  const raw = await git(root, ['show', '-s', `--format=${fmt}`, hash])
  const [author, email, date, subject, ...bodyParts] = raw.trimEnd().split(US)
  return { author, email, date, subject, body: bodyParts.join(US).trimEnd() }
}

async function one(root: string, hash: string): Promise<Commit> {
  const fmt = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%D', '%P'].join(US)
  const rec = await git(root, ['show', '-s', `--format=${fmt}`, hash])
  const [h, short, author, email, date, subject, refs, parents] = rec.trimEnd().split(US)
  return {
    hash: h,
    short,
    author,
    email,
    date,
    subject,
    refs: refs ?? '',
    parents: (parents ?? '').split(' ').filter(Boolean)
  }
}

/**
 * How one range of lines got to be the way it is: `git log -L a,b:file`, whose
 * output is a commit header and that range's diff, repeated back through the
 * history. Returned raw — the renderer draws it — because git formats it as a
 * log and a patch together and re-deriving one from the other would only lose
 * the connection between them.
 *
 * `-L` cannot be combined with `--follow`, and does not need to be: it tracks
 * the range across renames by itself.
 */
export async function lineHistory(
  root: string,
  rev: string | null,
  filePath: string,
  start: number,
  end: number
): Promise<string> {
  const a = Math.max(1, Math.floor(start))
  const b = Math.max(a, Math.floor(end))
  const args = ['log', '--no-color', `-L${a},${b}:${filePath}`]
  if (rev) args.push(rev)
  try {
    return await git(root, args)
  } catch (e) {
    const err = e as { stderr?: string; message?: string }
    return err.stderr || err.message || ''
  }
}

/** Above this many hits the search stops and says so, like an oversized diff. */
const MAX_GREP_HITS = 2000

/**
 * Search the repository's contents. With no revision it searches the work tree
 * — what is on disk, uncommitted work included — and with one it searches that
 * revision, so a grep started while browsing a commit answers about the commit
 * rather than about today.
 *
 * What was typed is a query rather than a bare pattern (`query.ts`), so the
 * terms and the path limits come out separated here. Every term is one
 * argument, never spliced into a command line, and `-e` keeps a term that
 * begins with a dash from being read as an option.
 *
 * A query with nothing to look *for* — `in:*.py` on its own — searches
 * nothing: `git grep` needs a pattern, and "every line of every Python file"
 * is not what the box was asked for.
 */
export async function grep(
  root: string,
  pattern: string,
  rev: string | null
): Promise<GrepResult> {
  if (!pattern) return { hits: [], truncated: false }
  const query = parseQuery(pattern)
  if (query.include.length === 0) return { hits: [], truncated: false }
  const args = ['grep', '-n', '-z', '-I', '--no-color', ...grepExpr(query)]
  if (rev) args.push(rev)
  args.push('--', ...grepPathspecs(query))
  let raw: string
  try {
    raw = await searchLog(root, args, 'grep')
  } catch {
    // git grep exits 1 when nothing matched, which is not an error here.
    return { hits: [], truncated: false }
  }
  const all = parseGrep(raw, rev)
  return { hits: all.slice(0, MAX_GREP_HITS), truncated: all.length > MAX_GREP_HITS }
}

/** Files changed between two commits. */
export async function rangeFiles(
  root: string,
  from: string,
  to: string
): Promise<CommitFile[]> {
  const files = await nameStatus(root, ['diff', '--name-status', '-z', `${from}..${to}`])
  return files.map((f) => ({ ...f, absPath: path.join(root, f.path) }))
}

/**
 * Lines added and removed per file, for the same change the file list shows.
 * Keyed by path; a file missing from the map has no countable churn (binary,
 * or a merge commit, whose combined diff `--numstat` reports nothing for).
 */
export async function fileChurn(
  root: string,
  spec: ChurnSpec,
  opts: DiffOptions = DEFAULT_DIFF_OPTIONS
): Promise<Record<string, FileChurn>> {
  // Whitespace is ignored here too when the diff ignores it, or the file list
  // would count lines the diff beside it then refuses to show. Context lines
  // do not enter into a --numstat count.
  const ws = diffFlags(opts).filter((f) => f.startsWith('--ignore'))
  const args =
    spec.kind === 'commit'
      ? ['show', '--numstat', '-z', '--format=', ...ws, spec.hash]
      : spec.kind === 'range'
        ? ['diff', '--numstat', '-z', ...ws, `${spec.from}..${spec.to}`]
        : // Staged and unstaged together, which is what the Changes list shows.
          ['diff', '--numstat', '-z', ...ws, 'HEAD']
  try {
    return Object.fromEntries(parseNumstat(await git(root, args)))
  } catch {
    // An empty repository has no HEAD to diff against; churn is simply unknown.
    return {}
  }
}

/** Shared `--name-status -z` reader; rename entries carry two path fields. */
async function nameStatus(
  root: string,
  args: string[]
): Promise<Array<Omit<CommitFile, 'absPath'>>> {
  const raw = await git(root, args)
  return parseNameStatus(raw)
}

function clip(patch: string, title: string): DiffResult {
  if (Buffer.byteLength(patch) > MAX_PATCH_BYTES) {
    return {
      patch: patch.slice(0, MAX_PATCH_BYTES),
      title,
      notice: msg.git.diffTruncated
    }
  }
  return { patch, title }
}

/**
 * The renderer's diff preferences as git flags. The context count is clamped
 * here rather than trusted: it arrives over IPC, and a huge -U on a large
 * repository is a way to make git chew for minutes.
 */
function diffFlags(o: DiffOptions): string[] {
  const flags = [`-U${Math.min(100, Math.max(0, Math.round(o.context)))}`]
  if (o.ignoreWhitespace === 'change') flags.push('--ignore-space-change')
  else if (o.ignoreWhitespace === 'all') flags.push('--ignore-all-space')
  return flags
}

export async function diff(
  root: string,
  req: DiffRequest,
  opts: DiffOptions = DEFAULT_DIFF_OPTIONS
): Promise<DiffResult> {
  const common = ['--no-color', '--no-ext-diff', ...diffFlags(opts)]

  if (req.kind === 'working') {
    if (!req.path) {
      // Everything uncommitted at once. Against HEAD rather than the index, so
      // one diff covers both staged and unstaged work.
      const tracked = await git(root, ['diff', ...common, 'HEAD']).catch(() =>
        // A repository without commits yet has no HEAD to diff against.
        git(root, ['diff', ...common, '--cached'])
      )
      // Untracked files have no blob for git to diff, so each is compared
      // against the empty file — otherwise "every change" would silently omit
      // exactly the files the status column marks as new.
      const untracked = (await status(root)).files.filter((f) => f.untracked)
      const shown = untracked.slice(0, MAX_UNTRACKED_IN_DIFF)
      const parts = [tracked]
      for (const f of shown) {
        const one = await git(root, [
          'diff',
          ...common,
          '--no-index',
          '--',
          '/dev/null',
          f.path
        ]).catch((e: { stdout?: string }) => e.stdout ?? '')
        if (one) parts.push(one)
      }
      const result = clip(parts.filter(Boolean).join(''), msg.git.workingTree)
      const omitted = untracked.length - shown.length
      if (omitted > 0) {
        result.notice = [result.notice, msg.git.untrackedOmitted(omitted)]
          .filter(Boolean)
          .join(' ')
      }
      return result
    }
    if (req.untracked) {
      // Untracked files have no index entry; compare against the empty tree.
      const patch = await git(root, [
        'diff',
        ...common,
        '--no-index',
        '--',
        '/dev/null',
        req.path
      ]).catch((e: { stdout?: string }) => e.stdout ?? '')
      return clip(patch, `${req.path} (${msg.git.untrackedLabel})`)
    }
    const args = ['diff', ...common]
    if (req.side === 'index') args.push('--cached')
    args.push('--', req.path)
    const patch = await git(root, args)
    return clip(
      patch,
      `${req.path} (${req.side === 'index' ? msg.git.stagedLabel : msg.git.unstagedLabel})`
    )
  }

  if (req.kind === 'commit') {
    const args = ['show', ...common, '--format=', req.hash]
    if (req.path) args.push('--', req.path)
    const patch = await git(root, args)
    return clip(patch, req.path ? `${req.path} @ ${req.hash.slice(0, 8)}` : req.hash.slice(0, 8))
  }

  const args = ['diff', ...common, `${req.from}..${req.to}`]
  if (req.path) args.push('--', req.path)
  const patch = await git(root, args)
  const label = `${req.from.slice(0, 8)}..${req.to.slice(0, 8)}`
  return clip(patch, req.path ? `${req.path} @ ${label}` : label)
}

/** File contents at a revision, used by the diff pane for added/removed files. */
export async function showFile(root: string, rev: string, filePath: string): Promise<string> {
  return git(root, ['show', `${rev}:${filePath}`])
}

/**
 * Contents of a file in the work tree, for previewing what is on disk rather
 * than what is committed. Shares the snapshot result shape.
 */
export async function readWorkingFile(
  root: string,
  filePath: string
): Promise<SnapshotFileContent> {
  const abs = path.resolve(root, filePath)
  // Never read outside the repository, whatever the renderer asks for.
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    throw new Error(msg.git.pathEscapesRepo)
  }
  const stat = await fs.promises.stat(abs)
  if (stat.size > MAX_PATCH_BYTES) return { content: '', binary: true }
  const content = await fs.promises.readFile(abs, 'utf8')
  return content.includes('\0') ? { content: '', binary: true } : { content, binary: false }
}

/**
 * Images travel to the renderer as base64 inside a data: URL, which costs a
 * third more than the file — hence a limit of its own, larger than the diff
 * one (photographs in a repository are routinely past 2 MB) but still bounded.
 */
const MAX_IMAGE_BYTES = 12 * 1024 * 1024

/** Extensions a `<img>` can render. Anything else stays a binary file. */
const IMAGE_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  // SVG is text, but showing its markup is not what "preview" means for it.
  '.svg': 'image/svg+xml'
}

export function imageMime(filePath: string): string | null {
  return IMAGE_MIME[path.extname(filePath).toLowerCase()] ?? null
}

/** `git show` returning raw bytes — a file's contents are not always text. */
async function gitBytes(cwd: string, args: string[]): Promise<Buffer> {
  const { stdout } = await exec('git', args, {
    cwd,
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
    encoding: 'buffer',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
  })
  return stdout as unknown as Buffer
}

/**
 * One image's bytes as a data: URL — from the work tree when `rev` is null,
 * from that revision otherwise.
 */
export async function readImageFile(
  root: string,
  rev: string | null,
  filePath: string
): Promise<ImageFileContent> {
  const mime = imageMime(filePath)
  if (!mime) return { dataUrl: null, notice: msg.git.notAnImage, bytes: 0 }

  let buf: Buffer
  if (rev === null) {
    const abs = path.resolve(root, filePath)
    // Never read outside the repository, whatever the renderer asks for.
    if (abs !== root && !abs.startsWith(root + path.sep)) {
      throw new Error(msg.git.pathEscapesRepo)
    }
    const stat = await fs.promises.stat(abs)
    if (stat.size > MAX_IMAGE_BYTES) {
      return { dataUrl: null, notice: msg.git.imageTooLarge, bytes: stat.size }
    }
    buf = await fs.promises.readFile(abs)
  } else {
    buf = await gitBytes(root, ['show', `${rev}:${filePath}`])
    if (buf.length > MAX_IMAGE_BYTES) {
      return { dataUrl: null, notice: msg.git.imageTooLarge, bytes: buf.length }
    }
  }

  return {
    dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
    notice: null,
    bytes: buf.length
  }
}

/**
 * Full file list of a commit — the tree as it was at that moment, each entry
 * carrying git's mode for it. `-z` prints `<mode> <type> <sha>\t<path>` per
 * record, which is the long form of `--name-only`: the mode is why it is read
 * here rather than the shorter one. `100755` is the executable bit, `120000` a
 * symlink — a link is not a program of its own, so only the first counts.
 */
export async function snapshotFiles(root: string, hash: string): Promise<SnapshotEntry[]> {
  const raw = await git(root, ['ls-tree', '-r', '-z', hash])
  return raw
    .split('\0')
    .filter((r) => r.length > 0)
    .map((record) => {
      const tab = record.indexOf('\t')
      return { path: record.slice(tab + 1), exec: record.startsWith('100755 ') }
    })
}

/**
 * Every file in the work tree as it is on disk right now, for "browse working
 * tree" — tracked, untracked, and the ignored ones too, which are as much part
 * of the directory in front of you as the rest and are marked rather than
 * withheld. A file deleted on disk is gone, so it is not listed; `ls-files -c`
 * still names files the index has but the disk has lost, which is what the
 * access check drops. `.git` itself is never listed: git does not report its
 * own store as content.
 */
export async function worktreeFiles(root: string): Promise<WorktreeFile[]> {
  const [raw, rawIgnored] = await Promise.all([
    git(root, ['ls-files', '-c', '-o', '--exclude-standard', '-z']),
    // Files only, not `--directory`: the tree lists paths, and a bare
    // `node_modules/` row would be a folder that never opens.
    git(root, ['ls-files', '-o', '-i', '--exclude-standard', '-z'])
  ])
  // A path in conflict has three index entries — one per merge stage — and
  // `-c` prints one line each, so a Set is what makes it one file again. The
  // tree keys its rows by path; three rows would share a key.
  const ignored = new Set(rawIgnored.split('\0').filter((p) => p.length > 0))
  const paths = [...new Set(raw.split('\0').filter((p) => p.length > 0)), ...ignored]
  // `stat` rather than `access`: the same one call answers both "is it still
  // there" and "is it a program", and the tree wants the second to offer to
  // run it. A directory's own executable bit means something else entirely,
  // so only regular files are ever marked.
  const existing = await Promise.all(
    paths.map((p) =>
      fs.promises
        .stat(path.join(root, p))
        .then<WorktreeFile | null>((st) => ({
          path: p,
          ignored: ignored.has(p),
          exec: st.isFile() && (st.mode & 0o111) !== 0
        }))
        .catch(() => null)
    )
  )
  return existing
    .filter((f): f is WorktreeFile => f !== null)
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
}

/** Contents of one file at a revision; binary files report rather than dump. */
export async function snapshotFile(
  root: string,
  hash: string,
  filePath: string
): Promise<SnapshotFileContent> {
  const content = await git(root, ['show', `${hash}:${filePath}`])
  if (content.includes('\0')) return { content: '', binary: true }
  if (Buffer.byteLength(content) > MAX_PATCH_BYTES) {
    return { content: '', binary: true }
  }
  return { content, binary: false }
}

/**
 * Write one file's contents at a revision to a temp file so the system default
 * application can open it. The temp name is derived from hash + path, so
 * opening the same snapshot file twice reuses (overwrites) the same file.
 */
export async function snapshotWriteTemp(
  root: string,
  hash: string,
  filePath: string
): Promise<string> {
  const content = await git(root, ['show', `${hash}:${filePath}`])
  const name = `gitty-${hash.slice(0, 8)}-${filePath.replace(/[\\/]/g, '_').slice(0, 80)}`
  const tmp = path.join(os.tmpdir(), name)
  await fs.promises.writeFile(tmp, content)
  return tmp
}

/**
 * Check a whole commit out into a temp directory, so a program that was
 * committed at that revision can be run as it was then.
 *
 * The whole tree rather than the one file: a script reads its neighbours —
 * sources a library beside it, opens a config, calls another script in the
 * same directory — and giving it only itself would run the old program against
 * today's everything else, which is the one thing this is meant not to do.
 *
 * A linked work tree (`git worktree add --detach`) rather than an unpacked
 * `git archive`, because a program in a repository usually asks the repository
 * questions: `git rev-parse`, `git describe`, the branch it is on. An archive
 * is only files, and anything that shells out to git inside one fails at the
 * first line. A linked work tree is a real one — detached at that commit, with
 * an index and a HEAD of its own, so nothing done inside it can reach the
 * checkout the user is working in.
 *
 * The price is that this writes to the repository: a registration under
 * `.git/worktrees`. `worktree prune` runs first, which is what clears the
 * registrations whose directories the system has since cleaned out of `/tmp`;
 * without it, adding the same snapshot again after a reboot would fail on a
 * name that is taken but no longer there.
 *
 * Keyed by hash and therefore reusable: a commit's tree cannot change, so the
 * second run of anything in it is immediate. A tree over
 * `MAX_SNAPSHOT_EXPORT_BYTES` is refused before anything is written, and a
 * checkout that failed answers with no directory at all — the caller says so
 * rather than running something out of half a tree.
 */
export async function snapshotExport(root: string, hash: string): Promise<SnapshotExport> {
  const dir = path.join(os.tmpdir(), `gitty-snapshot-${hash.slice(0, 12)}`)
  // `.git` here is the file pointing back at the repository, which is what
  // makes this a work tree rather than a directory of files; its presence is
  // the whole of "already checked out and still sound".
  try {
    await fs.promises.access(path.join(dir, '.git'))
    return { dir, tooLarge: false }
  } catch {
    // Never made, or made and since damaged: below, both are made again.
  }
  // Asked before anything is written, and of git rather than of the disk: the
  // tree is not on disk yet, and this is the moment to decide it never will be.
  if ((await treeBytes(root, hash)) > MAX_SNAPSHOT_EXPORT_BYTES) {
    return { dir: null, tooLarge: true }
  }
  try {
    await git(root, ['worktree', 'prune'])
    // A directory left from a failed attempt would make `add` refuse.
    await fs.promises.rm(dir, { recursive: true, force: true })
    await git(root, ['worktree', 'add', '--detach', '--force', dir, hash])
    return { dir, tooLarge: false }
  } catch {
    await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {})
    await git(root, ['worktree', 'prune']).catch(() => {})
    return { dir: null, tooLarge: false }
  }
}

/**
 * What a commit's tree weighs, from `ls-tree -l`: the blob sizes as git has
 * them, without reading a byte of the objects themselves. A submodule prints
 * `-` for its size — it is a commit, not content, and a checkout brings none
 * of it in — so anything that is not a number counts as nothing.
 */
async function treeBytes(root: string, hash: string): Promise<number> {
  const raw = await git(root, ['ls-tree', '-r', '-l', '-z', hash])
  let total = 0
  for (const record of raw.split('\0')) {
    if (!record) continue
    // `<mode> <type> <sha> <size>\t<path>`, the size right-aligned in a field
    // wide enough for the largest of them, hence the split on whitespace.
    const size = Number(record.slice(0, record.indexOf('\t')).split(/\s+/)[3])
    if (Number.isFinite(size)) total += size
  }
  return total
}

/**
 * Run a git command that talks to a remote.
 *
 * There is no terminal behind these: a credential or passphrase prompt would
 * block forever with nowhere to appear, so prompting is turned off and the
 * command is given a deadline. Anything that genuinely needs to be answered
 * belongs in the terminal pane, which is why failures come back as text rather
 * than as a thrown error — the pane shows git's own words.
 */
async function remoteOp(root: string, args: string[]): Promise<GitOpResult> {
  const env = {
    ...process.env,
    GIT_OPTIONAL_LOCKS: '0',
    LC_ALL: 'C',
    GIT_TERMINAL_PROMPT: '0',
    GIT_ASKPASS: '',
    SSH_ASKPASS: '',
    // An agent still answers; only the interactive prompt is refused.
    GIT_SSH_COMMAND: 'ssh -o BatchMode=yes'
  }
  try {
    const { stdout, stderr } = await exec('git', args, {
      cwd: root,
      maxBuffer: 8 * 1024 * 1024,
      windowsHide: true,
      timeout: 120_000,
      env
    })
    return { ok: true, output: `${stdout}\n${stderr}`.trim() || msg.git.done }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    const said = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim()
    return { ok: false, output: said || err.message || msg.git.gitFailed }
  }
}

/** Push the checked-out branch. `branch` is set only when it has no upstream. */
export function push(root: string, branch?: string): Promise<GitOpResult> {
  return remoteOp(root, branch ? ['push', '--set-upstream', 'origin', branch] : ['push'])
}

/**
 * Pull, fast-forward only: a merge that cannot be resolved without a decision
 * (or an editor) is not something a button should start.
 */
export function pull(root: string): Promise<GitOpResult> {
  return remoteOp(root, ['pull', '--ff-only'])
}

/**
 * Which paths in the work tree are submodules, read from `.gitmodules` — the
 * file git itself treats as the list of them. One `git config` call, no walk
 * of the tree: `ls-files --stage` would name every file in the repository to
 * find the handful with mode 160000. A repository with no `.gitmodules` makes
 * git exit non-zero, which is the empty list rather than an error.
 */
export async function submodules(root: string): Promise<string[]> {
  let raw: string
  try {
    raw = await git(root, ['config', '-f', '.gitmodules', '-z', '--get-regexp', '\\.path$'])
  } catch {
    return []
  }
  // `-z` prints `<key>\n<value>\0` per entry: the newline is inside the
  // record, which is what lets a value hold one.
  return raw
    .split('\0')
    .filter((r) => r.length > 0)
    .map((r) => r.slice(r.indexOf('\n') + 1))
    .filter((p) => p.length > 0)
}

/**
 * Pull one submodule: fetch its own remote and move it to the tip of the
 * branch it tracks. `--remote` is what makes this a pull rather than a
 * checkout of the commit the superproject records — the superproject is left
 * pointing at the old commit, so the submodule shows up in Changes afterwards
 * and committing that pointer stays the user's decision. `--init` because a
 * submodule that was never checked out is the other half of "get me this".
 * It talks to a remote, so it runs under `remoteOp`'s no-prompt deadline.
 */
export function submodulePull(root: string, subPath: string): Promise<GitOpResult> {
  return remoteOp(root, ['submodule', 'update', '--init', '--remote', '--', subPath])
}

/* ---------- staging ---------- */

/**
 * Run a git command that changes the repository and report what it said.
 *
 * Same shape as `remoteOp` and for the same reason: the pane shows git's own
 * words rather than a sentence of ours. Nothing here talks to a remote, so
 * there is no prompt to refuse and no deadline to keep.
 */
async function localOp(root: string, args: string[], input?: string): Promise<GitOpResult> {
  try {
    const { stdout, stderr } = await run(root, args, input)
    return { ok: true, output: `${stdout}\n${stderr}`.trim() || msg.git.done }
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; message?: string }
    const said = `${err.stdout ?? ''}\n${err.stderr ?? ''}`.trim()
    return { ok: false, output: said || err.message || msg.git.gitFailed }
  }
}

/**
 * `execFile`, plus the ability to feed the command something on stdin —
 * `git apply` reads its patch from there, and a patch written to a temp file
 * would be one more thing to clean up after a crash.
 */
function run(
  root: string,
  args: string[],
  input?: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      args,
      {
        cwd: root,
        maxBuffer: 64 * 1024 * 1024,
        windowsHide: true,
        env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
      },
      (err, stdout, stderr) => {
        if (err) reject(Object.assign(err, { stdout, stderr }))
        else resolve({ stdout, stderr })
      }
    )
    if (input !== undefined) {
      child.stdin?.end(input)
    }
  })
}

/** Put a whole file into the index — new, modified or deleted alike. */
export function stageFile(root: string, filePath: string): Promise<GitOpResult> {
  return localOp(root, ['add', '--', filePath])
}

/**
 * Take a whole file back out of the index, leaving the work tree alone.
 * `restore --staged` needs a HEAD to restore from; in a repository whose first
 * commit has not happened yet there is none, and removing the index entry is
 * what "unstage" means there.
 */
export async function unstageFile(root: string, filePath: string): Promise<GitOpResult> {
  const restored = await localOp(root, ['restore', '--staged', '--', filePath])
  if (restored.ok) return restored
  return localOp(root, ['rm', '--cached', '--quiet', '--', filePath])
}

/** Throw away a tracked file's uncommitted changes. There is no undo. */
export function discardFile(root: string, filePath: string): Promise<GitOpResult> {
  return localOp(root, ['restore', '--', filePath])
}

/** The whole index as a patch, for handing to something outside Gitty. */
export async function stagedDiff(root: string): Promise<string> {
  try {
    return await git(root, ['diff', '--cached', '--no-color', '--no-ext-diff'])
  } catch {
    return ''
  }
}

/**
 * Stage or unstage part of a file.
 *
 * The patch is fetched here rather than taken from the renderer, and it is the
 * right one for the direction: staging works from `git diff` — the work tree
 * against the index — because the diff the pane shows for a whole work tree is
 * against HEAD, which merges staged and unstaged work and would stage things
 * twice. Unstaging works from `git diff --cached` and is applied in reverse.
 *
 * The context count has to match the one the pane drew, or the hunk the user
 * clicked is not the hunk that gets staged. At zero context git needs
 * `--unidiff-zero` to apply the result — and only there: given unconditionally
 * it also turns off the check that keeps an ambiguous hunk from landing in the
 * wrong place.
 */
export async function applyHunks(
  root: string,
  filePath: string,
  picks: HunkPick[],
  direction: ApplyDirection,
  opts: DiffOptions = DEFAULT_DIFF_OPTIONS
): Promise<GitOpResult> {
  const context = Math.min(100, Math.max(0, Math.round(opts.context)))
  const args = ['diff', '--no-color', '--no-ext-diff', `-U${context}`]
  if (direction === 'unstage') args.push('--cached')
  args.push('--', filePath)

  const patch = buildPatch(parseFilePatch(await git(root, args)), picks, direction)
  if (!patch) return { ok: false, output: msg.git.nothingToApply }

  const apply = ['apply', '--cached', '--whitespace=nowarn']
  if (direction === 'unstage') apply.push('-R')
  if (context === 0) apply.push('--unidiff-zero')
  apply.push('-')
  return localOp(root, apply, patch)
}

/** Count the number of newlines in a buffer. The last line is counted even when
 *  it doesn't end with a newline — a non-empty file always has >=1 line. */
function countNewlines(buf: Buffer): number {
  let n = 0
  for (let i = 0; i < buf.length; i++) {
    if (buf[i] === 0x0a) n++
  }
  // A non-empty file whose last byte is not a newline has one trailing line.
  if (buf.length > 0 && buf[buf.length - 1] !== 0x0a) n++
  return n
}

/**
 * Count lines in working-tree and committed files in one batch. Each pair names
 * a revision (null for the work tree) and a repo-relative path. Returns line
 * counts in the same order; null for any file that could not be read.
 */
export async function countFileLines(
  root: string,
  pairs: Array<{ rev: string | null; filePath: string }>
): Promise<Array<number | null>> {
  return Promise.all(
    pairs.map(async ({ rev, filePath }) => {
      try {
        if (rev === null) {
          const abs = path.resolve(root, filePath)
          if (abs !== root && !abs.startsWith(root + path.sep)) return null
          const stat = await fs.promises.stat(abs)
          if (stat.size > MAX_LINE_COUNT_BYTES) return null
          const buf = await fs.promises.readFile(abs)
          if (buf.includes(0x00)) return null // binary
          return countNewlines(buf)
        }
        // Committed file via git show, read as a buffer to stay binary-safe.
        const { stdout } = await exec('git', ['show', `${rev}:${filePath}`], {
          cwd: root,
          maxBuffer: MAX_LINE_COUNT_BYTES + 1024 * 1024,
          windowsHide: true,
          encoding: 'buffer',
          env: { ...process.env, GIT_OPTIONAL_LOCKS: '0', LC_ALL: 'C' }
        })
        const buf = stdout as unknown as Buffer
        if (buf.length > MAX_LINE_COUNT_BYTES) return null
        if (buf.includes(0x00)) return null // binary
        return countNewlines(buf)
      } catch {
        return null
      }
    })
  )
}
