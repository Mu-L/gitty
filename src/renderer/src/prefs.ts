import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction
} from 'react'
import { ALL_PANES, loadPanes, type PaneVisibility } from './panes'
import { loadLocale, type Locale } from './locale'
import { loadTimeZone, SYSTEM_TZ, type TimeZone } from './time'
import { DEFAULT_DIFF_OPTIONS, type DiffOptions, type TerminalOptions } from '../../shared/types'
import {
  defaultPluginPrefs,
  loadPluginPrefs,
  storePluginPrefs,
  type PluginPrefState
} from './plugins'
import type { DiffView } from './components/DiffPane'
import type { Theme } from './components/SettingsPane'

/**
 * Every app-wide preference: the state, where it is stored, what it does to
 * the document, and what **Restore Defaults** puts it back to — one file, so a
 * new setting is one place to add it rather than five scattered edits. They
 * are app-wide because changing the theme or the row height touches every open
 * repository's panes, so they live above the tabs.
 *
 * Storage is `localStorage` under `gitty.*`, with one exception: the main
 * process has to know about `singleInstance` before a window exists, so that
 * one is read back from there. Options git or the pty needs travel with each
 * call (`diffOptions`, `terminalOptions`) rather than being held anywhere
 * privileged.
 */

/**
 * The commands "Send to agent" offers to begin with. Which agent is
 * actually installed is not something the app can know, so these are
 * suggestions to pick from and edit, not defaults known to work — the list
 * then grows from whatever the user runs.
 */
const AGENT_COMMANDS = [
  'claude "commit the staged changes"',
  'codex exec "commit the staged changes"',
  'gemini -p "commit the staged changes"'
]

/** How many remembered agent commands to keep, most recently used first. */
const AGENT_COMMAND_LIMIT = 12

/**
 * A numeric setting, clamped to the range its control offers. Reading through
 * Number() alone will not do: an absent key is null, and Number(null) is 0 —
 * which is finite, so every unset slider would silently start at its minimum.
 */
function num(key: string, fallback: number, min: number, max: number): number {
  const raw = localStorage.getItem(key)
  if (raw === null) return fallback
  const v = Number(raw)
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback
}

function loadAgentCommands(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem('gitty.agentCommands') ?? 'null')
    // An empty array is an answer, not a missing one: a user who forgot every
    // command means it. Only an absent or unreadable value falls back to the
    // suggestions, which is the first run.
    if (Array.isArray(v))
      return v.filter((c): c is string => typeof c === 'string' && c.trim() !== '')
  } catch {
    // A hand-edited or truncated value is not worth a dialog; fall through.
  }
  return [...AGENT_COMMANDS]
}

/** Every preference, its setter, and the three grouped objects read off them. */
export interface Preferences {
  locale: Locale
  setLocale: Dispatch<SetStateAction<Locale>>
  wrap: boolean
  setWrap: Dispatch<SetStateAction<boolean>>
  diffView: DiffView
  setDiffView: Dispatch<SetStateAction<DiffView>>
  wordDiff: boolean
  setWordDiff: Dispatch<SetStateAction<boolean>>
  mdOutline: boolean
  setMdOutline: Dispatch<SetStateAction<boolean>>
  mdLineNumbers: boolean
  setMdLineNumbers: Dispatch<SetStateAction<boolean>>
  /** Every plugin's preferences in one object, whatever they are and however
   *  many plugins there are — see `ref/spec/plugins.md`. */
  pluginPrefs: PluginPrefState
  setPluginPrefs: Dispatch<SetStateAction<PluginPrefState>>
  naturalSort: boolean
  setNaturalSort: Dispatch<SetStateAction<boolean>>
  graph: boolean
  setGraph: Dispatch<SetStateAction<boolean>>
  panes: PaneVisibility
  setPanes: Dispatch<SetStateAction<PaneVisibility>>
  theme: Theme
  setTheme: Dispatch<SetStateAction<Theme>>
  fontSize: number
  setFontSize: Dispatch<SetStateAction<number>>
  rowHeight: number
  setRowHeight: Dispatch<SetStateAction<number>>
  timeZone: TimeZone
  setTimeZone: Dispatch<SetStateAction<TimeZone>>
  relativeTime: boolean
  setRelativeTime: Dispatch<SetStateAction<boolean>>
  monoFont: string
  setMonoFont: Dispatch<SetStateAction<string>>
  diffContext: number
  setDiffContext: Dispatch<SetStateAction<number>>
  ignoreWhitespace: DiffOptions['ignoreWhitespace']
  setIgnoreWhitespace: Dispatch<SetStateAction<DiffOptions['ignoreWhitespace']>>
  restoreTabs: boolean
  setRestoreTabs: Dispatch<SetStateAction<boolean>>
  singleInstance: boolean
  setSingleInstance: (on: boolean) => void
  termShell: string
  setTermShell: Dispatch<SetStateAction<string>>
  termLogin: boolean
  setTermLogin: Dispatch<SetStateAction<boolean>>
  /** Most recently used first; the head is what "Send" runs. */
  agentCommands: string[]
  useAgentCommand: (command: string) => void
  forgetAgentCommand: (command: string) => void
  time: { zone: TimeZone; relative: boolean }
  diffOptions: DiffOptions
  terminalOptions: TerminalOptions
  resetSettings: () => void
}

export function usePreferences(): Preferences {
  const [locale, setLocale] = useState<Locale>(loadLocale)
  const [wrap, setWrap] = useState(() => localStorage.getItem('gitty.wrap') !== 'off')
  const [diffView, setDiffView] = useState<DiffView>(
    () => (localStorage.getItem('gitty.diffView') as DiffView | null) ?? 'inline'
  )
  // Word-level highlighting is on by default; fine-grained changes stand out.
  const [wordDiff, setWordDiff] = useState(() => localStorage.getItem('gitty.wordDiff') !== 'off')
  const [mdOutline, setMdOutline] = useState(
    () => localStorage.getItem('gitty.mdOutline') !== 'off'
  )
  // Off by default: source lines beside rendered prose are for cross-checking
  // against the file, not for reading it.
  const [mdLineNumbers, setMdLineNumbers] = useState(
    () => localStorage.getItem('gitty.mdLineNumbers') === 'on'
  )
  // One state for every plugin's settings. What they are is the plugins'
  // business; that they are stored, restored and reset is this file's.
  const [pluginPrefs, setPluginPrefs] = useState<PluginPrefState>(loadPluginPrefs)
  // Natural by default: it is what a reader expects. Off gives git's own byte
  // order, which is what the command line shows.
  const [naturalSort, setNaturalSort] = useState(
    () => localStorage.getItem('gitty.naturalSort') !== 'off'
  )
  // The lane graph beside the commit hashes. On by default: a history browser
  // without one is a list that cannot show a merge.
  const [graph, setGraph] = useState(() => localStorage.getItem('gitty.graph') !== 'off')
  const [panes, setPanes] = useState<PaneVisibility>(loadPanes)
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('gitty.theme') === 'light' ? 'light' : 'dark')
  )
  const [fontSize, setFontSize] = useState(() => num('gitty.fontSize', 12.5, 9, 20))
  const [rowHeight, setRowHeight] = useState(() => num('gitty.rowHeight', 20, 18, 26))
  const [timeZone, setTimeZone] = useState<TimeZone>(loadTimeZone)
  const [relativeTime, setRelativeTime] = useState(
    () => localStorage.getItem('gitty.relativeTime') === 'on'
  )
  // Empty means the stylesheet's own stack, which is the sane default; a name
  // the system does not have simply falls through it.
  const [monoFont, setMonoFont] = useState(() => localStorage.getItem('gitty.monoFont') ?? '')
  const [diffContext, setDiffContext] = useState(() =>
    num('gitty.diffContext', DEFAULT_DIFF_OPTIONS.context, 0, 25)
  )
  const [ignoreWhitespace, setIgnoreWhitespace] = useState<DiffOptions['ignoreWhitespace']>(() => {
    const v = localStorage.getItem('gitty.ignoreWhitespace')
    return v === 'change' || v === 'all' ? v : 'none'
  })
  const [restoreTabs, setRestoreTabs] = useState(
    () => localStorage.getItem('gitty.restoreTabs') !== 'off'
  )
  // The one preference the main process owns: it has to know before a window
  // exists, so it is read back from there rather than from localStorage.
  const [singleInstance, setSingleInstanceState] = useState(true)
  const [termShell, setTermShell] = useState(() => localStorage.getItem('gitty.termShell') ?? '')
  const [termLogin, setTermLogin] = useState(
    () => localStorage.getItem('gitty.termLogin') !== 'off'
  )
  // The commands "Send" offers. There is no settings row for them: the command
  // is chosen where it is used, which is once per hand-over rather than once
  // per install. The list is its own memory of which one is current — running
  // a command moves it to the front — so the head of it is what Send runs, and
  // there is no second stored answer to drift out of it.
  const [agentCommands, setAgentCommands] = useState<string[]>(loadAgentCommands)

  useEffect(() => void window.gitty.singleInstance.get().then(setSingleInstanceState), [])

  const setSingleInstance = useCallback((on: boolean) => {
    setSingleInstanceState(on)
    void window.gitty.singleInstance.set(on)
  }, [])

  // Grouped for the consumers that take them whole. Memoised because RepoTab's
  // diff effect depends on the object: a fresh one per render would re-run git
  // on every keystroke anywhere in the app.
  const time = useMemo(() => ({ zone: timeZone, relative: relativeTime }), [timeZone, relativeTime])
  const diffOptions = useMemo<DiffOptions>(
    () => ({ context: diffContext, ignoreWhitespace }),
    [diffContext, ignoreWhitespace]
  )
  const terminalOptions = useMemo<TerminalOptions>(
    () => ({ shell: termShell, login: termLogin }),
    [termShell, termLogin]
  )

  /**
   * Remember a command by running it. It goes to the head of the list, which is
   * where the picker reads the current one from; a command earns its place by
   * having been run, so typing one into the box does not fill the dropdown with
   * every intermediate keystroke.
   */
  const useAgentCommand = useCallback((command: string) => {
    const c = command.trim()
    if (!c) return
    setAgentCommands((list) => [c, ...list.filter((x) => x !== c)].slice(0, AGENT_COMMAND_LIMIT))
  }, [])

  const forgetAgentCommand = useCallback((command: string) => {
    setAgentCommands((list) => list.filter((x) => x !== command))
  }, [])

  const resetSettings = useCallback(() => {
    setPanes({ ...ALL_PANES })
    setLocale('en')
    setTimeZone(SYSTEM_TZ)
    setRelativeTime(false)
    setMonoFont('')
    setDiffContext(DEFAULT_DIFF_OPTIONS.context)
    setIgnoreWhitespace('none')
    setRestoreTabs(true)
    setSingleInstance(true)
    setTermShell('')
    setTermLogin(true)
    setAgentCommands([...AGENT_COMMANDS])
    setTheme('dark')
    setFontSize(12.5)
    setRowHeight(20)
    setWrap(true)
    setDiffView('inline')
    setWordDiff(true)
    setMdOutline(true)
    setMdLineNumbers(false)
    setPluginPrefs(defaultPluginPrefs())
    setNaturalSort(true)
    setGraph(true)
  }, [setSingleInstance])

  // Push the visual knobs onto <html> as layout effects, so child passive
  // effects (TerminalPane reads the CSS variables) always see the new values.
  useLayoutEffect(() => {
    const el = document.documentElement
    el.dataset.theme = theme
    el.style.setProperty('--font-size', `${fontSize}px`)
    el.style.setProperty('--row-h', `${rowHeight}px`)
    // Empty removes the override, leaving the stylesheet's own stack; a name
    // with spaces needs quoting to be a valid font-family value.
    if (monoFont.trim()) el.style.setProperty('--font-mono', `"${monoFont.trim()}", monospace`)
    else el.style.removeProperty('--font-mono')
    el.style.colorScheme = theme
  }, [theme, fontSize, rowHeight, monoFont])

  useEffect(() => {
    localStorage.setItem('gitty.wrap', wrap ? 'on' : 'off')
    localStorage.setItem('gitty.diffView', diffView)
    localStorage.setItem('gitty.wordDiff', wordDiff ? 'on' : 'off')
    localStorage.setItem('gitty.mdOutline', mdOutline ? 'on' : 'off')
    localStorage.setItem('gitty.mdLineNumbers', mdLineNumbers ? 'on' : 'off')
    storePluginPrefs(pluginPrefs)
    localStorage.setItem('gitty.naturalSort', naturalSort ? 'on' : 'off')
    localStorage.setItem('gitty.graph', graph ? 'on' : 'off')
    localStorage.setItem('gitty.theme', theme)
    localStorage.setItem('gitty.fontSize', String(fontSize))
    localStorage.setItem('gitty.rowHeight', String(rowHeight))
    localStorage.setItem('gitty.panes', JSON.stringify(panes))
    localStorage.setItem('gitty.timeZone', timeZone)
    localStorage.setItem('gitty.relativeTime', relativeTime ? 'on' : 'off')
    localStorage.setItem('gitty.monoFont', monoFont)
    localStorage.setItem('gitty.diffContext', String(diffContext))
    localStorage.setItem('gitty.ignoreWhitespace', ignoreWhitespace)
    localStorage.setItem('gitty.restoreTabs', restoreTabs ? 'on' : 'off')
    localStorage.setItem('gitty.termShell', termShell)
    localStorage.setItem('gitty.termLogin', termLogin ? 'on' : 'off')
    localStorage.setItem('gitty.agentCommands', JSON.stringify(agentCommands))
  }, [
    wrap,
    diffView,
    wordDiff,
    mdOutline,
    mdLineNumbers,
    pluginPrefs,
    naturalSort,
    graph,
    theme,
    fontSize,
    rowHeight,
    panes,
    timeZone,
    relativeTime,
    monoFont,
    diffContext,
    ignoreWhitespace,
    restoreTabs,
    termShell,
    termLogin,
    agentCommands
  ])

  // Persist locale and tell the main process.
  useEffect(() => {
    localStorage.setItem('gitty.locale', locale)
    window.gitty.settings.setLocale(locale)
  }, [locale])

  return {
    locale,
    setLocale,
    wrap,
    setWrap,
    diffView,
    setDiffView,
    wordDiff,
    setWordDiff,
    mdOutline,
    setMdOutline,
    mdLineNumbers,
    setMdLineNumbers,
    pluginPrefs,
    setPluginPrefs,
    naturalSort,
    setNaturalSort,
    graph,
    setGraph,
    panes,
    setPanes,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    rowHeight,
    setRowHeight,
    timeZone,
    setTimeZone,
    relativeTime,
    setRelativeTime,
    monoFont,
    setMonoFont,
    diffContext,
    setDiffContext,
    ignoreWhitespace,
    setIgnoreWhitespace,
    restoreTabs,
    setRestoreTabs,
    singleInstance,
    setSingleInstance,
    termShell,
    setTermShell,
    termLogin,
    setTermLogin,
    agentCommands,
    useAgentCommand,
    forgetAgentCommand,
    time,
    diffOptions,
    terminalOptions,
    resetSettings
  }
}
