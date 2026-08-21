import { describe, expect, it } from 'vitest'
import {
  parseBranches,
  parseBlame,
  parseGrep,
  parseLog,
  parseNameStatus,
  parseNumstat,
  parseCommitNumstat,
  readBatchObjects,
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

describe('parseNumstat', () => {
  it('reads counts, renames and paths containing tabs', () => {
    const raw = '4\t0\tCHANGELOG.md\0' + '1\t1\t\0src/parse.test.ts\0test/parse.test.ts\0' + '2\t1\ta\tb.txt\0'
    expect([...parseNumstat(raw)]).toEqual([
      ['CHANGELOG.md', { added: 4, deleted: 0 }],
      ['test/parse.test.ts', { added: 1, deleted: 1 }],
      ['a\tb.txt', { added: 2, deleted: 1 }]
    ])
  })

  it('drops binary files but keeps reading past a binary rename', () => {
    const raw = '-\t-\timg.png\0' + '-\t-\t\0old.png\0new.png\0' + '3\t0\ta.ts\0'
    expect([...parseNumstat(raw).keys()]).toEqual(['a.ts'])
  })

  it('returns an empty map for a merge commit, which reports nothing', () => {
    expect(parseNumstat('').size).toBe(0)
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

describe('parseGrep', () => {
  const Z = '\u0000'

  it('reads path, line and text from NUL-separated records', () => {
    const raw = `src/a.ts${Z}189${Z}export function x(): void {\nsrc/b.ts${Z}2${Z}  const y = 1\n`
    expect(parseGrep(raw, null)).toEqual([
      { path: 'src/a.ts', line: 189, text: 'export function x(): void {' },
      { path: 'src/b.ts', line: 2, text: '  const y = 1' }
    ])
  })

  it('strips the revision git prefixes each path with', () => {
    expect(parseGrep(`HEAD:src/a.ts${Z}12${Z}hit\n`, 'HEAD')).toEqual([
      { path: 'src/a.ts', line: 12, text: 'hit' }
    ])
  })

  it('keeps a matched line that holds the separator itself', () => {
    expect(parseGrep(`a.txt${Z}3${Z}one${Z}two\n`, null)[0].text).toBe(`one${Z}two`)
  })

  it('ignores empty and malformed records', () => {
    expect(parseGrep('\nnot-a-record\n', null)).toEqual([])
  })
})

describe('parseCommitNumstat', () => {
  const HASH = 'a'.repeat(40)
  const HASH2 = 'b'.repeat(40)
  const HASH3 = 'c'.repeat(40)

  it('keys each commit churn by hash, across renames', () => {
    const raw =
      `${HASH}\0\n25\t8\tsrc/a.ts\0` +
      `${HASH2}\0\n1\t1\t\0src/old.ts\0src/a.ts\0` +
      `${HASH3}\0\n80\t0\tsrc/old.ts\0`
    expect([...parseCommitNumstat(raw)]).toEqual([
      [HASH, { churn: { added: 25, deleted: 8 }, path: 'src/a.ts' }],
      // The rename's newer name is the one that commit reads at; everything
      // older answers to the name before it.
      [HASH2, { churn: { added: 1, deleted: 1 }, path: 'src/a.ts' }],
      [HASH3, { churn: { added: 80, deleted: 0 }, path: 'src/old.ts' }]
    ])
  })

  it('marks a binary revision null and leaves a commit with no stats out', () => {
    const raw = `${HASH}\0\n-\t-\timg.png\0` + `${HASH2}\0` + `${HASH3}\0\n2\t0\timg.png\0`
    const m = parseCommitNumstat(raw)
    expect(m.get(HASH)).toEqual({ churn: null, path: 'img.png' })
    expect(m.has(HASH2)).toBe(false)
    expect(m.get(HASH3)).toEqual({ churn: { added: 2, deleted: 0 }, path: 'img.png' })
  })

  it('keeps a tab in a path, which splits the record but not the name', () => {
    const raw = `${HASH}\0\n1\t0\ta\tb.ts\0`
    expect(parseCommitNumstat(raw).get(HASH)).toEqual({ churn: { added: 1, deleted: 0 }, path: 'a\tb.ts' })
  })
})

describe('readBatchObjects', () => {
  const obj = (oid: string, body: string): Buffer =>
    Buffer.concat([Buffer.from(`${oid} blob ${body.length}\n`), Buffer.from(body), Buffer.from('\n')])

  it('reads whole objects and keeps the incomplete tail', () => {
    const whole = Buffer.concat([obj('a'.repeat(40), 'one\ntwo\n'), obj('b'.repeat(40), 'x\n')])
    const { objects, rest } = readBatchObjects(whole)
    expect(objects.map((o) => o.body?.toString())).toEqual(['one\ntwo\n', 'x\n'])
    expect(rest.length).toBe(0)
  })

  it('does not lose its place when an object is split across chunks', () => {
    const whole = Buffer.concat([obj('a'.repeat(40), 'one\ntwo\n'), obj('b'.repeat(40), 'x\n')])
    for (let cut = 1; cut < whole.length; cut++) {
      const first = readBatchObjects(whole.subarray(0, cut))
      const second = readBatchObjects(Buffer.concat([first.rest, whole.subarray(cut)]))
      const bodies = [...first.objects, ...second.objects].map((o) => o.body?.toString())
      expect(bodies).toEqual(['one\ntwo\n', 'x\n'])
    }
  })

  it('reads a missing object as a body-less record, and goes on', () => {
    const raw = Buffer.concat([
      Buffer.from('deadbeef:no/such.ts missing\n'),
      obj('a'.repeat(40), 'x\n')
    ])
    const { objects } = readBatchObjects(raw)
    expect(objects.map((o) => o.body?.toString() ?? null)).toEqual([null, 'x\n'])
  })

  it('counts a zero-length object rather than skipping it', () => {
    const { objects } = readBatchObjects(obj('a'.repeat(40), ''))
    expect(objects).toHaveLength(1)
    expect(objects[0].body?.length).toBe(0)
  })

  it('keeps bytes that are not text intact', () => {
    const body = Buffer.from([0x00, 0x0a, 0xff])
    const raw = Buffer.concat([
      Buffer.from(`${'a'.repeat(40)} blob ${body.length}\n`),
      body,
      Buffer.from('\n')
    ])
    const { objects } = readBatchObjects(raw)
    expect([...(objects[0].body ?? [])]).toEqual([0x00, 0x0a, 0xff])
  })

  it('stops at a header it cannot read rather than guessing', () => {
    const { objects, rest } = readBatchObjects(Buffer.from('nonsense\nmore\n'))
    expect(objects).toEqual([])
    expect(rest.length).toBeGreaterThan(0)
  })
})
