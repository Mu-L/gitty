import type { PluginHost, PluginMain } from '../../types'
import { locateTerms, taggedSpans, withPatterns, type TaggedWord } from '../analyze'
import { configPaths, model as readModel, rules as readRules, type ModelAccess } from './config'
import { ANALYZERS, ID, METHOD, type Analyzer, type Kind, type Span } from '../shared'

/**
 * The main half of semantic reading — see `ref/spec/semantic-reading.md`. Text
 * comes over `plugin:invoke` and spans go back: which analyser is configured,
 * and above all how a model is reached, never leave this process.
 *
 * Nothing here throws. An analyser that is missing, unconfigured, slow or
 * wrong answers with no spans for the segment, and the document stays the
 * ordinary rendered document it already was.
 */

/** Caps on one analysis, so a long document cannot grow the request forever. */
export const MAX_SEGMENTS = 400
export const MAX_CHARS = 60_000

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
  k: Kind
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
    const kind = typeof t.k === 'string' && kinds.has(t.k) ? (t.k as Kind) : 'proper'
    return [{ i: Math.trunc(t.i), t: t.t, k: kind }]
  })
}

/** How long to wait on a model before giving the document up as unmarked. */
const MODEL_TIMEOUT = 30_000

async function askModel(segments: string[], model: ModelAccess): Promise<Span[][]> {
  const empty = segments.map(() => [] as Span[])
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
  const byIndex = new Map<number, { text: string; kind: Kind }[]>()
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

async function askJieba(segments: string[]): Promise<Span[][]> {
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
const cache = new Map<string, Span[]>()
const CACHE_LIMIT = 20_000

/**
 * The spans for each segment, in the order the segments came in. Segments
 * already analysed are answered from the cache and never sent anywhere.
 */
export async function analyse(
  analyzer: Analyzer,
  segments: string[],
  model: ModelAccess
): Promise<Span[][]> {
  const wanted = segments.slice(0, MAX_SEGMENTS)
  const out: Span[][] = segments.map(() => [])
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
    if (chars + wanted[i].length > MAX_CHARS) break
    chars += wanted[i].length
    ask.push(wanted[i])
    askAt.push(i)
  }
  if (ask.length === 0) return out

  const found = analyzer === 'llm' ? await askModel(ask, model) : await askJieba(ask)
  if (cache.size > CACHE_LIMIT) cache.clear()
  for (let k = 0; k < askAt.length; k++) {
    // The patterns — latin runs, sentence endings — are added here rather than
    // inside either analyser: they are the same whichever one answered, and
    // they are still there when neither could.
    const spans = withPatterns(ask[k], found[k] ?? [])
    out[askAt[k]] = spans
    cache.set(`${analyzer} ${ask[k]}`, spans)
  }
  return out
}

/**
 * An analyser name that came over the channel. It is a string until it has
 * been checked against the ones that exist — the renderer sends a preference
 * the reader could have hand-edited in `localStorage`.
 */
function asAnalyzer(v: unknown): Analyzer {
  return ANALYZERS.find((a) => a === v) ?? 'jieba'
}

function asSegments(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : []
}

export const main: PluginMain = {
  id: ID,
  methods: {
    [METHOD.analyse]: (host: PluginHost, args: unknown[]) =>
      analyse(asAnalyzer(args[0]), asSegments(args[1]), readModel(host)),
    [METHOD.rules]: (host: PluginHost) => readRules(host),
    // Reading both is what creates them: each is written with its defaults the
    // first time it is read, and the settings rows ask for the paths in order
    // to open the files.
    [METHOD.configPaths]: (host: PluginHost) => {
      readRules(host)
      readModel(host)
      return configPaths(host)
    }
  }
}
