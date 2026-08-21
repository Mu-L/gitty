/**
 * Who a commit descends from, and who descends from it.
 *
 * Selecting a row answers "what is this one built on" only if the answer is
 * drawn: ancestry is the one relation a log cannot show by position, since a
 * row directly above may be on another branch entirely and a parent may sit
 * a hundred rows down. Both sets are walked here so the pane can leave the
 * kin bright and let everything else recede.
 *
 * The walk stops at the edge of what has been paged in — a parent the log has
 * not loaded is simply not in the map, so an ancestry that runs off the bottom
 * comes back as the part of it that is on screen. `partial` says when that
 * happened, so a caller can tell "no more ancestors" from "no more rows".
 *
 * A leaf module: pure functions over plain data, no imports, and testable
 * without a repository.
 */

/** One commit, as far as ancestry is concerned. */
export interface KinCommit {
  hash: string
  parents: string[]
}

export interface Kinship {
  /** Every loaded commit the selected one is built on, at any depth. */
  ancestors: Set<string>
  /** Every loaded commit built on the selected one, at any depth. */
  descendants: Set<string>
  /** A parent was named that the log has not loaded: the chain runs on. */
  partial: boolean
}

/**
 * `null` where there is nothing to shade — no selection, or a selection that
 * is not a commit in the list (the Changes row, or a hash paged out of it).
 */
export function kinship(commits: KinCommit[], hash: string | null): Kinship | null {
  if (!hash) return null
  const byHash = new Map<string, KinCommit>()
  for (const c of commits) byHash.set(c.hash, c)
  if (!byHash.has(hash)) return null

  const children = new Map<string, string[]>()
  for (const c of commits) {
    for (const p of c.parents) {
      const kids = children.get(p)
      if (kids) kids.push(c.hash)
      else children.set(p, [c.hash])
    }
  }

  let partial = false
  const walk = (next: (h: string) => string[]): Set<string> => {
    const seen = new Set<string>()
    const queue = [hash]
    while (queue.length > 0) {
      for (const h of next(queue.pop() as string)) {
        if (seen.has(h)) continue
        seen.add(h)
        queue.push(h)
      }
    }
    return seen
  }

  const ancestors = walk((h) => {
    const parents = byHash.get(h)?.parents ?? []
    const loaded = parents.filter((p) => byHash.has(p))
    if (loaded.length < parents.length) partial = true
    return loaded
  })
  const descendants = walk((h) => children.get(h) ?? [])
  return { ancestors, descendants, partial }
}
