import { describe, expect, it } from 'vitest'
import { column, layoutLanes, MAX_LANES } from '../src/renderer/src/lanes'

/** A linear history, newest first, as `git log` hands it over. */
const linear = [
  { hash: 'c', parents: ['b'] },
  { hash: 'b', parents: ['a'] },
  { hash: 'a', parents: [] }
]

describe('layoutLanes', () => {
  it('keeps a linear history in one lane', () => {
    const { rows, lanes } = layoutLanes(linear)
    expect(lanes).toBe(1)
    expect(rows.map((r) => r.lane)).toEqual([0, 0, 0])
    expect(rows.map((r) => r.incoming)).toEqual([false, true, true])
    expect(rows.map((r) => r.through)).toEqual([[], [], []])
  })

  it('closes the lane at a root commit', () => {
    // Nothing below the dot: the history ends there.
    expect(layoutLanes(linear).rows[2].edges).toEqual([])
  })

  it('gives a merge one edge per parent, landing in two lanes', () => {
    //  m ── merge of the tip of a side branch (s) and the main line (b)
    const { rows, lanes } = layoutLanes([
      { hash: 'm', parents: ['b', 's'] },
      { hash: 'b', parents: ['a'] },
      { hash: 's', parents: ['a'] },
      { hash: 'a', parents: [] }
    ])
    expect(lanes).toBe(2)
    // The merge sits in lane 0 and sends a line to each parent's lane.
    expect(rows[0].edges).toEqual([
      { from: 0, to: 0 },
      { from: 0, to: 1 }
    ])
    // b took the lane it was expected in, s the one the merge opened for it.
    expect(rows[1].lane).toBe(0)
    expect(rows[2].lane).toBe(1)
    // While b is drawn, the side branch's line passes it.
    expect(rows[1].through).toEqual([1])
  })

  it('merges two lanes that expect the same parent into one', () => {
    const { rows } = layoutLanes([
      { hash: 'm', parents: ['b', 'a'] },
      { hash: 'b', parents: ['a'] },
      { hash: 'a', parents: [] }
    ])
    // Both parents of the merge are already accounted for: 'a' is expected in
    // the lane the merge opened, and b's own parent is the same commit, so it
    // lands there rather than opening a third lane.
    expect(rows[1].edges).toEqual([{ from: 0, to: 1 }])
    expect(rows[2].lane).toBe(1)
  })

  it('reuses a lane freed by a branch that ended', () => {
    const { rows, lanes } = layoutLanes([
      { hash: 'm', parents: ['b', 's'] },
      { hash: 's', parents: [] }, // side branch is a root: its lane frees up
      { hash: 'b', parents: ['a'] },
      { hash: 'a', parents: [] }
    ])
    expect(rows[1].lane).toBe(1)
    expect(rows[2].lane).toBe(0)
    expect(lanes).toBe(2)
  })

  it('lays out a prefix the same way whether or not more commits follow', () => {
    // The property paging depends on: the first page must not be re-drawn
    // when the second arrives.
    const long = [
      { hash: 'm', parents: ['b', 's'] },
      { hash: 'b', parents: ['a'] },
      { hash: 's', parents: ['a'] },
      { hash: 'a', parents: ['z'] },
      { hash: 'z', parents: [] }
    ]
    const first = layoutLanes(long.slice(0, 3))
    const whole = layoutLanes(long)
    expect(whole.rows.slice(0, 3)).toEqual(first.rows)
  })

  it('folds lanes past the cap onto the last column', () => {
    expect(column(0)).toBe(0)
    expect(column(MAX_LANES - 1)).toBe(MAX_LANES - 1)
    expect(column(MAX_LANES + 5)).toBe(MAX_LANES - 1)
  })

  it('never reports more lanes than the cap', () => {
    // Twelve independent roots, each opening a lane of its own.
    const many = Array.from({ length: 12 }, (_, i) => ({ hash: `h${i}`, parents: [`p${i}`] }))
    expect(layoutLanes(many).lanes).toBe(MAX_LANES)
  })
})
