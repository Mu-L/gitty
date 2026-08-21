import { describe, expect, it } from 'vitest'
import { decorateSegment, markClass, mergeMarks } from '../src/plugins/marks'

/**
 * The placing half of the `marks` extension point — see `ref/spec/plugins.md`.
 * A broken escape here does not throw, it renders the author's text as markup.
 */

describe('markClass', () => {
  it('namespaces what a plugin calls the thing it found', () => {
    expect(markClass('semantic-reading', 'person')).toBe('pl-semantic-reading-person')
  })

  it('refuses anything that would not survive a selector', () => {
    expect(() => markClass('a plugin', 'x')).toThrow()
    expect(() => markClass('ok', 'x y')).toThrow()
    expect(() => markClass('ok', '.x')).toThrow()
  })
})

describe('mergeMarks', () => {
  it('answers ascending whatever order it was given', () => {
    const out = mergeMarks([
      { pluginId: 'p', marks: [{ start: 5, end: 7, className: 'b' }, { start: 0, end: 2, className: 'a' }] }
    ])
    expect(out.map((m) => m.start)).toEqual([0, 5])
  })

  it('lets the first plugin win an overlap', () => {
    const out = mergeMarks([
      { pluginId: 'first', marks: [{ start: 0, end: 4, className: 'a' }] },
      { pluginId: 'second', marks: [{ start: 2, end: 6, className: 'b' }] }
    ])
    expect(out).toEqual([{ start: 0, end: 4, className: 'pl-first-a' }])
  })

  it('drops a mark that runs backwards rather than clamping it', () => {
    expect(mergeMarks([{ pluginId: 'p', marks: [{ start: 4, end: 4, className: 'a' }] }])).toEqual([])
    expect(mergeMarks([{ pluginId: 'p', marks: [{ start: 4, end: 1, className: 'a' }] }])).toEqual([])
  })
})

describe('decorateSegment', () => {
  it('wraps each mark and escapes everything else', () => {
    expect(decorateSegment('a <b> Rome', [{ start: 6, end: 10, className: 'pl-x-place' }])).toBe(
      'a &lt;b&gt; <span class="pl-mark pl-x-place">Rome</span>'
    )
  })

  it('escapes the marked text too', () => {
    expect(decorateSegment('<i>', [{ start: 0, end: 3, className: 'pl-x-y' }])).toBe(
      '<span class="pl-mark pl-x-y">&lt;i&gt;</span>'
    )
  })

  it('escapes a segment with no marks at all', () => {
    expect(decorateSegment('a & b', [])).toBe('a &amp; b')
  })

  it('drops a mark past the end rather than emitting broken markup', () => {
    expect(decorateSegment('short', [{ start: 2, end: 99, className: 'pl-x-y' }])).toBe('short')
  })
})
