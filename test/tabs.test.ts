import { describe, expect, it } from 'vitest'
// A renderer module, but a DOM-free one — hence the entry for it in
// tsconfig.node.json, which is the project the tests belong to.
import { moveTab, renameTab, tabBasename, tabLabel } from '../src/renderer/src/tabs'

describe('moveTab', () => {
  const abcd = ['A', 'B', 'C', 'D']

  it('moves a tab to before a later one', () => {
    expect(moveTab(abcd, 0, 3, false)).toEqual(['B', 'C', 'A', 'D'])
  })

  it('moves a tab to after a later one', () => {
    expect(moveTab(abcd, 0, 3, true)).toEqual(['B', 'C', 'D', 'A'])
  })

  it('moves a tab to before an earlier one', () => {
    expect(moveTab(abcd, 3, 0, false)).toEqual(['D', 'A', 'B', 'C'])
  })

  it('moves a tab to after an earlier one', () => {
    expect(moveTab(abcd, 3, 1, true)).toEqual(['A', 'B', 'D', 'C'])
  })

  it('leaves the list alone when moving onto itself', () => {
    expect(moveTab(abcd, 1, 1, true)).toEqual(abcd)
    expect(moveTab(abcd, 1, 1, false)).toEqual(abcd)
  })

  it('does not mutate its input', () => {
    moveTab(abcd, 0, 3, true)
    expect(abcd).toEqual(['A', 'B', 'C', 'D'])
  })
})

describe('tabBasename and tabLabel', () => {
  it('takes the last path segment', () => {
    expect(tabBasename('/home/me/code/gitty')).toBe('gitty')
    expect(tabBasename('gitty')).toBe('gitty')
  })

  it('shows the custom name when there is one', () => {
    expect(tabLabel({ '/home/me/code/gitty': 'G' }, '/home/me/code/gitty')).toBe('G')
  })

  it('falls back to the basename', () => {
    expect(tabLabel({}, '/home/me/code/gitty')).toBe('gitty')
  })
})

describe('renameTab', () => {
  it('stores a custom name', () => {
    expect(renameTab({}, '/r/one', 'Work')).toEqual({ '/r/one': 'Work' })
  })

  it('trims the name', () => {
    expect(renameTab({}, '/r/one', '  Work  ')).toEqual({ '/r/one': 'Work' })
  })

  it('keeps other names', () => {
    const next = renameTab({ '/r/one': 'Old' }, '/r/one', 'New')
    expect(next).toEqual({ '/r/one': 'New' })
  })

  it('clears the override when the name is empty', () => {
    expect(renameTab({ '/r/one': 'Work' }, '/r/one', '')).toEqual({})
  })

  it('clears the override when the name is the basename', () => {
    expect(renameTab({ '/r/one': 'Work' }, '/r/one', 'one')).toEqual({})
  })

  it('does not touch other repositories', () => {
    expect(renameTab({ '/r/two': 'Other' }, '/r/one', 'Work')).toEqual({
      '/r/two': 'Other',
      '/r/one': 'Work'
    })
  })
})
