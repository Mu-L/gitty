/**
 * Pure parsers over git's machine-readable output. Everything here is a
 * function of a raw string and nothing else, so it can be unit-tested without
 * a repository. `git.ts` shells out to git and feeds the results in, joining
 * on the things only it knows (the repository root, `absPath`).
 */
import { UNCOMMITTED_SHA, type BlameLine, type Branch, type Commit, type FileChurn, type FileStatusCode, type GrepHit } from '../shared/types'

export { UNCOMMITTED_SHA }

/** Separators git's machine formats use between fields and records. */
export const RS = '\x1e' // record separator
export const US = '\x1f' // unit separator

/** A single-letter status token; anything unfamiliar reads as clean. */
export function fileStatusChar(c: string): FileStatusCode {
  return (['M', 'A', 'D', 'R', 'C', 'U', '?'].includes(c) ? c : ' ') as FileStatusCode
}

/** A working-tree file as porcelain reports it, before the root joins in. */
export interface StatusFileRecord {
  path: string
  index: FileStatusCode
  worktree: FileStatusCode
  untracked: boolean
  origPath?: string
}

export interface ParsedStatus {
  branch: string
  upstream: string | null
  ahead: number
  behind: number
  files: StatusFileRecord[]
}

/**
 * Parse `git status --porcelain=v2 -z --branch`. Records are NUL-separated,
 * but rename/copy records ("2 ") carry the original path as one extra NUL
 * field.
 */
export function parseStatus(raw: string): ParsedStatus {
  const fields = raw.split('\0')
  const files: StatusFileRecord[] = []
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
      files.push(mkFile(entry.split(' ').slice(8).join(' '), xy, false))
    } else if (entry.startsWith('2 ')) {
      const xy = entry.slice(2, 4)
      const rel = entry.split(' ').slice(9).join(' ')
      const orig = fields[++i] ?? ''
      files.push({ ...mkFile(rel, xy, false), origPath: orig })
    } else if (entry.startsWith('u ')) {
      const rel = entry.split(' ').slice(10).join(' ')
      files.push(mkFile(rel, 'UU', false))
    } else if (entry.startsWith('? ')) {
      files.push(mkFile(entry.slice(2), '??', true))
    }
  }

  files.sort((a, b) => a.path.localeCompare(b.path))
  return { branch, upstream, ahead, behind, files }
}

function mkFile(rel: string, xy: string, untracked: boolean): StatusFileRecord {
  return {
    path: rel,
    index: fileStatusChar(xy[0]),
    worktree: fileStatusChar(xy[1]),
    untracked
  }
}

/** Parse the `--pretty=format:%H%x1f…%x1f%P` records `git log` emits. */
export function parseLog(raw: string): Commit[] {
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

/**
 * Parse `--numstat -z`. A record is `added\tdeleted\tpath\0`, except for a
 * rename, where the path field is empty and two more NUL fields follow with the
 * old and the new path. Binary files report `-` for both counts and are
 * dropped — there are no lines to count.
 */
export function parseNumstat(raw: string): Map<string, FileChurn> {
  const parts = raw.split('\0').filter((s) => s.length > 0)
  const out = new Map<string, FileChurn>()
  for (let i = 0; i < parts.length; i++) {
    // `git show --format=` leaves a blank line before the stats.
    const fields = parts[i].replace(/^\n+/, '').split('\t')
    if (fields.length < 3) continue
    const [addStr, delStr] = fields
    // The path is either in this field or, for a rename, the two that follow.
    const inline = fields.slice(2).join('\t')
    const path = inline.length > 0 ? inline : ((i += 2), parts[i])
    if (addStr === '-' || delStr === '-' || path == null) continue
    out.set(path, { added: Number(addStr), deleted: Number(delStr) })
  }
  return out
}

/** What one commit did to the file a history is following. */
export interface CommitNumstat {
  /** Null for a binary revision: it has counts, but not in lines. */
  churn: FileChurn | null
  /**
   * The path the file goes by **at this commit**, which is what a revision has
   * to be read at. A rename names both sides; the second is this commit's, the
   * first belongs to everything older.
   */
  path: string
}

/**
 * Parse `git log --format=%H --numstat -z` over a single path: what each commit
 * did to it, keyed by hash. A record is either a bare hash or a numstat entry
 * belonging to the hash before it; git puts a newline in front of the stats,
 * and a rename leaves the path field empty with two more NUL fields behind it.
 */
export function parseCommitNumstat(raw: string): Map<string, CommitNumstat> {
  const parts = raw
    .split('\0')
    .map((s) => s.replace(/^\n+/, ''))
    .filter((s) => s.length > 0)
  const out = new Map<string, CommitNumstat>()
  let hash: string | null = null
  for (let i = 0; i < parts.length; i++) {
    const fields = parts[i].split('\t')
    if (fields.length < 3) {
      hash = parts[i]
      continue
    }
    const [addStr, delStr] = fields
    // A rename's path sits in the two records that follow, not in this one, and
    // the newer of the two is the name this commit knows the file by.
    let path = fields.slice(2).join('\t')
    if (path.length === 0) {
      path = parts[i + 2] ?? parts[i + 1] ?? ''
      i += 2
    }
    if (hash === null) continue
    out.set(hash, {
      churn:
        addStr === '-' || delStr === '-'
          ? null
          : { added: Number(addStr), deleted: Number(delStr) },
      path
    })
  }
  return out
}

/** One object as `git cat-file --batch` answers for it. */
export interface BatchObject {
  /** The object's bytes, or null where git answered that it has no such one. */
  body: Buffer | null
}

/**
 * Split what `git cat-file --batch` has written so far into whole objects,
 * handing back the tail that is still incomplete. The stream is length-framed
 * rather than delimited — `<oid> <type> <size>\n`, the bytes, a newline — so a
 * reader that does not carry its remainder across chunks loses its place, and
 * every object after it. A request git cannot answer is a single
 * `<what was asked> missing\n` line with no body at all.
 */
export function readBatchObjects(buf: Buffer): { objects: BatchObject[]; rest: Buffer } {
  const objects: BatchObject[] = []
  let at = 0
  for (;;) {
    const nl = buf.indexOf(0x0a, at)
    if (nl < 0) break
    const header = buf.toString('latin1', at, nl)
    if (header.endsWith(' missing')) {
      objects.push({ body: null })
      at = nl + 1
      continue
    }
    const size = Number(header.slice(header.lastIndexOf(' ') + 1))
    // A header that is not a size is a stream we can no longer follow; stop
    // rather than guess, and let the caller see fewer objects than it asked for.
    if (!Number.isFinite(size) || size < 0) break
    const end = nl + 1 + size
    if (buf.length < end + 1) break
    objects.push({ body: buf.subarray(nl + 1, end) })
    at = end + 1
  }
  return { objects, rest: buf.subarray(at) }
}

export interface NameStatusEntry {
  path: string
  status: FileStatusCode
  origPath?: string
}

/** Shared `--name-status -z` reader; rename entries carry two path fields. */
export function parseNameStatus(raw: string): NameStatusEntry[] {
  const parts = raw.split('\0').filter((s) => s.length > 0)
  const out: NameStatusEntry[] = []
  for (let i = 0; i < parts.length; i++) {
    const st = parts[i]
    // Status tokens look like "M", "A", "R100"; anything else is a stray line.
    if (!/^[A-Z]\d*$/.test(st)) continue
    if (st.startsWith('R') || st.startsWith('C')) {
      const orig = parts[++i]
      const dest = parts[++i]
      out.push({ path: dest, status: fileStatusChar(st[0]), origPath: orig })
    } else {
      out.push({ path: parts[++i], status: fileStatusChar(st[0]) })
    }
  }
  return out
}

/**
 * Parse `git for-each-ref --format=%refname%x1f…`. `origin/HEAD` and friends
 * are symbolic refs pointing at a branch that is already listed, so they are
 * dropped rather than shown twice.
 */
export function parseBranches(raw: string): Branch[] {
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

/**
 * Parse `git blame --line-porcelain`. With `--line-porcelain` every line
 * repeats the full header, so one record is the 40-char sha line, the
 * `author` / `author-time` / `summary` keys, and the tab-indented source line.
 */
export function parseBlame(raw: string): BlameLine[] {
  const out: BlameLine[] = []
  let rec: BlameLine | null = null
  for (const line of raw.split('\n')) {
    if (line.length === 0) continue
    if (line.startsWith('\t')) {
      if (rec) {
        out.push({ ...rec, line: line.slice(1) })
        rec = null
      }
      continue
    }
    if (/^[0-9a-f]{40} /.test(line)) {
      rec = { sha: line.slice(0, 40), author: '', time: 0, summary: '', line: '' }
      continue
    }
    if (!rec) continue
    if (line.startsWith('author ')) rec.author = line.slice(7)
    else if (line.startsWith('author-time ')) rec.time = Number(line.slice(12))
    else if (line.startsWith('summary ')) rec.summary = line.slice(8)
  }
  return out
}

/**
 * Parse `git grep -n -z`. Each record is one matching line, NUL-separated:
 * `path`, line number, then the line itself — and with a revision named, the
 * path arrives as `<rev>:<path>`, which is the prefix stripped here.
 *
 * NUL separators rather than colons because a path may contain a colon and a
 * matched line certainly may; the line's own text is rejoined in case it holds
 * one of the separators too.
 */
export function parseGrep(raw: string, rev: string | null): GrepHit[] {
  const hits: GrepHit[] = []
  for (const record of raw.split('\n')) {
    if (record === '') continue
    const parts = record.split('\0')
    if (parts.length < 3) continue
    const [where, lineNo, ...rest] = parts
    const prefix = rev ? `${rev}:` : ''
    hits.push({
      path: prefix && where.startsWith(prefix) ? where.slice(prefix.length) : where,
      line: Number(lineNo),
      text: rest.join('\0')
    })
  }
  return hits
}
