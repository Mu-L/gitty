import fs from 'node:fs'
import path from 'node:path'
import type { PluginHost } from '../../types'
import {
  DEFAULT_RULES,
  KINDS,
  MAX_SPACE_AFTER,
  UNDERLINES,
  type ConfigPaths,
  type Decoration,
  type Rules
} from '../shared'

/**
 * The two files the reader owns: what a mark looks like, and how to reach a
 * model. Both are JSON in the plugin's own config directory, and both are
 * written with their defaults the first time they are read — an empty file
 * that has to be invented from documentation is a feature nobody finds. See
 * `ref/spec/semantic-reading.md`.
 */

/** How to reach an OpenAI-compatible endpoint. Never leaves this process. */
export interface ModelAccess {
  baseUrl: string
  model: string
  /** Environment variable holding the key; tried before `apiKey`. */
  apiKeyEnv: string
  apiKey: string
}

const DEFAULT_MODEL: ModelAccess = {
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  apiKeyEnv: 'OPENAI_API_KEY',
  apiKey: ''
}

export function configPaths(host: PluginHost): ConfigPaths {
  const dir = host.configDir()
  return { rules: path.join(dir, 'rules.json'), models: path.join(dir, 'models.json') }
}

/**
 * A file read at most once per change to it, the way `sshconfig.ts` does it:
 * `statSync` on every call is cheap, and only a moved mtime or size re-reads.
 * Editing the rules and reopening the document is therefore enough to see the
 * change — no restart.
 *
 * A file that is not there yet is created with `fallback` written out, and a
 * file that cannot be parsed is left exactly as the reader wrote it: it is
 * their file, and overwriting it would throw away the edit they got wrong.
 */
function cachedFile<T>(
  file: (host: PluginHost) => string,
  fallback: () => unknown,
  parse: (raw: unknown) => T,
  /**
   * Whether what was read is missing something the parsed value has — a kind
   * added by a later version, say. Answering true writes the parsed value back,
   * so a file written before a kind existed grows the entry rather than staying
   * a stale reference to what the marks used to be. Additive only: every value
   * the reader wrote has already been carried into what is written.
   */
  incomplete?: (raw: unknown, value: T) => boolean
) {
  let at = ''
  let value: T | null = null
  return (host: PluginHost): T => {
    const p = file(host)
    let stat: fs.Stats | null = null
    try {
      stat = fs.statSync(p)
    } catch {
      try {
        fs.mkdirSync(path.dirname(p), { recursive: true })
        fs.writeFileSync(p, `${JSON.stringify(fallback(), null, 2)}\n`)
        stat = fs.statSync(p)
      } catch {
        /* best-effort: an unwritable config directory still gets the defaults */
      }
    }
    const fp = stat ? `${stat.mtimeMs}:${stat.size}` : '-1:-1'
    if (value !== null && fp === at) return value
    let raw: unknown = null
    try {
      raw = JSON.parse(fs.readFileSync(p, 'utf8'))
    } catch {
      /* missing or hand-edited into invalid JSON — the defaults below apply */
    }
    at = fp
    value = parse(raw)
    if (raw !== null && incomplete?.(raw, value)) {
      try {
        fs.writeFileSync(p, `${JSON.stringify(value, null, 2)}\n`)
        const after = fs.statSync(p)
        at = `${after.mtimeMs}:${after.size}`
      } catch {
        /* the value still applies to this run; the file catches up next time */
      }
    }
    return value
  }
}

/** `#rgb`, `#rrggbb`, `#rrggbbaa` — the only colours a rule may name. */
const COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i

function color(v: unknown, fallback: string | null): string | null {
  if (v === null) return null
  return typeof v === 'string' && COLOR.test(v.trim()) ? v.trim() : fallback
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

/** A gap in em, clamped rather than refused: a reader who asked for four
 *  wanted a wide pause, and the widest one there is says the same thing. */
function em(v: unknown, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback
  return Math.min(MAX_SPACE_AFTER, Math.max(0, v))
}

/**
 * One kind's decoration, field by field. Nothing is passed through: these
 * values end up inside a stylesheet, so a value that is not one of ours falls
 * back to the default rather than reaching the document.
 */
function decoration(raw: unknown, fallback: Decoration): Decoration {
  const d = (raw ?? {}) as Record<string, unknown>
  const line = UNDERLINES.find((u) => u === d.underline) ?? fallback.underline
  return {
    underline: line,
    underlineColor: color(d.underlineColor, fallback.underlineColor),
    color: color(d.color, fallback.color),
    background: color(d.background, fallback.background),
    bold: bool(d.bold, fallback.bold),
    italic: bool(d.italic, fallback.italic),
    spaceAfter: em(d.spaceAfter, fallback.spaceAfter)
  }
}

export const rules = cachedFile<Rules>(
  (host) => configPaths(host).rules,
  () => DEFAULT_RULES,
  (raw) => {
    const src = (raw ?? {}) as Record<string, unknown>
    const out = {} as Rules
    for (const kind of KINDS) out[kind] = decoration(src[kind], DEFAULT_RULES[kind])
    return out
  },
  // A kind this version knows and the file does not, or a field a decoration
  // has grown: either way the file is describing an older version of itself,
  // and is written back with the rest filled in.
  (raw, value) => {
    const src = (raw ?? {}) as Record<string, unknown>
    return KINDS.some((kind) => {
      const had = src[kind]
      if (!had || typeof had !== 'object') return true
      return Object.keys(value[kind]).some((field) => !(field in had))
    })
  }
)

export const model = cachedFile<ModelAccess>(
  (host) => configPaths(host).models,
  () => ({ llm: DEFAULT_MODEL }),
  (raw) => {
    const llm = ((raw as Record<string, unknown>)?.llm ?? {}) as Record<string, unknown>
    const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback)
    return {
      baseUrl: str(llm.baseUrl, DEFAULT_MODEL.baseUrl),
      model: str(llm.model, DEFAULT_MODEL.model),
      apiKeyEnv: str(llm.apiKeyEnv, DEFAULT_MODEL.apiKeyEnv),
      apiKey: str(llm.apiKey, '')
    }
  }
)
