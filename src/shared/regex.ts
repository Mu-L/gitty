/**
 * Whether typed text is an expression at all, and what to search for when it
 * is not.
 *
 * Both filter boxes read a regular expression, and both are read on every
 * keystroke, so half of one — `(fix` on the way to `(fix|revert)` — is the
 * ordinary state of the box rather than a mistake to report. The rule either
 * side of the process boundary is the same: text that compiles is an
 * expression, text that does not is searched for literally. The renderer
 * applies it with `RegExp` itself (`paths.ts`, whose leaf-module rule keeps it
 * import-free); main has to hand git a pattern instead, hence `literalPattern`.
 *
 * It is pure string work with a test beside it for the reason `query.ts` is:
 * an escape missed here does not throw, it quietly searches for something else.
 */

/**
 * Whether the text compiles. JavaScript's syntax is not POSIX's — `\d` is a
 * digit here and a `d` to git — but that difference is between two readings of
 * an expression that *works*, and this only decides whether there is one.
 */
export function isExpression(text: string): boolean {
  try {
    new RegExp(text)
    return true
  } catch {
    return false
  }
}

/** The text as an expression that matches exactly itself: every character
 *  POSIX extended syntax would take for its own, backslashed. */
export function literalPattern(text: string): string {
  return text.replace(/[.[\]{}()*+?^$|\\]/g, '\\$&')
}
