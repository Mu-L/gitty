/**
 * The search box's query language — `foo in:*.py`, in the shape a mail client
 * taught everyone rather than git's own command line.
 *
 * It is pure string work over the typed text, for the reason `patch.ts` is: a
 * query parsed wrongly does not throw, it quietly searches something else, so
 * `test/query.test.ts` holds it. It imports nothing, and it is shared rather
 * than main's own because both sides read the same box: main turns a query into
 * a command line, and the renderer asks whether there is anything in it to
 * search *for* before sending it.
 *
 * The whole of the language:
 *
 * - `foo bar`      — both words, on the same line
 * - `"foo bar"`    — the phrase, spaces and all; quoting also disarms every
 *                    operator below, which is how a literal `in:` is searched
 * - `-foo`         — lines that do not have it
 * - `in:*.py`      — only files matching the glob; several are comma-separated
 *                    (`in:*.py,*.pyi`) and match either
 * - `-in:test/*`   — files left out
 * - `foo in *.py`  — `in` without the colon, which only reads as the operator
 *                    when what follows looks like a path (see `looksLikePath`)
 */

/** A parsed query, in the two dimensions git grep answers in. */
export interface SearchQuery {
  /** Terms a matching line must all contain. */
  include: string[]
  /** Terms a matching line must not contain. */
  exclude: string[]
  /** Path globs the search is limited to; a file matching any of them is in. */
  paths: string[]
  /** Path globs left out of the search. */
  notPaths: string[]
}

interface Token {
  value: string
  /** Quoted text is a search term whatever it looks like — no operator in it. */
  quoted: boolean
}

/**
 * Split on whitespace, keeping quoted runs whole. An unclosed quote runs to the
 * end of the text rather than being an error: the box is parsed on every
 * keystroke's worth of typing, and half a query is not a mistake to report.
 */
function tokenize(text: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < text.length) {
    const c = text[i]
    if (c === ' ' || c === '\t') {
      i++
      continue
    }
    if (c === '"' || c === "'") {
      const end = text.indexOf(c, i + 1)
      const stop = end === -1 ? text.length : end
      out.push({ value: text.slice(i + 1, stop), quoted: true })
      i = stop + 1
      continue
    }
    let j = i
    while (j < text.length && text[j] !== ' ' && text[j] !== '\t') j++
    out.push({ value: text.slice(i, j), quoted: false })
    i = j
  }
  return out.filter((t) => t.value !== '')
}

/**
 * Whether a bare `in` should be read as the operator. Code is full of the word
 * — `for x in list` — so it only takes the next token when that token is
 * shaped like a path: a glob, a directory, or a leading-dot extension.
 */
function looksLikePath(v: string): boolean {
  return /[*?/[]/.test(v) || /^\.[A-Za-z0-9]+$/.test(v)
}

/** `.py` asks about an extension, not about a file called `.py`. */
function normGlob(g: string): string {
  return /^\.[A-Za-z0-9]+$/.test(g) ? `*${g}` : g
}

/** `in:*.py,*.pyi` is two globs, either of which will do. */
function globs(value: string): string[] {
  return value
    .split(',')
    .map((g) => g.trim())
    .filter((g) => g !== '')
    .map(normGlob)
}

export function parseQuery(text: string): SearchQuery {
  const q: SearchQuery = { include: [], exclude: [], paths: [], notPaths: [] }
  const toks = tokenize(text)
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t.quoted) {
      q.include.push(t.value)
      continue
    }
    const m = /^(-?)in:(.*)$/i.exec(t.value)
    if (m) {
      ;(m[1] === '-' ? q.notPaths : q.paths).push(...globs(m[2]))
      continue
    }
    const bare = /^(-?)in$/i.exec(t.value)
    const next = toks[i + 1]
    if (bare && next && !next.quoted && looksLikePath(next.value)) {
      ;(bare[1] === '-' ? q.notPaths : q.paths).push(...globs(next.value))
      i++
      continue
    }
    if (t.value.startsWith('-') && t.value.length > 1) {
      q.exclude.push(t.value.slice(1))
      continue
    }
    q.include.push(t.value)
  }
  return q
}

/**
 * The pattern half of the command line: git grep's own boolean expression, one
 * `-e` per term. The AND is git's, so it is a line that must hold every term —
 * which is what a reader of a search result is looking at, one line at a time.
 *
 * Every term stays its own argument; nothing is ever spliced into a string.
 */
export function grepExpr(q: SearchQuery): string[] {
  const out: string[] = []
  for (const term of q.include) {
    if (out.length) out.push('--and')
    out.push('-e', term)
  }
  for (const term of q.exclude) {
    if (out.length) out.push('--and')
    out.push('--not', '-e', term)
  }
  return out
}

/** The pathspec half; an exclusion carries git's own magic prefix. */
export function grepPathspecs(q: SearchQuery): string[] {
  return [...q.paths, ...q.notPaths.map((g) => `:(exclude)${g}`)]
}
