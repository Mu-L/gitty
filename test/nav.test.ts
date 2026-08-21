import { describe, expect, it } from 'vitest'
// nav.ts names a `View`, which is declared beside the context menus and reaches
// types from a .tsx — so this test belongs to the web project, as panes' does.
import { NAV_HOME, newNavHistory, prunePlaces, type NavHistory, type NavPlace } from '../src/renderer/src/nav'

const commit = (hash: string): NavPlace => ({
  view: { mode: 'commit', hash, short: hash.slice(0, 7), subject: hash },
  selectedFile: null,
  doc: null
})

const snapshot = (hash: string | null): NavPlace => ({
  view: { mode: 'snapshot', hash, short: hash ? hash.slice(0, 7) : '', subject: '' },
  selectedFile: null,
  doc: null
})

const range = (from: string, to: string): NavPlace => ({
  view: { mode: 'range', from, to },
  selectedFile: null,
  doc: null
})

const reading = (rev: string | null): NavPlace => ({
  view: { mode: 'worktree' },
  selectedFile: 'a.ts',
  doc: { kind: 'file', id: `file:${rev ?? 'work'}:a.ts`, path: 'a.ts', rev, preview: false }
})

const history = (places: NavPlace[], index = places.length - 1): NavHistory => ({ places, index })

const dead = (...hashes: string[]) => (h: string): boolean => hashes.includes(h)

describe('prunePlaces', () => {
  it('keeps the history it finds nothing wrong with, object and all', () => {
    const h = history([NAV_HOME, commit('aaa'), commit('bbb')])
    expect(prunePlaces(h, dead('ccc'))).toBe(h)
  })

  it('drops the places naming a rewritten commit', () => {
    const h = history([NAV_HOME, commit('aaa'), snapshot('bbb'), commit('ccc')])
    const p = prunePlaces(h, dead('bbb'))
    expect(p.places).toEqual([NAV_HOME, commit('aaa'), commit('ccc')])
  })

  it('drops a range with either end rewritten', () => {
    const h = history([NAV_HOME, range('aaa', 'bbb'), range('ccc', 'ddd')])
    expect(prunePlaces(h, dead('ddd')).places).toEqual([NAV_HOME, range('aaa', 'bbb')])
  })

  it('drops a place whose document was read at a rewritten commit', () => {
    const h = history([NAV_HOME, reading('aaa'), reading(null)])
    expect(prunePlaces(h, dead('aaa')).places).toEqual([NAV_HOME, reading(null)])
  })

  it('leaves the work tree alone — no rewrite can take it away', () => {
    const h = history([NAV_HOME, snapshot(null)])
    expect(prunePlaces(h, () => true).places).toEqual([NAV_HOME, snapshot(null)])
  })

  it('moves the index back to the nearest surviving place', () => {
    const h = history([NAV_HOME, commit('aaa'), commit('bbb'), commit('ccc')], 3)
    const p = prunePlaces(h, dead('bbb', 'ccc'))
    expect(p.places).toEqual([NAV_HOME, commit('aaa')])
    expect(p.index).toBe(1)
  })

  it('keeps the index on a surviving place, counting only what is left', () => {
    const h = history([NAV_HOME, commit('aaa'), commit('bbb'), commit('ccc')], 3)
    const p = prunePlaces(h, dead('aaa'))
    expect(p.places).toEqual([NAV_HOME, commit('bbb'), commit('ccc')])
    expect(p.index).toBe(2)
  })

  it('does not leave the same stop twice where one was removed between them', () => {
    const h = history([NAV_HOME, commit('aaa'), commit('bbb'), commit('aaa')], 3)
    const p = prunePlaces(h, dead('bbb'))
    expect(p.places).toEqual([NAV_HOME, commit('aaa')])
    expect(p.index).toBe(1)
  })

  it('starts over when nothing survives', () => {
    const h = history([commit('aaa'), commit('bbb')], 1)
    expect(prunePlaces(h, () => true)).toEqual(newNavHistory())
  })
})
