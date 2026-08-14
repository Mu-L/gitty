/**
 * Cutting a unified diff down to the parts that should be staged.
 *
 * Pure string work over `git diff` output, like `parse.ts`, so it can be
 * tested without a repository — which matters more here than anywhere else in
 * the project: a patch that is subtly wrong does not throw, it writes a wrong
 * index and says nothing.
 *
 * The direction is part of the arithmetic, not a detail. Staging applies the
 * patch to the index with `git apply --cached`, so the pre-image is the a
 * side; unstaging applies the *cached* diff in reverse, so the pre-image is
 * the b side. That decides which unselected lines are dropped and which turn
 * into context, and which of the two `@@` positions can be trusted.
 */

import type { ApplyDirection, HunkPick } from '../shared/types'

export type { ApplyDirection, HunkPick }

/** One hunk: its `@@` line and the body lines that follow, prefixes intact. */
export interface Hunk {
  header: string
  /**
   * Body lines with their ' ', '+' or '-' prefix. A
   * `\ No newline at end of file` marker is kept here too, immediately after
   * the line it belongs to.
   */
  lines: string[]
}

/** One file's diff: everything before the first hunk, then the hunks. */
export interface FilePatch {
  /** `diff --git`, the mode and index lines, `---` and `+++`. */
  header: string[]
  hunks: Hunk[]
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/

/** True for the `\ No newline at end of file` marker, in any language. */
function isNoNewline(line: string): boolean {
  return line.startsWith('\\')
}

export function parseFilePatch(raw: string): FilePatch {
  const header: string[] = []
  const hunks: Hunk[] = []
  let current: Hunk | null = null

  const lines = raw.split('\n')
  // A patch ends with a newline, so the split leaves one empty tail element
  // that is not a line of the diff.
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

  for (const line of lines) {
    if (HUNK_HEADER.test(line)) {
      current = { header: line, lines: [] }
      hunks.push(current)
    } else if (current) {
      current.lines.push(line)
    } else {
      header.push(line)
    }
  }
  return { header, hunks }
}

/**
 * Whether a hunk can be staged line by line. A binary patch has no hunks at
 * all; a pure mode change or rename has a header and nothing else. Both are
 * file-level operations, and the UI must not offer buttons that would build an
 * empty patch.
 */
export function hasStageableHunks(fp: FilePatch): boolean {
  return fp.hunks.some((h) => h.lines.some((l) => l.startsWith('+') || l.startsWith('-')))
}

interface Rebuilt {
  text: string
  /** Lines the hunk adds minus lines it removes, for the next hunk's position. */
  delta: number
}

/**
 * Rebuild one hunk from a subset of its lines.
 *
 * An unselected line is either dropped or demoted to context, and which one
 * depends on the direction: the pre-image must keep every line it really has.
 * Staging patches the index against the a side, so an unselected `-` line is
 * still there and becomes context while an unselected `+` line was never
 * there and goes. Unstaging is applied in reverse against the b side, so it is
 * the other way round.
 *
 * Returns null when nothing is left to do — a hunk whose every change was
 * deselected is not an empty hunk to emit, it is a hunk to leave out.
 */
function rebuildHunk(
  hunk: Hunk,
  selected: Set<number> | null,
  direction: ApplyDirection,
  before: number
): Rebuilt | null {
  const m = HUNK_HEADER.exec(hunk.header)
  if (!m) return null
  const oldStart = Number(m[1])
  const newStart = Number(m[3])
  const tail = m[5] ?? ''

  const out: string[] = []
  let oldCount = 0
  let newCount = 0
  let changes = 0
  // A "\ No newline" marker only means anything while the line it describes is
  // still in the patch.
  let keptLast = false

  for (let i = 0; i < hunk.lines.length; i++) {
    const line = hunk.lines[i]
    if (isNoNewline(line)) {
      if (keptLast) out.push(line)
      continue
    }
    const sign = line[0]
    if (sign === '+' || sign === '-') {
      const wanted = selected === null || selected.has(i)
      if (wanted) {
        out.push(line)
        if (sign === '+') newCount++
        else oldCount++
        changes++
        keptLast = true
        continue
      }
      const drop = direction === 'stage' ? sign === '+' : sign === '-'
      if (drop) {
        keptLast = false
        continue
      }
      out.push(' ' + line.slice(1))
      oldCount++
      newCount++
      keptLast = true
      continue
    }
    // Context. git writes an empty context line as a bare space, but a patch
    // that has been through an editor can lose it.
    out.push(line === '' ? ' ' : line)
    oldCount++
    newCount++
    keptLast = true
  }

  if (changes === 0) return null

  const delta = newCount - oldCount
  // Only the pre-image side's position is exact: the other one moves with
  // whatever earlier hunks in this same patch did.
  const [a, b] =
    direction === 'stage' ? [oldStart, oldStart + before] : [newStart - before, newStart]

  const head = `@@ -${a},${oldCount} +${b},${newCount} @@${tail}`
  return { text: [head, ...out].join('\n') + '\n', delta }
}

/**
 * A patch holding only the picked hunks and lines, ready for `git apply
 * --cached` (plus `-R` when unstaging). Empty when nothing survived the
 * selection, which the caller should treat as "nothing to do" rather than
 * feeding git a headerless patch.
 */
export function buildPatch(
  fp: FilePatch,
  picks: HunkPick[],
  direction: ApplyDirection
): string {
  const parts: string[] = []
  let before = 0
  // In file order, whatever order the picks arrived in: git apply reads hunks
  // as a sequence and a later one may not start above an earlier one.
  for (const pick of [...picks].sort((x, y) => x.hunk - y.hunk)) {
    const hunk = fp.hunks[pick.hunk]
    if (!hunk) continue
    const built = rebuildHunk(
      hunk,
      pick.lines ? new Set(pick.lines) : null,
      direction,
      before
    )
    if (!built) continue
    parts.push(built.text)
    before += built.delta
  }
  if (parts.length === 0) return ''
  return fp.header.join('\n') + '\n' + parts.join('')
}
