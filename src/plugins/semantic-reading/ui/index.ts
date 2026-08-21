import { invoke } from '../../../renderer/src/pluginApi'
import type { Locale } from '../../../shared/messages'
import type { Mark, Plugin, PluginPrefs, SettingsRow } from '../../types'
import { worthAnalysing } from '../analyze'
import { marksCss } from '../render'
import {
  ID,
  METHOD,
  PREF,
  type Analyzer,
  type ConfigPaths,
  type Rules,
  type Span
} from '../shared'
import { strings } from './messages'

/**
 * The manifest — what the core sees of semantic reading. Everything here is
 * cheap: the registry that imports it is a main-bundle module, so a manifest
 * is types, strings and small pure functions, never a dependency. See
 * `ref/spec/plugins.md`.
 */

/** The stored preference, narrowed. It reaches here from `localStorage`,
 *  which a reader can hand-edit, so it is a string until it is checked. */
function analyzerOf(prefs: PluginPrefs): Analyzer {
  return prefs.get(PREF.analyzer) === 'llm' ? 'llm' : 'jieba'
}

/** Asking for the paths is also what creates the files, so the button always
 *  has something to open. */
async function configPath(which: keyof ConfigPaths): Promise<string> {
  const paths = await invoke<ConfigPaths>(ID, METHOD.configPaths)
  return paths[which]
}

export const semanticReading: Plugin = {
  id: ID,
  name: (locale: Locale) => strings(locale).name,
  summary: (locale: Locale) => strings(locale).summary,
  // Off until asked for: it costs a dictionary or a round trip per document,
  // and a wrong mark reads worse than no mark.
  enabledByDefault: false,
  prefs: [{ key: PREF.analyzer, default: 'jieba' }],

  rows: (locale: Locale): SettingsRow[] => {
    const s = strings(locale)
    return [
      {
        kind: 'segmented',
        label: s.analyzer,
        pref: PREF.analyzer,
        options: [
          { value: 'jieba', label: s.jieba },
          { value: 'llm', label: s.model }
        ]
      },
      { kind: 'file', label: s.rules, action: s.open, open: () => configPath('rules') },
      { kind: 'file', label: s.modelAccess, action: s.open, open: () => configPath('models') }
    ]
  },

  marks: {
    wanted: worthAnalysing,

    analyse: async (texts: string[], prefs: PluginPrefs): Promise<Mark[][]> => {
      const spans = await invoke<Span[][]>(ID, METHOD.analyse, [analyzerOf(prefs), texts])
      // A kind is this plugin's own name for what it found; the pane turns it
      // into a class, and `render.ts` writes the selectors the same way.
      return texts.map((_, i) =>
        (spans[i] ?? []).map((s) => ({ start: s.start, end: s.end, className: s.kind }))
      )
    },

    css: async (): Promise<string> => marksCss(await invoke<Rules>(ID, METHOD.rules))
  }
}
