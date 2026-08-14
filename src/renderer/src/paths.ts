/**
 * Path predicates shared by the file list, the diff pane and the context menus.
 * Kept in their own tiny module so the heavy viewers (highlight.js, markdown-it,
 * xterm) stay out of the main bundle: anything that imports only these
 * predicates must not drag in FileDoc or ImagePane just for a regex.
 */

/** Markdown files open rendered by default, with a toggle back to the source. */
export function isMarkdownPath(path: string): boolean {
  return /\.(md|markdown|mdown|mkd)$/i.test(path)
}

/** HTML files open rendered by default, with a toggle back to the source. */
export function isHtmlPath(path: string): boolean {
  return /\.(html?|xhtml)$/i.test(path)
}

/** Extensions the image preview claims; must match `IMAGE_MIME` in main/git.ts. */
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|ico|avif|svg)$/i

export function isImagePath(path: string): boolean {
  return IMAGE_EXT.test(path)
}

/**
 * Names as a reader sorts them: the digits inside a name count as a number, so
 * `W9` comes before `W10` rather than after it, and case is not a first-order
 * difference — `butler/` sorts with the b's rather than after every capital.
 */
const NAMES = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/**
 * Order two repo-relative paths for the file tree, segment by segment.
 *
 * `natural` reads the digits in a name as a number and puts case second, which
 * is how a reader sorts; without it the comparison is git's own — by code
 * unit, where W10 precedes W9 and every capital precedes every lowercase.
 *
 * Comparing the strings whole would be shorter and wrong: `/` is punctuation
 * and sorts unpredictably against `.` or `-`, so `a.txt` could land between
 * `a/one.txt` and `a/two.txt` — and the tree builder, which emits a directory
 * heading whenever the path's parent changes, would then draw `a/` twice.
 * Segment order keeps everything under one directory together.
 */
export function comparePaths(a: string, b: string, natural = true): number {
  const A = a.split('/')
  const B = b.split('/')
  const n = Math.min(A.length, B.length)
  for (let i = 0; i < n; i++) {
    if (natural) {
      const c = NAMES.compare(A[i], B[i])
      if (c !== 0) return c
    }
    // Byte order, and also the tiebreak for names the collator calls equal
    // (case alone, for instance): the order has to be total either way.
    if (A[i] !== B[i]) return A[i] < B[i] ? -1 : 1
  }
  return A.length - B.length
}
