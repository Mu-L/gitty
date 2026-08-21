import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react'
import { mergeMarks, type PlacedMark, type PluginMarks } from '../../plugins/marks'
import type { Plugin, PluginPrefs, PrefValue } from '../../plugins/types'
import { semanticReading } from '../../plugins/semantic-reading/ui'

/**
 * The renderer's whole knowledge of plugins — see `ref/spec/plugins.md`.
 * Registering one is an import and an array entry; the settings dialog, the
 * preferences and the document pane all work off this list rather than off any
 * plugin by name.
 */
export const PLUGINS: Plugin[] = [semanticReading]

/** Every plugin's preference values, keyed by plugin then by key. `enabled`
 *  lives beside them and is the one key no plugin declares. */
export type PluginPrefState = Record<string, Record<string, PrefValue>>

const ENABLED = 'enabled'

function storageKey(id: string, key: string): string {
  return `gitty.plugin.${id}.${key}`
}

function read(id: string, key: string, fallback: PrefValue): PrefValue {
  const raw = localStorage.getItem(storageKey(id, key))
  if (raw === null) return fallback
  if (typeof fallback === 'boolean') return raw === 'on'
  return raw
}

/** What every plugin starts at, before anything the reader has changed. */
export function defaultPluginPrefs(): PluginPrefState {
  const out: PluginPrefState = {}
  for (const p of PLUGINS) {
    out[p.id] = { [ENABLED]: p.enabledByDefault }
    for (const spec of p.prefs) out[p.id][spec.key] = spec.default
  }
  return out
}

/**
 * The stored values, with anything absent falling back to the default. Read
 * per key rather than as one blob so that a plugin added later, or a key added
 * to one, arrives with its default instead of being missing.
 */
export function loadPluginPrefs(): PluginPrefState {
  const out: PluginPrefState = {}
  for (const p of PLUGINS) {
    out[p.id] = { [ENABLED]: read(p.id, ENABLED, p.enabledByDefault) }
    for (const spec of p.prefs) out[p.id][spec.key] = read(p.id, spec.key, spec.default)
  }
  return out
}

export function storePluginPrefs(state: PluginPrefState): void {
  for (const [id, values] of Object.entries(state)) {
    for (const [key, value] of Object.entries(values)) {
      localStorage.setItem(
        storageKey(id, key),
        typeof value === 'boolean' ? (value ? 'on' : 'off') : value
      )
    }
  }
}

// ── React context ────────────────────────────────────────────────────────────

interface Ctx {
  state: PluginPrefState
  setState: Dispatch<SetStateAction<PluginPrefState>>
}

const PrefsCtx = createContext<Ctx | null>(null)

/**
 * Plugin preferences reach the document pane through a context rather than
 * through props. The pane's props are the app's own settings, and threading a
 * prop per plugin through App, RepoTab and FileDoc would put every plugin back
 * into the core files this arrangement exists to keep clear.
 */
export function PluginPrefsProvider({
  state,
  setState,
  children
}: {
  state: PluginPrefState
  setState: Dispatch<SetStateAction<PluginPrefState>>
  children: ReactNode
}): ReactNode {
  const value = useMemo(() => ({ state, setState }), [state, setState])
  return createElement(PrefsCtx.Provider, { value }, children)
}

/** One plugin's preferences, in the shape the contract hands to a plugin. */
export function usePluginPrefs(id: string): PluginPrefs {
  const ctx = useContext(PrefsCtx)
  if (!ctx) throw new Error('usePluginPrefs() must be inside <PluginPrefsProvider>')
  const values = ctx.state[id] ?? {}
  const { setState } = ctx
  const set = useCallback(
    (key: string, value: PrefValue) =>
      setState((s) => ({ ...s, [id]: { ...(s[id] ?? {}), [key]: value } })),
    [setState, id]
  )
  return {
    enabled: values[ENABLED] === true,
    get: (key) => values[key] ?? '',
    set
  }
}

// ── The `marks` extension point ──────────────────────────────────────────────

/** What a document pane needs to place every enabled plugin's marks. */
export interface DocumentMarks {
  /** Some enabled plugin wants this segment analysed. Cheap, and called while
   *  the document renders. */
  wanted(text: string): boolean
  /** Where the marks on a segment go, once the answers are in. */
  placed(text: string): PlacedMark[]
  /** Every enabled plugin's stylesheet, for a `<style>` in the pane. */
  css: string
}

const NO_MARKS: PlacedMark[] = []

/**
 * Ask every enabled plugin about a document's text, once. The document renders
 * unmarked first — an analyser is expected to be slow and allowed to fail —
 * and re-renders when the answers land, which is the same two-pass shape the
 * pane's images already have.
 *
 * `segments` comes out of that first render, so the loop closes only when
 * every wanted segment has an answer, empty or not.
 */
export function useDocumentMarks(docKey: string, segments: string[]): DocumentMarks {
  const ctx = useContext(PrefsCtx)
  const state = ctx?.state
  const [answers, setAnswers] = useState<Map<string, PlacedMark[]>>(new Map())
  const [css, setCss] = useState('')

  // Which plugins are in play, and what they were configured with. A changed
  // analyser is a different answer to the same question, so it belongs in the
  // key that throws the old answers away.
  const prefsKey = useMemo(
    () =>
      PLUGINS.filter((p) => p.marks && state?.[p.id]?.[ENABLED] === true)
        .map((p) => `${p.id}:${JSON.stringify(state?.[p.id] ?? {})}`)
        .join('|'),
    [state]
  )
  const active = useMemo(
    () => PLUGINS.filter((p) => p.marks && state?.[p.id]?.[ENABLED] === true),
    [state]
  )
  const prefsFor = useCallback(
    (p: Plugin): PluginPrefs => ({
      enabled: true,
      get: (key) => state?.[p.id]?.[key] ?? '',
      set: () => {
        /* a plugin does not change its own settings from inside a document */
      }
    }),
    [state]
  )

  // A new document, or a different configuration, starts over.
  useEffect(() => {
    setAnswers(new Map())
    setCss('')
  }, [docKey, prefsKey])

  const wanted = useCallback(
    (text: string) => active.some((p) => p.marks?.wanted(text)),
    [active]
  )

  // NUL, not a space: a segment is a run of prose and is full of spaces.
  const segmentsKey = segments.join('\u0000')
  useEffect(() => {
    if (active.length === 0) return
    const texts = segmentsKey ? segmentsKey.split('\u0000') : []
    if (texts.length === 0) return
    // Every segment already answered for: nothing to do, and re-running would
    // loop, since the answers are what this effect depends on.
    if (texts.every((t) => answers.has(t))) return

    let cancelled = false
    void (async () => {
      // One round trip per plugin, not per segment — and each is asked only
      // about the segments it said it wanted.
      const perPlugin = await Promise.all(
        active.map(async (p) => {
          const mine = texts.filter((t) => p.marks?.wanted(t))
          try {
            const got = await p.marks!.analyse(mine, prefsFor(p))
            return { id: p.id, mine, got }
          } catch {
            // A plugin that cannot answer leaves the document unmarked; the
            // empty answers below stop it being asked again.
            return { id: p.id, mine, got: [] }
          }
        })
      )
      const next = new Map<string, PlacedMark[]>()
      for (const text of texts) {
        const per: PluginMarks[] = perPlugin.map(({ id, mine, got }) => {
          const at = mine.indexOf(text)
          return { pluginId: id, marks: at < 0 ? [] : (got[at] ?? []) }
        })
        next.set(text, mergeMarks(per))
      }
      if (!cancelled) setAnswers(next)
    })()
    return () => {
      cancelled = true
    }
  }, [segmentsKey, answers, active, prefsFor])

  // The stylesheets, re-read whenever a document is opened: a plugin's rules
  // may live in a file the reader edits, and reopening the document is the
  // whole of the reload story.
  useEffect(() => {
    if (active.length === 0) return
    let cancelled = false
    void Promise.all(
      active.map((p) => p.marks!.css(prefsFor(p)).catch(() => ''))
    ).then((sheets) => {
      if (!cancelled) setCss(sheets.filter(Boolean).join('\n'))
    })
    return () => {
      cancelled = true
    }
  }, [docKey, active, prefsFor])

  const placed = useCallback((text: string) => answers.get(text) ?? NO_MARKS, [answers])

  return { wanted, placed, css }
}
