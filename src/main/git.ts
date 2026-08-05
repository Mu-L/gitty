import fs from 'node:fs'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'node:path'
import type {
  Branch,
  Commit,
  CommitDetail,
  CommitFile,
  DiffRequest,
  DiffResult,
  FileStatusCode,
  RepoStatus,
  SnapshotFileContent,
  WorkingFile
} from '../shared/types'

const exec = promisify(execFile)

/** Diffs larger than this are not sent to the renderer; it would just lock up the pane. */
const MAX_PATCH_BYTES = 2 * 1024 * 1024

/** Untracked files inlined into the whole-work-tree diff before giving up. */
const MAX_UNTRACKED_IN_DIFF = 50

const RS = '\x1e' // record separator
const US = '\x1f' // unit separator

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

function code(c: string): FileStatusCode {
  return (['M', 'A', 'D', 'R', 'C', 'U', '?'].includes(c) ? c : ' ') as FileStatusCode
}

/**
 * Parse `git status --porcelain=v2 -z --branch`. Records are NUL-separated, but
 * rename/copy records ("2 ") carry the original path as one extra NUL field.
 */
function parseStatus(root: string, raw: string): Omit<RepoStatus, 'root'> {
  const fields = raw.split('\0')
  const files: WorkingFile[] = []
  let branch = 'HEAD'
  let upstream: string | null = null
  let ahead = 0
  let behind = 0

  for (let i = 0; i < fields.length; i++) {
    const entry = fields[i]
    if (!entry) continue

    if (entry.startsWith('# branch.head ')) branch = entry.slice(14)
    else if (entry.startsWith('# branch.upstream ')) upstream = entry.slice(18)
    else if (entry.startsWith('# branch.ab ')) {
      const m = /\+(\d+) -(\d+)/.exec(entry)
      if (m) {
        ahead = Number(m[1])
        behind = Number(m[2])
      }
    } else if (entry.startsWith('1 ')) {
      // 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
      const xy = entry.slice(2, 4)
      files.push(mkFile(root, entry.split(' ').slice(8).join(' '), xy, false))
    } else if (entry.startsWith('2 ')) {
      const xy = entry.slice(2, 4)
      const rel = entry.split(' ').slice(9).join(' ')
      const orig = fields[++i] ?? ''
      files.push({ ...mkFile(root, rel, xy, false), origPath: orig })
    } else if (entry.startsWith('u ')) {
      const rel = entry.split(' ').slice(10).join(' ')
      files.push(mkFile(root, rel, 'UU', false))
    } else if (entry.startsWith('? ')) {
      files.push(mkFile(root, entry.slice(2), '??', true))
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path))
  return { branch, upstream, ahead, behind, files }
}

function mkFile(root: string, rel: string, xy: string, untracked: boolean): WorkingFile {
  return {
    path: rel,
    absPath: path.join(root, rel),
    index: code(xy[0]),
    worktree: code(xy[1]),
    untracked
  }
}

export async function status(root: string): Promise<RepoStatus> {
  const raw = await git(root, [
    'status',
    '--porcelain=v2',
    '-z',
    '--branch',
    '--untracked-files=all'
  ])
  return { root, ...parseStatus(root, raw) }
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
  return raw
    .split(RS)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((rec) => rec.split(US))
    // By full ref name: `refs/remotes/origin/HEAD` shortens to plain "origin",
    // which says nothing about what it is.
    .filter(([refname]) => !refname.endsWith('/HEAD'))
    .map(([refname, name, head, date, subject]) => ({
      name,
      remote: refname.startsWith('refs/remotes/'),
      head: head === '*',
      subject: subject ?? '',
      date: date ?? ''
    }))
}

/** `ref` points the log at another branch; undefined means HEAD. */
export async function log(
  root: string,
  limit: number,
  skip = 0,
  ref?: string | null
): Promise<Commit[]> {
  const fmt = ['%H', '%h', '%an', '%ae', '%aI', '%s', '%D', '%P'].join(US) + RS
  let raw: string
  try {
    raw = await git(root, [
      'log',
      `--max-count=${limit}`,
      `--skip=${skip}`,
      `--pretty=format:${fmt}`,
      ...(ref ? [ref] : []),
      // Nothing after this is a path, so a branch cannot be read as one.
      '--'
    ])
  } catch {
    return [] // fresh repo with no commits yet
  }
  return raw
    .split(RS)
    .map((r) => r.replace(/^\n/, ''))
    .filter((r) => r.trim().length > 0)
    .map((rec) => {
      const [hash, short, author, email, date, subject, refs, parents] = rec.split(US)
      return {
        hash,
        short,
        author,
        email,
        date,
        subject,
        refs: refs ?? '',
        parents: (parents ?? '').split(' ').filter(Boolean)
      }
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

/** Shared `--name-status -z` reader; rename entries carry two path fields. */
async function nameStatus(
  root: string,
  args: string[]
): Promise<Array<Omit<CommitFile, 'absPath'>>> {
  const raw = await git(root, args)
  const parts = raw.split('\0').filter((s) => s.length > 0)
  const out: Array<Omit<CommitFile, 'absPath'>> = []
  for (let i = 0; i < parts.length; i++) {
    const st = parts[i]
    // Status tokens look like "M", "A", "R100"; anything else is a stray line.
    if (!/^[A-Z]\d*$/.test(st)) continue
    if (st.startsWith('R') || st.startsWith('C')) {
      const orig = parts[++i]
      const dest = parts[++i]
      out.push({ path: dest, status: code(st[0]), origPath: orig })
    } else {
      out.push({ path: parts[++i], status: code(st[0]) })
    }
  }
  return out
}

function clip(patch: string, title: string): DiffResult {
  if (Buffer.byteLength(patch) > MAX_PATCH_BYTES) {
    return {
      patch: patch.slice(0, MAX_PATCH_BYTES),
      title,
      notice: 'Diff truncated — larger than 2 MB.'
    }
  }
  return { patch, title }
}

export async function diff(root: string, req: DiffRequest): Promise<DiffResult> {
  const common = ['--no-color', '--no-ext-diff']

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
      const result = clip(parts.filter(Boolean).join(''), 'Working tree')
      const omitted = untracked.length - shown.length
      if (omitted > 0) {
        result.notice = [result.notice, `${omitted} more untracked files not shown.`]
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
      return clip(patch, `${req.path} (untracked)`)
    }
    const args = ['diff', ...common]
    if (req.side === 'index') args.push('--cached')
    args.push('--', req.path)
    const patch = await git(root, args)
    return clip(patch, `${req.path} (${req.side === 'index' ? 'staged' : 'unstaged'})`)
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
    throw new Error('path escapes the repository')
  }
  const stat = await fs.promises.stat(abs)
  if (stat.size > MAX_PATCH_BYTES) return { content: '', binary: true }
  const content = await fs.promises.readFile(abs, 'utf8')
  return content.includes('\0') ? { content: '', binary: true } : { content, binary: false }
}

/** Full file list of a commit — the tree as it was at that moment. */
export async function snapshotFiles(root: string, hash: string): Promise<string[]> {
  const raw = await git(root, ['ls-tree', '-r', '--name-only', '-z', hash])
  return raw.split('\0').filter((p) => p.length > 0)
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
