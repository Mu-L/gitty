import { describe, expect, it } from 'vitest'
import { ALL_PANES, nextPane, type PaneVisibility } from '../src/renderer/src/panes'

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
