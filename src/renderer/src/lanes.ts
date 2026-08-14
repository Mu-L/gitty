/**
 * Lane assignment for the commit graph.
 *
 * Not `git log --graph`: that output is typeset for a terminal, it is brittle
 * to parse and it cannot be drawn any other way once parsed. What the log
 * already fetches — each commit and its parents, in date order — is enough to
 * compute the lanes here and draw them as shapes.
 *
 * The rule is the usual one, in three lines. A lane holds the hash it expects
 * next. A commit takes the first lane expecting it, or opens one. Its first
 * parent stays in that lane, and every other parent takes a lane of its own,
 * reusing a gap where there is one — which is what makes a merge visible: two
 * lines leaving one dot.
 *
 * The whole list is laid out from the beginning every time rather than
 * continued from a saved state at the page boundary. It is a left-to-right
 * fold, so the first 300 rows come out identical whether 300 or 900 commits
 * were passed — which is exactly the property the paging needs, and it is
 * cheaper to get it this way than to keep the boundary state correct.
 *
 * A leaf module: pure functions over plain data, no imports that would drag a
 * chunk along, and testable without a repository.
 */

/** One commit, as far as the graph is concerned. */
export interface GraphCommit {
  hash: string
  parents: string[]
}

/** A line leaving a commit's dot and landing in a parent's lane. */
export interface LaneEdge {
  from: number
  to: number
}

export interface LaneRow {
  /** The lane the commit's dot sits in. */
  lane: number
  /** True when a line comes down into the dot from the row above. */
  incoming: boolean
  /** Lines leaving the dot downwards, one per parent. */
  edges: LaneEdge[]
  /** Lanes that pass this row belonging to some other commit. */
  through: number[]
}

export interface LaneLayout {
  rows: LaneRow[]
  /** Widest the graph ever gets, for sizing the column once for the list. */
  lanes: number
}

/**
 * Lanes beyond this are folded onto the last column. A repository with forty
 * concurrent heads would otherwise push the subjects off the pane, and the
 * shape of a fortieth lane tells nobody anything.
 */
export const MAX_LANES = 10

/** Where a lane is drawn, in lanes — the overflow shares the last column. */
export function column(lane: number): number {
  return Math.min(lane, MAX_LANES - 1)
}

export function layoutLanes(commits: GraphCommit[]): LaneLayout {
  // Each slot holds the hash that lane is waiting for; '' is a free slot.
  const open: string[] = []
  const rows: LaneRow[] = []
  let lanes = 0

  const free = (): number => {
    const gap = open.indexOf('')
    if (gap >= 0) return gap
    open.push('')
    return open.length - 1
  }

  for (const commit of commits) {
    let lane = open.indexOf(commit.hash)
    const incoming = lane >= 0
    if (!incoming) {
      lane = free()
    }

    // Lanes busy with somebody else's line as this row is drawn. Taken before
    // the parents move in, so a lane this commit is about to occupy is not
    // also drawn as passing through.
    const through: number[] = []
    for (let i = 0; i < open.length; i++) {
      if (i !== lane && open[i] !== '') through.push(i)
    }

    const edges: LaneEdge[] = []
    // Released before the parents are placed, so the first of them can take it
    // back — and so a first parent that is *already expected somewhere else*
    // can join that lane instead, leaving this one free rather than leaving
    // two lanes waiting for the same commit and one of them dangling forever.
    open[lane] = ''

    for (const parent of commit.parents) {
      const existing = open.indexOf(parent)
      const target = existing >= 0 ? existing : open[lane] === '' ? lane : free()
      open[target] = parent
      // A lane that starts here is not added to `through`: the only line in it
      // on this row is the edge below the dot, which `edges` already draws.
      edges.push({ from: lane, to: target })
    }

    // Trailing empty lanes are not lanes; a merge that closed one should
    // narrow the graph again rather than leave it wide for good.
    while (open.length > 0 && open[open.length - 1] === '') open.pop()

    lanes = Math.max(lanes, lane + 1, open.length)
    rows.push({ lane, incoming, edges, through })
  }

  return { rows, lanes: Math.min(lanes, MAX_LANES) }
}
