import { describe, expect, it } from 'vitest'
// A renderer leaf module, hence the entry for it in tsconfig.node.json.
import { addedNewLines } from '../src/renderer/src/diffLines'

const TWO_FILES = [
  'diff --git a/a.md b/a.md',
  'index 1111111..2222222 100644',
  '--- a/a.md',
  '+++ b/a.md',
  '@@ -1,3 +1,4 @@',
  ' one',
  '-two',
  '+TWO',
  '+three',
  ' four',
  'diff --git a/b.md b/b.md',
  'index 3333333..4444444 100644',
  '--- a/b.md',
  '+++ b/b.md',
  '@@ -5 +5 @@',
  ' same',
  '+new',
  ''
].join('\n')

const sorted = (s: Set<number>): number[] => [...s]

describe('addedNewLines', () => {
  it('returns nothing for an empty patch', () => {
    expect(sorted(addedNewLines('', 'a.md'))).toEqual([])
  })

  it('picks the added new-side lines of the matching file', () => {
    // New side: 1 'one', 2 'TWO', 3 'three', 4 'four' — the two additions.
    expect(sorted(addedNewLines(TWO_FILES, 'a.md'))).toEqual([2, 3])
  })

  it('ignores the other files of a multi-file patch', () => {
    expect(sorted(addedNewLines(TWO_FILES, 'b.md'))).toEqual([6])
  })

  it('a deletion with no replacement adds nothing', () => {
    const patch = [
      'diff --git a/c.md b/c.md',
      'index 1111111..2222222 100644',
      '--- a/c.md',
      '+++ b/c.md',
      '@@ -1,2 +1,1 @@',
      ' one',
      '-two'
    ].join('\n')
    // The old line 2 is gone; only the new side can colour a preview.
    expect(sorted(addedNewLines(patch, 'c.md'))).toEqual([])
  })

  it('resolves a rename to its new path', () => {
    const patch = [
      'diff --git a/old.md b/renamed.md',
      'index 1111111..2222222 100644',
      '--- a/old.md',
      '+++ b/renamed.md',
      '@@ -1,2 +1,2 @@',
      ' same',
      '+added'
    ].join('\n')
    expect(sorted(addedNewLines(patch, 'renamed.md'))).toEqual([2])
    expect(sorted(addedNewLines(patch, 'old.md'))).toEqual([])
  })

  it('a new file colours every line it is created with', () => {
    const patch = [
      'diff --git a/new.md b/new.md',
      'new file mode 100644',
      'index 0000000..1111111',
      '--- /dev/null',
      '+++ b/new.md',
      '@@ -0,0 +1,2 @@',
      '+line one',
      '+line two'
    ].join('\n')
    expect(sorted(addedNewLines(patch, 'new.md'))).toEqual([1, 2])
  })

  it('a `\\ No newline` marker does not move the new-side count', () => {
    const patch = [
      'diff --git a/a.md b/a.md',
      'index 1111111..2222222 100644',
      '--- a/a.md',
      '+++ b/a.md',
      '@@ -1,2 +1,2 @@',
      ' same',
      '-gone',
      '+here',
      '\\ No newline at end of file'
    ].join('\n')
    // `here` is the second new-side line; without the marker skip it would be 3.
    expect(sorted(addedNewLines(patch, 'a.md'))).toEqual([2])
  })
})
