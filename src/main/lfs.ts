/**
 * Git LFS keeps a small text pointer in the repository and the file itself in
 * a store beside it, so `git show <rev>:<path>` on an LFS-tracked file hands
 * back three lines of metadata rather than the bytes. A viewer given those
 * three lines fails in whatever way its format fails — Chromium's PDF viewer
 * says the document could not be loaded, an `<img>` shows a broken icon —
 * and none of that says what actually happened.
 *
 * Pure string and path work, so it is tested without a repository.
 */

import path from 'node:path'

/** What a pointer stands for: the object's hash and the real file's size. */
export interface LfsPointer {
  oid: string
  size: number
}

/**
 * The v1 pointer format, which is deliberately rigid: LF endings, the keys in
 * alphabetical order after `version`, one trailing newline. Only `sha256` is
 * specified, and only the exact shape is accepted — a file that merely
 * mentions the spec URL is a file about Git LFS, not a pointer to something.
 */
const POINTER =
  /^version https:\/\/git-lfs\.github\.com\/spec\/v1\noid sha256:([0-9a-f]{64})\nsize (\d+)\n$/

/**
 * A pointer's ceiling. The format is three short lines; the guard is here so
 * that a large file is never decoded as text just to be rejected.
 */
const MAX_POINTER_BYTES = 1024

/** What the bytes point at, or null when they are the file itself. */
export function parseLfsPointer(buf: Buffer): LfsPointer | null {
  if (buf.length === 0 || buf.length > MAX_POINTER_BYTES) return null
  // `latin1` never throws on arbitrary bytes; the format is ASCII, so any
  // byte that matters survives the decoding intact.
  const m = POINTER.exec(buf.toString('latin1'))
  if (!m) return null
  const size = Number(m[2])
  // A size git could not have written is a malformed pointer, not a file.
  return Number.isSafeInteger(size) ? { oid: m[1], size } : null
}

/**
 * Where the media file lives once it has been fetched: two levels of fan-out
 * by the first four hex digits, the file named by the whole oid. Reading it
 * directly is what `git lfs smudge` would do, without needing git-lfs to be
 * installed at all — and it is the same path whether or not it is.
 */
export function lfsObjectPath(gitDir: string, oid: string): string {
  return path.join(gitDir, 'lfs', 'objects', oid.slice(0, 2), oid.slice(2, 4), oid)
}
