import type { Locale } from '../shared/messages'

/**
 * The plugin contract — see `ref/spec/plugins.md`. A plugin is a directory that
 * owns both halves of its own process boundary, its own storage, its own
 * strings and its own settings rows; the core knows it only through what is
 * declared here.
 *
 * This file is types and two constants: it is imported by both TypeScript
 * projects and by every plugin, so anything with a body belongs somewhere else.
 */

/** What a preference may hold. A plugin that wants more shapes than these has
 *  a setting that wants rethinking before the union does. */
export type PrefValue = string | boolean

/** One preference a plugin declares. `enabled` is never declared: every plugin
 *  has it, and the manifest only says which way it starts. */
export interface PrefSpec {
  key: string
  default: PrefValue
}

/** The values of one plugin's preferences, and the way to change one. */
export interface PluginPrefs {
  /** Whether the plugin is on at all; nothing is asked of it while it is off. */
  enabled: boolean
  get(key: string): PrefValue
  set(key: string, value: PrefValue): void
}

/**
 * A row in Settings ▸ Plugins, declared rather than drawn. Labels arrive
 * already in the reader's language — the manifest is handed the locale and
 * looks its own strings up, so nothing in the core has to know what a plugin's
 * messages contain.
 */
export type SettingsRow =
  | { kind: 'check'; label: string; pref: string }
  | {
      kind: 'segmented'
      label: string
      pref: string
      options: Array<{ value: string; label: string }>
    }
  | {
      kind: 'file'
      label: string
      /** The button's own label — "Open", and its translations. */
      action: string
      /** Resolves the absolute path to open; asking for it is usually also
       *  what creates the file. */
      open: () => Promise<string>
    }

/** A range of one text segment a plugin wants marked, in JavaScript string
 *  indices, half-open. `className` is the plugin's own name for what it
 *  found; the pane turns it into a class through `markClass`. */
export interface Mark {
  start: number
  end: number
  className: string
}

/**
 * Inline marks over the text of a rendered markdown document. The plugin says
 * which segments interest it, is asked about them once per document, and gets a
 * stylesheet of its own into the pane.
 *
 * `analyse` is expected to be slow and allowed to fail: the document renders
 * unmarked first and re-renders when the marks arrive, so a plugin that throws
 * or has nothing to say leaves an ordinary rendered document behind.
 */
export interface MarksExtension {
  /** Cheap and pure — this runs while the document renders. */
  wanted(text: string): boolean
  /** Every wanted segment at once; one answer per segment, in order. */
  analyse(texts: string[], prefs: PluginPrefs): Promise<Mark[][]>
  /** This plugin's classes, written with `markClass`. */
  css(prefs: PluginPrefs): Promise<string>
}

/** What a plugin's `ui/index.ts` exports. */
export interface Plugin {
  id: string
  /** Shown as the group heading in Settings ▸ Plugins. */
  name(locale: Locale): string
  /** One line under it, saying what turning this on does. */
  summary(locale: Locale): string
  /** Which way `enabled` starts. Non-core means off unless there is a reason. */
  enabledByDefault: boolean
  prefs: PrefSpec[]
  rows(locale: Locale, prefs: PluginPrefs): SettingsRow[]
  marks?: MarksExtension
}

/** What the main half is given, rather than what it reaches for. */
export interface PluginHost {
  /** `userData/plugins/<id>/`, created on demand — this plugin's own corner of
   *  the app's state, so two plugins cannot collide and neither writes into the
   *  app's own files. */
  configDir(): string
}

/** What a plugin's `main/index.ts` exports.
 *
 *  A method is loose on purpose and the looseness stops at the plugin's own
 *  edge: the caller and the callee are the same plugin, and its `shared.ts` is
 *  where the two agree what a method takes and returns. */
export interface PluginMain {
  id: string
  methods: Record<string, (host: PluginHost, args: unknown[]) => unknown>
}

/** An id or a class name may only be these characters: both end up in a CSS
 *  selector, and a selector is not a place to discover a surprise. */
export const PLUGIN_NAME = /^[a-z0-9-]+$/
