import type { ProseAnalyzer, ProseKind, ProseSpan } from '../shared/types'
import type { ModelAccess } from './proseConfig'

/**
 * The analysers behind the reading marks — see `ref/spec/prose.md`. This file
 * knows nothing about Electron or about where the reader's files live: the
 * model access it needs is handed to it, so the string work below can be
 * tested without a repository or an app.
 *
 * Nothing here throws. An analyser that is missing, unconfigured, slow or
 * wrong answers with no spans for the segment, and the document stays the
 * ordinary rendered document it already was.
 */

/** Caps on one analysis, so a long document cannot grow the request forever. */
export const MAX_PROSE_SEGMENTS = 400
export const MAX_PROSE_CHARS = 60_000

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
const TAG_KIND: Record<string, ProseKind> = {
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
export function taggedSpans(segment: string, tagged: readonly TaggedWord[]): ProseSpan[] {
  const spans: ProseSpan[] = []
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
  terms: readonly { text: string; kind: ProseKind }[]
): ProseSpan[] {
  const taken: ProseSpan[] = []
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
export function latinSpans(segment: string): ProseSpan[] {
  if (!CJK.test(segment)) return []
  const spans: ProseSpan[] = []
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
export function withLatin(segment: string, found: readonly ProseSpan[]): ProseSpan[] {
  const latin = latinSpans(segment).filter(
    (l) => !found.some((f) => l.start < f.end && f.start < l.end)
  )
  return [...found, ...latin].sort((a, b) => a.start - b.start)
}

/**
 * Loaded on first use, and only ever once — the default dictionary is several
 * megabytes, and a reader who never turns the marks on should never pay for
 * it. `undefined` means "not tried yet", `null` means "tried, and it is not
 * there": a distinction worth keeping, or a failed load would be retried on
 * every document and stall every document.
 */
let jieba: { tag(sentence: string, hmm?: boolean): TaggedWord[] } | null | undefined
let loading: Promise<void> | null = null

async function loadJieba(): Promise<typeof jieba> {
  if (jieba !== undefined) return jieba
  loading ??= (async () => {
    try {
      const [{ Jieba }, { dict }] = await Promise.all([
        import('@node-rs/jieba'),
        // The `.js` is required, not decoration: the package has no exports
        // map, so a bare subpath resolves as ESM and is not found.
        import('@node-rs/jieba/dict.js')
      ])
      jieba = Jieba.withDict(dict)
    } catch {
      jieba = null // not installed for this platform; the marks stay off
    }
  })()
  await loading
  return jieba
}

/** What a model is asked for, and the only shape of answer we accept. */
interface ModelTerm {
  /** Index into the segments sent. */
  i: number
  /** The term as it appears in that segment, verbatim. */
  t: string
  k: ProseKind
}

const PROMPT = [
  'You mark proper nouns to help someone read faster.',
  'Input is a JSON array of text segments.',
  'Reply with JSON only, in the form',
  '{"terms":[{"i":<segment index>,"t":"<the term, copied exactly>","k":"person"|"place"|"org"|"proper"}]}',
  'Copy each term exactly as it appears in its segment, including case and script.',
  'Mark the names of people, places, organisations, products and works — nothing else.',
  'Return an empty array when there are none.'
].join(' ')

/** The JSON object in a model reply, which is often fenced or prefaced. */
function parseReply(text: string): ModelTerm[] {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(text.slice(start, end + 1))
  } catch {
    return []
  }
  const terms = (parsed as { terms?: unknown })?.terms
  if (!Array.isArray(terms)) return []
  const kinds = new Set(['person', 'place', 'org', 'proper'])
  return terms.flatMap((raw): ModelTerm[] => {
    const t = raw as Record<string, unknown>
    if (typeof t?.t !== 'string' || typeof t.i !== 'number') return []
    const kind = typeof t.k === 'string' && kinds.has(t.k) ? (t.k as ProseKind) : 'proper'
    return [{ i: Math.trunc(t.i), t: t.t, k: kind }]
  })
}

/** How long to wait on a model before giving the document up as unmarked. */
const MODEL_TIMEOUT = 30_000

async function askModel(segments: string[], model: ModelAccess): Promise<ProseSpan[][]> {
  const empty = segments.map(() => [] as ProseSpan[])
  if (!model.baseUrl || !model.model) return empty
  // The environment first: a key there is a key not sitting in a file.
  const key = (model.apiKeyEnv && process.env[model.apiKeyEnv]) || model.apiKey
  let reply: string
  try {
    const res = await fetch(`${model.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(key ? { authorization: `Bearer ${key}` } : {})
      },
      body: JSON.stringify({
        model: model.model,
        temperature: 0,
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content: JSON.stringify(segments) }
        ]
      }),
      signal: AbortSignal.timeout(MODEL_TIMEOUT)
    })
    if (!res.ok) return empty
    const body = (await res.json()) as { choices?: { message?: { content?: unknown } }[] }
    const content = body.choices?.[0]?.message?.content
    reply = typeof content === 'string' ? content : ''
  } catch {
    return empty // unreachable, refused, timed out — all the same to the reader
  }
  const byIndex = new Map<number, { text: string; kind: ProseKind }[]>()
  for (const { i, t, k } of parseReply(reply)) {
    if (i < 0 || i >= segments.length) continue
    const list = byIndex.get(i) ?? []
    list.push({ text: t, kind: k })
    byIndex.set(i, list)
  }
  // A term the model invented rather than copied simply does not occur, which
  // is what locating rather than trusting buys.
  return segments.map((seg, i) => locateTerms(seg, byIndex.get(i) ?? []))
}

async function askJieba(segments: string[]): Promise<ProseSpan[][]> {
  const j = await loadJieba()
  if (!j) return segments.map(() => [])
  return segments.map((seg) => {
    try {
      return taggedSpans(seg, j.tag(seg, true))
    } catch {
      return []
    }
  })
}

/**
 * Analyses already made, keyed by analyser and text. A document re-renders
 * whenever anything about the pane changes — an image landing, the outline
 * following a scroll — and a phrase repeats through a document, so without
 * this the same segment would be analysed again and again.
 *
 * Dropped whole when full rather than evicted one at a time: it holds
 * analyses, not documents, so nothing depends on an entry still being there.
 */
const cache = new Map<string, ProseSpan[]>()
const CACHE_LIMIT = 20_000

/**
 * The spans for each segment, in the order the segments came in. Segments
 * already analysed are answered from the cache and never sent anywhere.
 */
export async function analyze(
  analyzer: ProseAnalyzer,
  segments: string[],
  model: ModelAccess
): Promise<ProseSpan[][]> {
  const wanted = segments.slice(0, MAX_PROSE_SEGMENTS)
  const out: ProseSpan[][] = segments.map(() => [])
  const ask: string[] = []
  const askAt: number[] = []
  let chars = 0
  for (let i = 0; i < wanted.length; i++) {
    const hit = cache.get(`${analyzer} ${wanted[i]}`)
    if (hit) {
      out[i] = hit
      continue
    }
    // Past the character cap the rest of the document goes unmarked, rather
    // than the request growing with the document.
    if (chars + wanted[i].length > MAX_PROSE_CHARS) break
    chars += wanted[i].length
    ask.push(wanted[i])
    askAt.push(i)
  }
  if (ask.length === 0) return out

  const found = analyzer === 'llm' ? await askModel(ask, model) : await askJieba(ask)
  if (cache.size > CACHE_LIMIT) cache.clear()
  for (let k = 0; k < askAt.length; k++) {
    // The latin runs are added here rather than inside either analyser: they
    // are the same whichever one answered, and they are still there when
    // neither could.
    const spans = withLatin(ask[k], found[k] ?? [])
    out[askAt[k]] = spans
    cache.set(`${analyzer} ${ask[k]}`, spans)
  }
  return out
}
