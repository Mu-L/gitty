/**
 * Re-indenting JSON for the file viewer: one long line becomes a readable
 * tree, and the button offering it appears only where this module says the
 * text is JSON at all.
 *
 * A leaf module — it imports nothing, so the header can ask "is this
 * formattable?" without dragging a viewer chunk along.
 *
 * `JSON.stringify(JSON.parse(text), null, 2)` is the one-liner this is not,
 * because it does not round-trip a file: `1e999` comes back `null`,
 * `12345678901234567890` loses its last digits, an object with the keys `"2"`
 * and `"1"` comes back in numeric order, and a duplicate key is dropped. A
 * viewer must show what is in the file, so every scalar is re-emitted as the
 * source spelled it and only the whitespace between tokens is ours.
 */

/** Whitespace as JSON defines it — not `\s`, which also takes NBSP and more. */
function isSpace(c: string): boolean {
  return c === ' ' || c === '\t' || c === '\n' || c === '\r'
}

const NUMBER = /-?(0|[1-9][0-9]*)(\.[0-9]+)?([eE][+-]?[0-9]+)?/y

/** The escapes a backslash may introduce, beside `\uXXXX`. */
const ESCAPES = '"\\/bfnrt'
const HEX4 = /^[0-9a-fA-F]{4}$/

/**
 * `text` re-indented, or `null` when it is not one complete JSON document —
 * which is the same answer as "there is nothing to offer here", so callers use
 * it to decide whether the button exists.
 */
export function formatJson(text: string, indent = 2): string | null {
  // A file written by an editor that marks its encoding starts with a BOM; it
  // is not part of the document, and the viewer has already read the text as
  // characters, so it goes.
  const s = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
  let i = 0
  const out: string[] = []

  const skipSpace = (): void => {
    while (i < s.length && isSpace(s[i])) i++
  }

  const pad = (depth: number): string => ' '.repeat(indent * depth)

  /** A string token, emitted exactly as written; `false` if it is malformed. */
  const string = (): boolean => {
    if (s[i] !== '"') return false
    const start = i
    i++
    for (;;) {
      const c = s[i]
      if (c === undefined) return false
      // Every character below the space is a control character, which JSON
      // says must be escaped rather than written raw.
      if (c < ' ') return false
      if (c === '"') {
        i++
        out.push(s.slice(start, i))
        return true
      }
      if (c === '\\') {
        const e = s[i + 1]
        if (e !== undefined && ESCAPES.includes(e)) i += 2
        else if (e === 'u' && HEX4.test(s.slice(i + 2, i + 6))) i += 6
        else return false
        continue
      }
      i++
    }
  }

  const value = (depth: number): boolean => {
    const c = s[i]
    if (c === '"') return string()
    if (c === '{' || c === '[') return container(depth, c)
    for (const lit of ['true', 'false', 'null']) {
      if (s.startsWith(lit, i)) {
        i += lit.length
        out.push(lit)
        return true
      }
    }
    NUMBER.lastIndex = i
    const m = NUMBER.exec(s)
    if (!m || m[0].length === 0) return false
    i = NUMBER.lastIndex
    out.push(m[0])
    return true
  }

  const container = (depth: number, open: '{' | '['): boolean => {
    const close = open === '{' ? '}' : ']'
    i++
    skipSpace()
    // An empty container stays on its line: `{}` opened over three lines is
    // noise, and every formatter a reader has met writes it this way.
    if (s[i] === close) {
      i++
      out.push(open + close)
      return true
    }
    out.push(open)
    for (;;) {
      out.push('\n', pad(depth + 1))
      if (open === '{') {
        if (!string()) return false
        skipSpace()
        if (s[i] !== ':') return false
        i++
        out.push(': ')
        skipSpace()
      }
      if (!value(depth + 1)) return false
      skipSpace()
      if (s[i] === ',') {
        i++
        out.push(',')
        skipSpace()
        continue
      }
      if (s[i] !== close) return false
      i++
      out.push('\n', pad(depth), close)
      return true
    }
  }

  skipSpace()
  if (!value(0)) return null
  skipSpace()
  // Anything after the document — a second value, a stray brace — means this
  // is not the JSON file it looked like, and formatting the part that parsed
  // would show the reader a silently truncated file.
  if (i !== s.length) return null
  return out.join('')
}
