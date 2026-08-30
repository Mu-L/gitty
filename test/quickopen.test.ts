import { describe, expect, it } from 'vitest'
// A renderer module, but a DOM-free one — hence the entry for it in
// tsconfig.node.json, which is the project the tests belong to.
import { highlightRuns, rankPaths, scorePath } from '../src/renderer/src/quickopen'

/** The path of the top hit, for the many cases that only care about the order. */
function top(paths: string[], needle: string): string | undefined {
  return rankPaths(paths, needle, 10)[0]?.path
}

describe('scorePath', () => {
  it('matches a subsequence, not just a substring', () => {
    expect(scorePath('src/renderer/src/components/DiffPane.tsx', 'dfpn')).not.toBeNull()
  })

  it('reports the positions it matched, in order', () => {
    const hit = scorePath('src/App.tsx', 'app')
    expect(hit?.positions).toEqual([4, 5, 6])
  })

  it('is null when the letters are not there in order', () => {
    expect(scorePath('src/App.tsx', 'ppa')).toBeNull()
    expect(scorePath('src/App.tsx', 'zz')).toBeNull()
  })

  it('is null when the needle is longer than the path', () => {
    expect(scorePath('a.ts', 'aaaaaaaa')).toBeNull()
  })

  it('takes the whole path as a match for an empty needle', () => {
    expect(scorePath('src/App.tsx', '')).toEqual({ path: 'src/App.tsx', score: 0, positions: [] })
  })

  it('spends letters on the file name rather than on the directories', () => {
    // Greedy-from-the-left would put `d` on `renderer`'s directory run and
    // never reach the file; the best placement is the one in the name.
    const hit = scorePath('src/renderer/src/components/DiffPane.tsx', 'dp')
    expect(hit?.positions).toEqual([28, 32])
  })

  it('prefers letters on word boundaries', () => {
    const hit = scorePath('file-history-pane.ts', 'fhp')
    expect(hit?.positions).toEqual([0, 5, 13])
  })
})

describe('rankPaths', () => {
  it('puts an initials match of the file name first', () => {
    const paths = [
      'src/renderer/src/diffLines.ts',
      'src/renderer/src/components/DiffPane.tsx',
      'src/main/prefs.ts'
    ]
    expect(top(paths, 'dfpn')).toBe('src/renderer/src/components/DiffPane.tsx')
  })

  it('prefers a hit in the file name over one in a directory', () => {
    const paths = ['src/patch/index.ts', 'src/main/patch.ts']
    expect(top(paths, 'patch')).toBe('src/main/patch.ts')
  })

  it('breaks a tie on the shorter path', () => {
    const paths = ['a/b/c/d/notes.md', 'notes.md']
    expect(top(paths, 'notes')).toBe('notes.md')
  })

  it('is case-insensitive but rewards the exact case', () => {
    const paths = ['src/readme.md', 'src/README.md']
    expect(top(paths, 'README')).toBe('src/README.md')
    expect(rankPaths(paths, 'readme', 10)).toHaveLength(2)
  })

  it('drops what does not match and honours the limit', () => {
    const paths = ['a.ts', 'b.ts', 'ab.ts', 'zzz.md']
    expect(rankPaths(paths, 'ab', 10).map((h) => h.path)).toEqual(['ab.ts'])
    expect(rankPaths(paths, '', 2)).toHaveLength(2)
  })

  it('takes the list as it stands for an empty or blank needle', () => {
    const paths = ['b.ts', 'a.ts']
    expect(rankPaths(paths, '   ', 10).map((h) => h.path)).toEqual(['b.ts', 'a.ts'])
  })

  it('orders equal scores the same way every time', () => {
    const paths = ['x/one.ts', 'x/two.ts', 'x/six.ts']
    const once = rankPaths(paths, 'x', 10).map((h) => h.path)
    const again = rankPaths([...paths].reverse(), 'x', 10).map((h) => h.path)
    expect(once).toEqual(again)
  })
})

describe('highlightRuns', () => {
  it('alternates unmatched and matched, starting unmatched', () => {
    expect(highlightRuns('src/App.tsx', [4, 5, 6])).toEqual(['src/', 'App', '.tsx'])
  })

  it('opens with an empty run when the match starts at the first character', () => {
    expect(highlightRuns('App.tsx', [0])).toEqual(['', 'A', 'pp.tsx'])
  })

  it('joins adjacent positions into one run', () => {
    expect(highlightRuns('abcd', [0, 1, 3])).toEqual(['', 'ab', 'c', 'd', ''])
  })

  it('is the whole path unmatched when nothing matched', () => {
    expect(highlightRuns('src/App.tsx', [])).toEqual(['src/App.tsx'])
  })
})
