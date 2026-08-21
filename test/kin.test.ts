import { describe, expect, it } from 'vitest'
import { kinship } from '../src/renderer/src/kin'

/** A linear history, newest first, as `git log` hands it over. */
const linear = [
  { hash: 'c', parents: ['b'] },
  { hash: 'b', parents: ['a'] },
  { hash: 'a', parents: [] }
]

/**
 *  m   merge of a side branch (s) into the main line (b)
 *  |\
 *  b s
 *  |/
 *  a
 */
const merged = [
  { hash: 'm', parents: ['b', 's'] },
  { hash: 'b', parents: ['a'] },
  { hash: 's', parents: ['a'] },
  { hash: 'a', parents: [] }
]

const sorted = (s: Set<string>): string[] => [...s].sort()

describe('kinship', () => {
  it('walks a linear history both ways', () => {
    const k = kinship(linear, 'b')
    expect(sorted(k!.ancestors)).toEqual(['a'])
    expect(sorted(k!.descendants)).toEqual(['c'])
    expect(k!.partial).toBe(false)
  })

  it('leaves the selected commit out of both sets', () => {
    const k = kinship(linear, 'b')
    expect(k!.ancestors.has('b')).toBe(false)
    expect(k!.descendants.has('b')).toBe(false)
  })

  it('follows every parent of a merge', () => {
    const k = kinship(merged, 'm')
    expect(sorted(k!.ancestors)).toEqual(['a', 'b', 's'])
    expect(k!.descendants.size).toBe(0)
  })

  it('reaches a commit through either side of a merge, once', () => {
    // 'a' is the parent of both sides; a second visit must not re-walk it.
    const k = kinship(merged, 'a')
    expect(sorted(k!.descendants)).toEqual(['b', 'm', 's'])
  })

  it('does not make a sibling branch kin', () => {
    const k = kinship(merged, 'b')
    expect(k!.ancestors.has('s')).toBe(false)
    expect(k!.descendants.has('s')).toBe(false)
  })

  it('stops at the edge of what is loaded, and says so', () => {
    // The oldest row names a parent no page has reached.
    const k = kinship([{ hash: 'c', parents: ['b'] }, { hash: 'b', parents: ['a'] }], 'c')
    expect(sorted(k!.ancestors)).toEqual(['b'])
    expect(k!.partial).toBe(true)
  })

  it('has nothing to say about a row that is not a loaded commit', () => {
    expect(kinship(linear, null)).toBe(null)
    expect(kinship(linear, '__worktree__')).toBe(null)
  })
})
