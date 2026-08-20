import { describe, expect, it } from 'vitest'
// A renderer module, but a DOM-free one — hence the entry for it in
// tsconfig.node.json, which is the project the tests belong to.
import { comparePaths, matchesFilter, shellQuote } from '../src/renderer/src/paths'

const sorted = (paths: string[]): string[] => [...paths].sort(comparePaths)

describe('comparePaths', () => {
  it('reads the digits in a name as a number', () => {
    expect(sorted(['W10.md', 'W9.md', 'W1.md'])).toEqual(['W1.md', 'W9.md', 'W10.md'])
  })

  it('sorts the numbered part of a longer name', () => {
    expect(
      sorted([
        'SKILL_W10_Butler.md',
        'SKILL_W2_Butler.md',
        'SKILL_W1_Butler.md',
        'SKILL_W0_Butler.md'
      ])
    ).toEqual([
      'SKILL_W0_Butler.md',
      'SKILL_W1_Butler.md',
      'SKILL_W2_Butler.md',
      'SKILL_W10_Butler.md'
    ])
  })

  it('does not let case outrank the letter itself', () => {
    expect(sorted(['SKILL.md', 'butler.md', 'README.md'])).toEqual([
      'butler.md',
      'README.md',
      'SKILL.md'
    ])
  })

  it('keeps everything under one directory together', () => {
    // 'a.txt' must not land between the two files in 'a/', or the tree would
    // emit the 'a/' heading twice.
    const out = sorted(['a/two.txt', 'a.txt', 'a/one.txt', 'a-b.txt'])
    const inA = out.filter((p) => p.startsWith('a/'))
    expect(out.indexOf(inA[1]) - out.indexOf(inA[0])).toBe(1)
  })

  it('puts a directory before a file of the same name', () => {
    expect(sorted(['src.ts', 'src/index.ts'])).toEqual(['src/index.ts', 'src.ts'])
  })

  it('lists directories before files at every level', () => {
    expect(sorted(['skills/README.md', 'skills/butler/notes.md', 'skills/W1.md'])).toEqual([
      'skills/butler/notes.md',
      'skills/README.md',
      'skills/W1.md'
    ])
  })

  it('sorts directories before files under byte order too', () => {
    const byByte = (a: string, b: string): number => comparePaths(a, b, false)
    expect(['zzz/a.md', 'aaa.md'].sort(byByte)).toEqual(['zzz/a.md', 'aaa.md'])
  })

  it('is a total order — ties in the collator still separate', () => {
    expect(comparePaths('a.md', 'A.md')).not.toBe(0)
    expect(comparePaths('a.md', 'A.md')).toBe(-comparePaths('A.md', 'a.md'))
  })
})

describe('shellQuote', () => {
  it('wraps an ordinary path in quotes', () => {
    expect(shellQuote('/tmp/gitty-snapshot-abc/run.sh')).toBe("'/tmp/gitty-snapshot-abc/run.sh'")
  })

  it('keeps spaces and shell punctuation inside one word', () => {
    expect(shellQuote('a b;rm -rf $HOME')).toBe("'a b;rm -rf $HOME'")
  })

  it('closes, escapes and reopens around a single quote', () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'")
  })
})

describe('matchesFilter', () => {
  it('matches plain text as the substring it looks like', () => {
    expect(matchesFilter('src/main/git.ts', 'main')).toBe(true)
    expect(matchesFilter('src/main/git.ts', 'renderer')).toBe(false)
  })

  it('ignores case on both sides', () => {
    expect(matchesFilter('src/README.md', 'readme')).toBe(true)
    expect(matchesFilter('src/readme.md', 'README')).toBe(true)
  })

  it('reads the needle as an expression', () => {
    expect(matchesFilter('src/main/git.ts', 'main|renderer')).toBe(true)
    expect(matchesFilter('src/renderer/App.tsx', 'main|renderer')).toBe(true)
    expect(matchesFilter('src/shared/types.ts', 'main|renderer')).toBe(false)
    expect(matchesFilter('src/main/git.ts', '\\.tsx?$')).toBe(true)
    expect(matchesFilter('src/main/git.ts', '^main')).toBe(false)
  })

  it('falls back to a literal substring while the expression is half typed', () => {
    expect(matchesFilter('src/(main)/a.ts', 'src/(')).toBe(true)
    expect(matchesFilter('src/main/a.ts', 'src/(')).toBe(false)
    expect(matchesFilter('a*b.ts', '*b')).toBe(true)
  })

  it('recompiles when the needle changes', () => {
    expect(matchesFilter('a.ts', 'a')).toBe(true)
    expect(matchesFilter('a.ts', 'b')).toBe(false)
    expect(matchesFilter('a.ts', 'a')).toBe(true)
  })
})
