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
  DiffOptions,
  DiffRequest,
  DiffResult,
  GitOpResult,
  ImageFileContent,
  RepoStatus,
  SnapshotFileContent
} from '../shared/types'
import { DEFAULT_DIFF_OPTIONS } from '../shared/types'
import {
  parseBlame,
  parseBranches,
  parseLog,
  parseNameStatus,
  parseNumstat,
  parseStatus,
  RS,
  US
} from './parse'
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
 * `ref` points the log at another branch; undefined means HEAD. `filter`, when
 * set, narrows it to commits whose message or author contains the text — the
 * subject is part of the message, so typing a few words filters the log.
 */
export async function log(
  root: string,
  limit: number,
  skip = 0,
  ref?: string | null,
  filter?: string
): Promise<Commit[]> {
  const fmt = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%D', '%P'].join(US) + RS
  let raw: string
  try {
    if (filter) {
      // A filter is a union of two greps: one over the message, one over the
      // author. git ANDs --grep with --author, so a single command cannot
      // express the OR — hence a rev-list pass per side, merged by hash, then
      // one --no-walk pass (date-ordered) to shape and page the result.
      const base = ref ? [ref] : []
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
        ...(ref ? [ref] : []),
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

/** Every commit that touched this file, newest first, following renames. */
export async function fileHistory(
  root: string,
  rev: string | null,
  filePath: string
): Promise<Commit[]> {
  const fmt = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%D', '%P'].join(US) + RS
  const args = ['log', '--follow', `--pretty=format:${fmt}`]
  if (rev) args.push(rev)
  args.push('--', filePath)
  const raw = await git(root, args)
  return parseLog(raw)
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
        : // Staged and unstaged together, which is what the work-tree list shows.
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

/** Full file list of a commit — the tree as it was at that moment. */
export async function snapshotFiles(root: string, hash: string): Promise<string[]> {
  const raw = await git(root, ['ls-tree', '-r', '--name-only', '-z', hash])
  return raw.split('\0').filter((p) => p.length > 0)
}

/**
 * Every file in the work tree — tracked and untracked — as it is on disk right
 * now, for "browse working tree". A file deleted on disk is gone, so it is not
 * listed; an untracked one is. `ls-files -c` still names files the index has
 * but the disk has lost, which is what the access check drops.
 */
export async function worktreeFiles(root: string): Promise<string[]> {
  const raw = await git(root, ['ls-files', '-c', '-o', '--exclude-standard', '-z'])
  const paths = raw.split('\0').filter((p) => p.length > 0)
  const existing = await Promise.all(
    paths.map((p) =>
      fs.promises
        .access(path.join(root, p))
        .then(() => p)
        .catch(() => null)
    )
  )
  return existing.filter((p): p is string => p !== null).sort()
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
