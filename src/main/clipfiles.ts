/**
 * Reading a file manager's "copy" out of the system clipboard.
 *
 * There is no one clipboard format for "these files were copied". A desktop
 * that copies files puts a list of `file://` URIs on the clipboard under a
 * format of its own choosing, and whether the user asked for a copy or a cut
 * is part of the payload on some desktops and absent on others. What follows
 * is the parsing of the three shapes that turn up in practice, in the order
 * they are worth trying:
 *
 * - `x-special/gnome-copied-files` (GNOME, and KDE's `x-special/KDE-copied-files`
 *   in the same shape): a verb line — `copy` or `cut` — then one URI per line.
 *   The only shape that says which of the two it is.
 * - `text/uri-list`: URIs, `#` comments allowed. Says nothing about cut, so a
 *   copy is what it is read as.
 * - plain text: absolute paths, one per line. Not a file manager's doing at
 *   all — it is what copying a path out of a terminal leaves — but pasting it
 *   into a file tree means the same thing, so it is accepted last. The caller
 *   checks that the paths exist, which is what keeps ordinary copied prose
 *   from being read as a file list.
 *
 * Pure string work with no imports, so `test/clipfiles.test.ts` can hold the
 * shapes without a clipboard to read from; `index.ts` does the reading.
 */

/** A file manager's clipboard payload, once read. */
export interface ClipboardFiles {
  /** `cut` means the sources are to be moved, and the originals removed. */
  op: 'copy' | 'cut'
  /** Absolute source paths, in the order the clipboard listed them. */
  paths: string[]
}

/** `file:///home/u/a%20b` → `/home/u/a b`; anything else → null. */
export function fileUriToPath(uri: string): string | null {
  const trimmed = uri.trim()
  if (!trimmed.toLowerCase().startsWith('file://')) return null
  // `file:///path` is the usual form; `file://host/path` is not something a
  // local paste can act on, so only an empty host is accepted.
  const rest = trimmed.slice('file://'.length)
  if (!rest.startsWith('/')) return null
  try {
    const decoded = decodeURIComponent(rest)
    return decoded || null
  } catch {
    // A stray % that is not an escape — take the URI as it stands rather than
    // dropping a path that is probably fine.
    return rest
  }
}

/** The GNOME/KDE shape: a verb line, then one URI per line. */
export function parseCopiedFiles(payload: string): ClipboardFiles | null {
  const lines = payload.split(/\r?\n/).filter((l) => l.trim() !== '')
  // Older Nautilus repeats the format name as the first line before the verb.
  if (lines[0]?.trim().startsWith('x-special/')) lines.shift()
  if (lines.length < 2) return null
  const verb = lines[0].trim().toLowerCase()
  if (verb !== 'copy' && verb !== 'cut') return null
  const paths = lines.slice(1).map(fileUriToPath).filter((p): p is string => p !== null)
  return paths.length > 0 ? { op: verb, paths } : null
}

/** `text/uri-list`: URIs and `#` comments, and no verb to read. */
export function parseUriList(payload: string): ClipboardFiles | null {
  const paths = payload
    .split(/\r?\n/)
    .filter((l) => l.trim() !== '' && !l.trimStart().startsWith('#'))
    .map(fileUriToPath)
    .filter((p): p is string => p !== null)
  return paths.length > 0 ? { op: 'copy', paths } : null
}

/**
 * Plain text as a list of absolute paths, one per line. Deliberately strict —
 * this is the fallback that ordinary copied text would otherwise fall into, so
 * a line that is not an absolute path disqualifies the whole payload rather
 * than being skipped.
 */
export function parsePlainPaths(payload: string): ClipboardFiles | null {
  const lines = payload.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0 || lines.length > 64) return null
  const paths: string[] = []
  for (const line of lines) {
    const p = line.trim().replace(/^'(.*)'$/, '$1').replace(/^"(.*)"$/, '$1')
    // Windows drive letters as well as POSIX roots; the caller decides whether
    // the path is really there.
    if (!p.startsWith('/') && !/^[A-Za-z]:[\\/]/.test(p)) return null
    if (p.includes('\n')) return null
    paths.push(p)
  }
  return { op: 'copy', paths }
}

/**
 * The name a copy takes when the target directory already holds that name and
 * the user asked to keep both: `notes.md` → `notes (copy).md` → `notes (copy
 * 2).md`. The suffix goes before the extension, which is what makes the result
 * still open in the same program.
 */
export function copyName(name: string, taken: (candidate: string) => boolean): string {
  if (!taken(name)) return name
  // A leading dot is the name, not an extension: `.gitignore` has none.
  const dot = name.lastIndexOf('.')
  const [stem, ext] = dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, '']
  for (let n = 1; n < 1000; n++) {
    const candidate = n === 1 ? `${stem} (copy)${ext}` : `${stem} (copy ${n})${ext}`
    if (!taken(candidate)) return candidate
  }
  return name
}
