import { describe, expect, it } from 'vitest'
import { buildPatch, hasStageableHunks, parseFilePatch } from '../src/main/patch'

/** Three separate hunks in one file, far enough apart not to merge. */
const THREE_HUNKS = [
  'diff --git a/a.txt b/a.txt',
  'index 1111111..2222222 100644',
  '--- a/a.txt',
  '+++ b/a.txt',
  '@@ -1,3 +1,3 @@',
  ' one',
  '-two',
  '+TWO',
  ' three',
  '@@ -10,3 +10,3 @@',
  ' ten',
  '-eleven',
  '+ELEVEN',
  ' twelve',
  '@@ -20,3 +20,3 @@ func()',
  ' twenty',
  '-twentyone',
  '+TWENTYONE',
  ' twentytwo',
  ''
].join('\n')

/** One hunk mixing several additions and deletions. */
const MIXED = [
  'diff --git a/m.txt b/m.txt',
  'index 1111111..2222222 100644',
  '--- a/m.txt',
  '+++ b/m.txt',
  '@@ -1,4 +1,4 @@',
  ' keep',
  '-old1',
  '-old2',
  '+new1',
  '+new2',
  ' tail',
  ''
].join('\n')

describe('parseFilePatch', () => {
  it('splits the header from the hunks', () => {
    const fp = parseFilePatch(THREE_HUNKS)
    expect(fp.header).toEqual([
      'diff --git a/a.txt b/a.txt',
      'index 1111111..2222222 100644',
      '--- a/a.txt',
      '+++ b/a.txt'
    ])
    expect(fp.hunks).toHaveLength(3)
    expect(fp.hunks[0].lines).toEqual([' one', '-two', '+TWO', ' three'])
  })

  it('keeps a section heading on the hunk header', () => {
    expect(parseFilePatch(THREE_HUNKS).hunks[2].header).toBe('@@ -20,3 +20,3 @@ func()')
  })

  it('has no stageable hunks for a binary or mode-only patch', () => {
    const modeOnly = [
      'diff --git a/s.sh b/s.sh',
      'old mode 100644',
      'new mode 100755',
      ''
    ].join('\n')
    expect(hasStageableHunks(parseFilePatch(modeOnly))).toBe(false)
    expect(hasStageableHunks(parseFilePatch(THREE_HUNKS))).toBe(true)
  })
})

describe('buildPatch — whole hunks', () => {
  it('keeps only the picked hunk, header and all', () => {
    const fp = parseFilePatch(THREE_HUNKS)
    const out = buildPatch(fp, [{ hunk: 1 }], 'stage')
    expect(out).toBe(
      [
        'diff --git a/a.txt b/a.txt',
        'index 1111111..2222222 100644',
        '--- a/a.txt',
        '+++ b/a.txt',
        '@@ -10,3 +10,3 @@',
        ' ten',
        '-eleven',
        '+ELEVEN',
        ' twelve',
        ''
      ].join('\n')
    )
  })

  it('emits picked hunks in file order however they were picked', () => {
    const fp = parseFilePatch(THREE_HUNKS)
    const out = buildPatch(fp, [{ hunk: 2 }, { hunk: 0 }], 'stage')
    const heads = out.split('\n').filter((l) => l.startsWith('@@'))
    expect(heads).toEqual(['@@ -1,3 +1,3 @@', '@@ -20,3 +20,3 @@ func()'])
  })

  it('is empty when the picks name nothing that exists', () => {
    expect(buildPatch(parseFilePatch(THREE_HUNKS), [{ hunk: 7 }], 'stage')).toBe('')
  })
})

describe('buildPatch — selected lines, staging', () => {
  it('drops unselected additions and demotes unselected deletions', () => {
    const fp = parseFilePatch(MIXED)
    // lines: 0 ' keep', 1 '-old1', 2 '-old2', 3 '+new1', 4 '+new2', 5 ' tail'
    const out = buildPatch(fp, [{ hunk: 0, lines: [1, 3] }], 'stage')
    expect(out.split('\n').slice(4)).toEqual([
      // old1 → new1 only: old2 stays as it is, new2 is not staged yet. The
      // addition lands after old2, exactly as editing the hunk by hand in
      // `git add -p` would put it — a unified diff has no other order.
      '@@ -1,4 +1,4 @@',
      ' keep',
      '-old1',
      ' old2',
      '+new1',
      ' tail',
      ''
    ])
  })

  it('counts the rebuilt hunk from the lines it actually holds', () => {
    const fp = parseFilePatch(MIXED)
    // Only the first deletion is staged: the pre-image still has its four
    // lines, the post-image is one shorter.
    const out = buildPatch(fp, [{ hunk: 0, lines: [1] }], 'stage')
    expect(out).toContain('@@ -1,4 +1,3 @@')
  })

  it('leaves the hunk out when nothing in it was selected', () => {
    const fp = parseFilePatch(THREE_HUNKS)
    expect(buildPatch(fp, [{ hunk: 0, lines: [] }], 'stage')).toBe('')
  })

  it('moves later hunks by what the earlier ones did', () => {
    const fp = parseFilePatch(THREE_HUNKS)
    // The first hunk stages only its deletion, so the file is one line
    // shorter by the time the second hunk is read.
    const out = buildPatch(fp, [{ hunk: 0, lines: [1] }, { hunk: 1 }], 'stage')
    const heads = out.split('\n').filter((l) => l.startsWith('@@'))
    expect(heads).toEqual(['@@ -1,3 +1,2 @@', '@@ -10,3 +9,3 @@'])
  })
})

describe('buildPatch — selected lines, unstaging', () => {
  it('drops unselected deletions and demotes unselected additions', () => {
    const fp = parseFilePatch(MIXED)
    const out = buildPatch(fp, [{ hunk: 0, lines: [1, 3] }], 'unstage')
    expect(out.split('\n').slice(4)).toEqual([
      // Reversed against the index, which holds new1 and new2: new2 is still
      // there and becomes context, old2 is not and goes.
      '@@ -1,4 +1,4 @@',
      ' keep',
      '-old1',
      '+new1',
      ' new2',
      ' tail',
      ''
    ])
  })

  it('trusts the b-side position and moves the a-side one', () => {
    const fp = parseFilePatch(THREE_HUNKS)
    const out = buildPatch(fp, [{ hunk: 0, lines: [2] }, { hunk: 1 }], 'unstage')
    const heads = out.split('\n').filter((l) => l.startsWith('@@'))
    // First hunk takes back only the addition: +1 line, so the a side of the
    // next hunk sits one line earlier.
    expect(heads).toEqual(['@@ -1,2 +1,3 @@', '@@ -9,3 +10,3 @@'])
  })
})

describe('buildPatch — no newline at end of file', () => {
  const NO_NL = [
    'diff --git a/n.txt b/n.txt',
    'index 1111111..2222222 100644',
    '--- a/n.txt',
    '+++ b/n.txt',
    '@@ -1,2 +1,2 @@',
    ' first',
    '-last',
    '\\ No newline at end of file',
    '+last!',
    '\\ No newline at end of file',
    ''
  ].join('\n')

  it('keeps each marker with the line it belongs to', () => {
    const out = buildPatch(parseFilePatch(NO_NL), [{ hunk: 0 }], 'stage')
    expect(out.split('\n').slice(4)).toEqual([
      '@@ -1,2 +1,2 @@',
      ' first',
      '-last',
      '\\ No newline at end of file',
      '+last!',
      '\\ No newline at end of file',
      ''
    ])
  })

  it('drops a marker whose line was dropped', () => {
    // Stage the deletion only: the addition and its marker go.
    const out = buildPatch(parseFilePatch(NO_NL), [{ hunk: 0, lines: [1] }], 'stage')
    expect(out.split('\n').slice(4)).toEqual([
      '@@ -1,2 +1,1 @@',
      ' first',
      '-last',
      '\\ No newline at end of file',
      ''
    ])
  })

  it('does not count a marker as a line', () => {
    const out = buildPatch(parseFilePatch(NO_NL), [{ hunk: 0 }], 'stage')
    expect(out).toContain('@@ -1,2 +1,2 @@')
  })
})

describe('buildPatch — zero context', () => {
  // What -U0 produces: no surrounding lines at all, one hunk per run.
  const ZERO = [
    'diff --git a/z.txt b/z.txt',
    'index 1111111..2222222 100644',
    '--- a/z.txt',
    '+++ b/z.txt',
    '@@ -3 +3 @@',
    '-three',
    '+THREE',
    '@@ -9 +9 @@',
    '-nine',
    '+NINE',
    ''
  ].join('\n')

  it('reads a header with no comma counts', () => {
    const fp = parseFilePatch(ZERO)
    expect(fp.hunks).toHaveLength(2)
    expect(buildPatch(fp, [{ hunk: 1 }], 'stage')).toContain('@@ -9,1 +9,1 @@')
  })
})
