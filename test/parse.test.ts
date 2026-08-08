import { describe, expect, it } from 'vitest'
import {
  parseBranches,
  parseBlame,
  parseLog,
  parseNameStatus,
  parseStatus,
  UNCOMMITTED_SHA,
  RS,
  US
} from '../src/main/parse'

const Z40 = '0'.repeat(40)

describe('parseStatus', () => {
  it('reads the branch, upstream and ahead/behind counts', () => {
    const raw = [
      '# branch.oid aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      '# branch.head main',
      '# branch.upstream origin/main',
      '# branch.ab +2 -1'
    ].join('\0') + '\0'
    const s = parseStatus(raw)
    expect(s.branch).toBe('main')
    expect(s.upstream).toBe('origin/main')
    expect(s.ahead).toBe(2)
    expect(s.behind).toBe(1)
    expect(s.files).toEqual([])
  })

  it('parses a modified file and keeps its path intact', () => {
    // 1 <XY> <sub> <mH> <mI> <mW> <hH> <hI> <path>
    const raw = ['# branch.head main', '1 M. N... 100644 100644 100644 abc def src/a.ts'].join(
      '\0'
    ) + '\0'
    const s = parseStatus(raw)
    expect(s.files).toEqual([
      { path: 'src/a.ts', index: 'M', worktree: ' ', untracked: false }
    ])
  })

  it('survives a space in the path', () => {
    const raw = '1 M. N... 100644 100644 100644 abc def my file.ts\0'
    expect(parseStatus(raw).files[0].path).toBe('my file.ts')
  })

  it('reads a rename, whose original path is an extra NUL field', () => {
    const raw = '2 R. N... 100644 100644 100644 abc def R100 old path.ts\0new path.ts\0'
    const s = parseStatus(raw)
    expect(s.files).toEqual([
      { path: 'old path.ts', index: 'R', worktree: ' ', untracked: false, origPath: 'new path.ts' }
    ])
  })

  it('reports untracked files', () => {
    const raw = '# branch.head main\0? README.md\0'
    const s = parseStatus(raw)
    expect(s.files).toEqual([
      { path: 'README.md', index: '?', worktree: '?', untracked: true }
    ])
  })

  it('sorts the file list by path', () => {
    const raw = ['# branch.head main', '1 M. N... 100644 100644 100644 a b zz.ts', '1 M. N... 100644 100644 100644 a b aa.ts'].join('\0') + '\0'
    expect(parseStatus(raw).files.map((f) => f.path)).toEqual(['aa.ts', 'zz.ts'])
  })

  it('reports a merge conflict row', () => {
    const raw = 'u UU N... 100644 100644 100644 100644 abc def ghi clash.ts\0'
    const s = parseStatus(raw)
    expect(s.files).toEqual([{ path: 'clash.ts', index: 'U', worktree: 'U', untracked: false }])
  })
})

describe('parseLog', () => {
  it('parses records into commits with refs and parents', () => {
    const raw = [
      'a'.repeat(40) + US + 'aaaaaaa' + US + 'Alice' + US + 'alice@x' + US + '2026-08-08T10:00:00+08:00' + US + 'Add feature' + US + 'HEAD -> main, origin/main' + US + 'p1 p2',
      'b'.repeat(40) + US + 'bbbbbbb' + US + 'Bob' + US + 'bob@x' + US + '2026-08-07T09:00:00Z' + US + 'Fix bug' + US + '' + US + ''
    ].join(RS) + RS
    const commits = parseLog(raw)
    expect(commits).toHaveLength(2)
    expect(commits[0]).toMatchObject({
      hash: 'a'.repeat(40),
      short: 'aaaaaaa',
      author: 'Alice',
      email: 'alice@x',
      subject: 'Add feature',
      refs: 'HEAD -> main, origin/main',
      parents: ['p1', 'p2']
    })
    expect(commits[1].refs).toBe('')
    expect(commits[1].parents).toEqual([])
  })

  it('returns an empty list for an empty string', () => {
    expect(parseLog('')).toEqual([])
  })
})

describe('parseNameStatus', () => {
  it('reads plain statuses and renames', () => {
    const raw = 'M\0src/a.ts\0R100\0old.ts\0new path.ts\0A\0added.ts\0'
    const entries = parseNameStatus(raw)
    expect(entries).toEqual([
      { path: 'src/a.ts', status: 'M' },
      { path: 'new path.ts', status: 'R', origPath: 'old.ts' },
      { path: 'added.ts', status: 'A' }
    ])
  })

  it('skips stray lines that are not status tokens', () => {
    const raw = 'M\0src/a.ts\0garbage\0A\0b.ts\0'
    expect(parseNameStatus(raw).map((e) => e.path)).toEqual(['src/a.ts', 'b.ts'])
  })
})

describe('parseBranches', () => {
  it('drops origin/HEAD and marks the checked-out branch', () => {
    const raw =
      'refs/heads/main' + US + 'main' + US + '*' + US + '2026-08-08T00:00:00Z' + US + 'Latest' + RS +
      'refs/remotes/origin/main' + US + 'origin/main' + US + ' ' + US + '2026-08-07T00:00:00Z' + US + 'Old' + RS +
      'refs/remotes/origin/HEAD' + US + 'origin' + US + ' ' + US + '2026-08-07T00:00:00Z' + US + 'Sym' + RS
    const branches = parseBranches(raw)
    expect(branches).toEqual([
      { name: 'main', remote: false, head: true, subject: 'Latest', date: '2026-08-08T00:00:00Z' },
      { name: 'origin/main', remote: true, head: false, subject: 'Old', date: '2026-08-07T00:00:00Z' }
    ])
  })
})

describe('parseBlame', () => {
  const committed = [
    'a'.repeat(40) + ' 1 1 1',
    'author Alice',
    'author-mail alice@x',
    'author-time 1723000000',
    'author-tz +0800',
    'committer Alice',
    'committer-mail alice@x',
    'committer-time 1723000000',
    'committer-tz +0800',
    'summary Add feature',
    'filename src/a.ts',
    '\tconst x = 1'
  ].join('\n')

  const uncommitted = [
    UNCOMMITTED_SHA + ' 2 2',
    'author Not Committed Yet',
    'author-mail <not.committed.yet>',
    'author-time 1723000001',
    'author-tz +0800',
    'committer Not Committed Yet',
    'committer-mail <not.committed.yet>',
    'committer-time 1723000001',
    'committer-tz +0800',
    'summary file contents not yet committed',
    'filename src/a.ts',
    '\tconst y = 2'
  ].join('\n')

  it('parses one record per source line', () => {
    const lines = parseBlame(committed + '\n' + uncommitted + '\n')
    expect(lines).toEqual([
      { sha: 'a'.repeat(40), author: 'Alice', time: 1723000000, summary: 'Add feature', line: 'const x = 1' },
      { sha: UNCOMMITTED_SHA, author: 'Not Committed Yet', time: 1723000001, summary: 'file contents not yet committed', line: 'const y = 2' }
    ])
  })

  it('preserves an empty source line', () => {
    const raw = Z40 + ' 1 1 1\nauthor A\nauthor-time 1\nauthor-tz +0000\nsummary s\nfilename f\n\t\n'
    const lines = parseBlame(raw)
    expect(lines[0].line).toBe('')
  })

  it('returns nothing for an empty string', () => {
    expect(parseBlame('')).toEqual([])
  })
})
