/**
 * Pure helpers for the repository tab bar. A leaf module like paths.ts: no
 * imports, so the tests can import it from the node project.
 */

/** The basename of a repository path, as its tab shows it. */
export function tabBasename(root: string): string {
  return root.split('/').pop() || root
}

/** What a tab shows: its custom name, else the basename. */
export function tabLabel(names: Record<string, string>, root: string): string {
  return names[root] || tabBasename(root)
}

/**
 * Set a tab's custom name. An empty value — or one that says no more than the
 * basename would — clears the override back to the default, so a rename cannot
 * leave a stored name identical to the label it replaces.
 */
export function renameTab(
  names: Record<string, string>,
  root: string,
  name: string
): Record<string, string> {
  const next = { ...names }
  const trimmed = name.trim()
  if (trimmed && trimmed !== tabBasename(root)) next[root] = trimmed
  else delete next[root]
  return next
}

/**
 * Move the tab at `from` so it lands before or after the tab at `to`.
 * Both indices are in the current list; the removal shifts everything after
 * `from` left by one, which is the only part of the math that is easy to get
 * wrong — a move from 0 to *after* the last tab (index 3 of 4) has to land at
 * index 3 of the shortened list, not 4.
 */
export function moveTab<T>(list: T[], from: number, to: number, after: boolean): T[] {
  if (from === to) return list
  const next = [...list]
  const [moved] = next.splice(from, 1)
  const target = from < to ? to - 1 : to
  next.splice(target + (after ? 1 : 0), 0, moved)
  return next
}
