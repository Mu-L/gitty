import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'

/**
 * The handful of settings the main process needs before a window exists, and
 * so before the renderer's `localStorage` can be asked. Everything else lives
 * there; this file is only for what has to be read this early.
 */
export type MainPrefs = {
  /**
   * One process per user, or one per launch. Single instance is the default:
   * `gitty .` from any directory then adds a tab to the window already open
   * rather than starting a second copy of the app.
   */
  singleInstance: boolean
}

const DEFAULTS: MainPrefs = { singleInstance: true }

function storePath(): string {
  return path.join(app.getPath('userData'), 'settings.json')
}

export function readPrefs(): MainPrefs {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(storePath(), 'utf8'))
    if (!parsed || typeof parsed !== 'object') return { ...DEFAULTS }
    const v = (parsed as Record<string, unknown>).singleInstance
    return { singleInstance: typeof v === 'boolean' ? v : DEFAULTS.singleInstance }
  } catch {
    return { ...DEFAULTS } // no store yet, or it was corrupted — take the defaults
  }
}

export function writePrefs(prefs: MainPrefs): void {
  try {
    fs.mkdirSync(path.dirname(storePath()), { recursive: true })
    fs.writeFileSync(storePath(), JSON.stringify(prefs, null, 2))
  } catch {
    /* best-effort: a setting that cannot be stored still applies to this run */
  }
}
