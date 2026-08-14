import { describe, expect, it } from 'vitest'
// A renderer module, but a DOM-free one — hence the entry for it in
// tsconfig.node.json, which is the project the tests belong to.
import { comparePaths } from '../src/renderer/src/paths'

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
