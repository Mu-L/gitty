import type { Kind, Span } from './shared'

/**
 * The string work behind the marks — see `ref/spec/semantic-reading.md`. It
 * knows nothing about Electron, about a model or about where the reader's
 * files are: everything here is data an analyser handed us, turned into spans,
 * which is the shape `test/semantic-reading.test.ts` can hold.
 */

/** A word jieba tagged, in the shape `@node-rs/jieba` returns it. */
export interface TaggedWord {
  tag: string
  word: string
}

/**
 * jieba's own part-of-speech tags for the four kinds we mark. Everything else
 * — ordinary nouns, verbs, the `eng` it gives every latin word — is not a
 * proper noun and is left alone.
 */
const TAG_KIND: Record<string, Kind> = {
  nr: 'person',
  ns: 'place',
  nt: 'org',
  nz: 'proper'
}

/**
 * A one-character word is dropped whatever its tag: jieba calls a lone
 * character a name often enough that keeping them turns the marks into noise.
 */
const MIN_TERM = 2

/**
 * Where each tagged word sits in the segment it came from. jieba tags words
 * but does not locate them, so the offsets are accumulated here.
 *
 * Words are expected to be contiguous, and are checked rather than trusted: a
 * span placed at the wrong offset underlines the wrong text and never says so.
 * When a word does not appear where it should the search moves to where it
 * does; when it does not appear at all the rest of the segment is abandoned,
 * because every later offset would be built on the miss.
 */
export function taggedSpans(segment: string, tagged: readonly TaggedWord[]): Span[] {
  const spans: Span[] = []
  let pos = 0
  for (const { tag, word } of tagged) {
    if (!word) continue
    const at = segment.startsWith(word, pos) ? pos : segment.indexOf(word, pos)
    if (at < 0) break
    pos = at + word.length
    const kind = TAG_KIND[tag]
    if (kind && word.length >= MIN_TERM) spans.push({ start: at, end: pos, kind })
  }
  return spans
}

/**
 * The spans where `terms` occur in `segment`. This is how a model's answer
 * becomes offsets: a model asked to count UTF-16 indices gets them wrong, so
 * it is asked for the text instead and the text is found here.
 *
 * Longest first, so a full name wins over the part of it that is also a term
 * on its own, and an occurrence overlapping one already taken is skipped —
 * between them that is what keeps the result non-overlapping and in order,
 * which is what the renderer is allowed to assume.
 */
export function locateTerms(
  segment: string,
  terms: readonly { text: string; kind: Kind }[]
): Span[] {
  const taken: Span[] = []
  const sorted = [...terms].sort((a, b) => b.text.length - a.text.length)
  for (const { text, kind } of sorted) {
    if (text.length < MIN_TERM) continue
    let from = 0
    for (;;) {
      const at = segment.indexOf(text, from)
      if (at < 0) break
      const end = at + text.length
      from = end
      if (!taken.some((s) => at < s.end && s.start < end)) taken.push({ start: at, end, kind })
    }
  }
  return taken.sort((a, b) => a.start - b.start)
}

/**
 * Han, kana and hangul — what makes a segment CJK prose, and so what makes a
 * run of latin letters in it worth pointing at.
 */
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

/**
 * A run of latin letters and digits, with the joiners a version or a product
 * name is written with. Each joiner has to be followed by more of the run, so
 * the full stop ending a sentence is not swallowed into `v1`.
 */
const LATIN = /[A-Za-z0-9]+(?:[-._+][A-Za-z0-9]+)*/gu

/**
 * The latin runs in a CJK segment — `GPT-4` and `Anthropic` in a Chinese
 * sentence, which are the words the eye loses when everything else is Han.
 *
 * Only in a CJK segment, and deliberately: in an English paragraph every word
 * is a latin run, and marking all of them marks nothing. A run has to contain
 * a letter, so a bare number is left alone — a number reads as a number
 * already.
 *
 * This needs no analyser at all, which is the point: it holds even when jieba
 * is not installed or the model cannot be reached.
 */
export function latinSpans(segment: string): Span[] {
  if (!CJK.test(segment)) return []
  const spans: Span[] = []
  LATIN.lastIndex = 0
  for (const m of segment.matchAll(LATIN)) {
    if (!/[A-Za-z]/.test(m[0])) continue
    spans.push({ start: m.index, end: m.index + m[0].length, kind: 'latin' })
  }
  return spans
}

/**
 * The analyser's spans plus the latin runs around them, still non-overlapping
 * and still ascending. The analyser wins every overlap: it said what a piece
 * of text *is*, where the latin run only says what script it is written in.
 */
export function withLatin(segment: string, found: readonly Span[]): Span[] {
  const latin = latinSpans(segment).filter(
    (l) => !found.some((f) => l.start < f.end && f.start < l.end)
  )
  return [...found, ...latin].sort((a, b) => a.start - b.start)
}

/**
 * Worth sending to an analyser. A segment of one character, or one with no
 * letters in it at all, cannot hold a proper noun — and a document is mostly
 * made of those, so they would dominate the request without ever earning a
 * mark.
 */
export function worthAnalysing(text: string): boolean {
  return text.length >= 2 && /\p{L}/u.test(text)
}
