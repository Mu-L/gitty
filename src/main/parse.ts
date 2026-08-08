/**
 * Pure parsers over git's machine-readable output. Everything here is a
 * function of a raw string and nothing else, so it can be unit-tested without
 * a repository. `git.ts` shells out to git and feeds the results in, joining
 * on the things only it knows (the repository root, `absPath`).
 */
import { UNCOMMITTED_SHA, type BlameLine, type Branch, type Commit, type FileChurn, type FileStatusCode } from '../shared/types'

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
