/**
 * The new-side line numbers a patch marks as added for one file — the lines a
 * preview of that file should colour green, the diff's own add colour.
 *
 * DiffPane parses the same patch into rows for drawing; this is a separate,
 * import-free module because it only needs the numbers, not the rows, and
 * because the test suite is compiled by the node project, which cannot import
 * a `.tsx`. The two parsers count new-side lines the same way — a hunk header
 * starts the count, an add or context line moves it on, a deletion and a
 * `\ No newline` marker do not — so a number named here is the number the diff
 * drew.
 */
const FILE_LINE = /^diff --(?:git|cc) (?:a\/(.+?) b\/(.+)|(.+))$/

/** The path a `diff --git` heading resolves to: the new side, past a rename. */
function newPath(text: string): string {
  const m = FILE_LINE.exec(text)
  if (!m) return text
  const [, from, to, combined] = m
  return combined ?? to ?? from
}

/**
 * The 1-based new-side source lines of `path` that `patch` marks as inserted.
 * A modified line is a deletion followed by an addition, so these are the
 * changed lines too. An empty patch, or one that does not touch `path`, yields
 * an empty set.
 */
export function addedNewLines(patch: string, path: string): Set<number> {
  const out = new Set<number>()
  if (!patch) return out
  let newNo = 0
  let file = ''
  let inHeader = false
  for (const text of patch.split('\n')) {
    if (text.startsWith('diff --git') || text.startsWith('diff --cc')) {
      inHeader = true
      file = newPath(text)
    } else if (text.startsWith('\\ No newline')) {
      // The marker stands for no line; it moves neither side's count.
    } else if (text.startsWith('@@')) {
      // The new-side count restarts here for the hunk's body.
      inHeader = false
      const m = /^@@+ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(text)
      if (m) newNo = Number(m[2])
    } else if (inHeader) {
      // `index`, `---`, `+++` and the mode lines between the heading and the
      // hunk carry no line of their own — but a deleted line reading "-- …"
      // only looks like a header, which is exactly why the header ends at the
      // first `@@` and these are skipped only before it.
    } else if (text.startsWith('+')) {
      if (file === path) out.add(newNo)
      newNo++
    } else if (text.startsWith('-')) {
      // Only the new side can colour a preview.
    } else {
      newNo++
    }
  }
  return out
}
