/**
 * Ranking paths against what has been typed, for the quick-open box.
 *
 * The needle is a *subsequence*, not a substring: `dfpn` finds
 * `components/DiffPane.tsx`, because the letters appear in that order with
 * anything in between. That is what makes the box worth a keystroke — the file
 * you want is reachable by its initials, without remembering where it lives.
 *
 * Scoring is what turns a list of matches into a useful order, and it rewards
 * three things: letters that land on a word boundary (the start of a path
 * segment, or after `-`, `_`, `.`, or a lowercase-to-uppercase step, which is
 * how initials are typed), letters that land in the file name rather than in
 * the directories leading to it, and runs of letters that stay together. A
 * shorter path breaks a tie, since a match spread over less text is the more
 * literal one.
 *
 * A leaf module: no imports, pure string work, so it is testable without a
 * repository and cannot drag anything into the bundle.
 */

/** One ranked path, with the positions that matched so they can be marked. */
export interface QuickHit {
  path: string
  score: number
  /** Indices into `path` that the needle matched, ascending. */
  positions: number[]
}

/** A letter starting a word scores this: the first letter of a segment, or after a separator. */
const BOUNDARY = 10
/** A letter inside the file name, rather than in the directories above it. */
const IN_NAME = 4
/** A letter directly after the previous match — a run reads as one word typed. */
const CONSECUTIVE = 8
/** Every matched letter is worth something, so a longer needle outranks a shorter one. */
const MATCH = 1
/** An exact-case letter, which distinguishes a deliberate `DP` from `dp`. */
const EXACT_CASE = 1

const SEPARATORS = '/\\-_. '

/** True where `i` starts a word: the string's start, after a separator, or a camel-case step. */
function isBoundary(hay: string, i: number): boolean {
  if (i === 0) return true
  const prev = hay[i - 1]
  if (SEPARATORS.includes(prev)) return true
  return prev === prev.toLowerCase() && prev !== prev.toUpperCase() && hay[i] !== hay[i].toLowerCase()
}

/** Where the file name starts — one past the last slash, or 0 for a bare name. */
function nameStart(path: string): number {
  return path.lastIndexOf('/') + 1
}

/**
 * Best score for matching `needle` into `path`, with the positions it used, or
 * `null` when the letters are not there in order.
 *
 * A dynamic program over (needle letter, path position), which is what makes
 * the answer the *best* placement rather than the leftmost one: greedily taking
 * the first `d` in `src/renderer/...` would spend the letter on a directory and
 * never reach `DiffPane`. Each row keeps a running best of the row above, so
 * the whole thing stays one pass per letter.
 */
export function scorePath(path: string, needle: string): QuickHit | null {
  if (needle === '') return { path, score: 0, positions: [] }
  const hay = path
  const hayLower = hay.toLowerCase()
  const needleLower = needle.toLowerCase()
  const n = hay.length
  const m = needleLower.length
  if (m > n) return null

  const start = nameStart(hay)
  // The standing worth of landing on each position, independent of what came
  // before it; only the run bonus depends on the previous letter.
  const place = new Array<number>(n)
  for (let j = 0; j < n; j++) {
    place[j] = MATCH + (isBoundary(hay, j) ? BOUNDARY : 0) + (j >= start ? IN_NAME : 0)
  }

  const NONE = -Infinity
  let row = new Array<number>(n).fill(NONE)
  // For each cell, where the previous letter matched — the trail back to the positions.
  const from: Int32Array[] = []

  for (let i = 0; i < m; i++) {
    const next = new Array<number>(n).fill(NONE)
    const back = new Int32Array(n).fill(-1)
    // Best cell of the previous row strictly left of j, carried along as we go.
    let bestLeft = NONE
    let bestLeftAt = -1
    for (let j = 0; j < n; j++) {
      if (i > 0) {
        const left = row[j - 1] ?? NONE
        if (left > bestLeft) {
          bestLeft = left
          bestLeftAt = j - 1
        }
      }
      if (hayLower[j] !== needleLower[i]) continue
      const exact = hay[j] === needle[i] ? EXACT_CASE : 0
      if (i === 0) {
        // The first letter may land anywhere, but earlier is very slightly better.
        next[j] = place[j] + exact - j * 0.01
        back[j] = -1
      } else {
        const runFrom = row[j - 1] ?? NONE
        const run = runFrom === NONE ? NONE : runFrom + CONSECUTIVE
        const jump = bestLeft
        if (run === NONE && jump === NONE) continue
        if (run >= jump) {
          next[j] = run + place[j] + exact
          back[j] = j - 1
        } else {
          next[j] = jump + place[j] + exact
          back[j] = bestLeftAt
        }
      }
    }
    from.push(back)
    row = next
  }

  let best = NONE
  let bestAt = -1
  for (let j = 0; j < n; j++) {
    if (row[j] > best) {
      best = row[j]
      bestAt = j
    }
  }
  if (bestAt < 0) return null

  const positions: number[] = []
  let j = bestAt
  for (let i = m - 1; i >= 0; i--) {
    positions.push(j)
    j = from[i][j]
  }
  positions.reverse()
  // A shorter path wins a tie: the same letters over less text is the closer fit.
  return { path, score: best - hay.length * 0.02, positions }
}

/**
 * The paths that match, best first, cut to `limit`.
 *
 * An empty needle is the list as it stands — the box opens showing the
 * repository rather than nothing, so it is browsable before anything is typed.
 */
export function rankPaths(paths: string[], needle: string, limit: number): QuickHit[] {
  const term = needle.trim()
  if (term === '') return paths.slice(0, limit).map((path) => ({ path, score: 0, positions: [] }))
  const hits: QuickHit[] = []
  for (const path of paths) {
    const hit = scorePath(path, term)
    if (hit) hits.push(hit)
  }
  // Ties break on the path itself, so the order is the same from one keystroke
  // to the next and a row does not swap places under the cursor.
  hits.sort((a, b) => b.score - a.score || (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return hits.slice(0, limit)
}

/**
 * A path cut into runs, alternating unmatched and matched, for drawing. The
 * first run is always unmatched and may be empty, so a caller can rely on the
 * alternation rather than testing each piece.
 */
export function highlightRuns(path: string, positions: number[]): string[] {
  const runs: string[] = []
  let at = 0
  let k = 0
  while (k < positions.length) {
    let end = k
    while (end + 1 < positions.length && positions[end + 1] === positions[end] + 1) end++
    runs.push(path.slice(at, positions[k]))
    runs.push(path.slice(positions[k], positions[end] + 1))
    at = positions[end] + 1
    k = end + 1
  }
  runs.push(path.slice(at))
  return runs
}
