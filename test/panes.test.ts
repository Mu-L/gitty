import { describe, expect, it } from 'vitest'
import {
  ALL_PANES,
  BROWSE_PANES,
  isBrowseChord,
  nextPane,
  type PaneVisibility
} from '../src/renderer/src/panes'

/** Layout order is files, diff, log, terminal. */
const only = (...ids: Array<keyof PaneVisibility>): PaneVisibility => ({
  files: ids.includes('files'),
  diff: ids.includes('diff'),
  log: ids.includes('log'),
  terminal: ids.includes('terminal')
})

describe('nextPane', () => {
  it('walks the layout order', () => {
    expect(nextPane('files', ALL_PANES)).toBe('diff')
    expect(nextPane('diff', ALL_PANES)).toBe('log')
    expect(nextPane('log', ALL_PANES)).toBe('terminal')
  })

  it('wraps at both ends', () => {
    expect(nextPane('terminal', ALL_PANES)).toBe('files')
    expect(nextPane('files', ALL_PANES, true)).toBe('terminal')
  })

  it('steps back in the same order', () => {
    expect(nextPane('log', ALL_PANES, true)).toBe('diff')
  })

  it('skips the hidden panes', () => {
    const panes = only('files', 'terminal')
    expect(nextPane('files', panes)).toBe('terminal')
    expect(nextPane('terminal', panes)).toBe('files')
  })

  it('stays put when it is the only pane left', () => {
    expect(nextPane('diff', only('diff'))).toBe('diff')
    expect(nextPane('diff', only('diff'), true)).toBe('diff')
  })

  it('has nothing to cycle from when the pane itself is hidden', () => {
    expect(nextPane('log', only('files', 'diff'))).toBeNull()
  })
})

/** Only the fields the chord reads; a KeyboardEvent needs a DOM to construct. */
const key = (over: Partial<KeyboardEvent>): KeyboardEvent =>
  ({
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    code: '',
    ...over
  }) as KeyboardEvent

describe('isBrowseChord', () => {
  it('takes Ctrl+B, and Cmd+B on macOS', () => {
    expect(isBrowseChord(key({ ctrlKey: true, code: 'KeyB' }))).toBe(true)
    expect(isBrowseChord(key({ metaKey: true, code: 'KeyB' }))).toBe(true)
  })

  it('leaves the plain key and the other modifiers alone', () => {
    expect(isBrowseChord(key({ code: 'KeyB' }))).toBe(false)
    expect(isBrowseChord(key({ ctrlKey: true, shiftKey: true, code: 'KeyB' }))).toBe(false)
    expect(isBrowseChord(key({ ctrlKey: true, altKey: true, code: 'KeyB' }))).toBe(false)
  })

  it('reads the code, not the character', () => {
    expect(isBrowseChord(key({ ctrlKey: true, code: 'KeyV' }))).toBe(false)
  })
})

describe('BROWSE_PANES', () => {
  it('is the reading layout: the tree and what it opens', () => {
    expect(BROWSE_PANES).toEqual(only('files', 'diff'))
  })
})
