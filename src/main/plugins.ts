import fs from 'node:fs'
import path from 'node:path'
import { app, type IpcMain } from 'electron'
import type { PluginHost, PluginMain } from '../plugins/types'
import { main as semanticReading } from '../plugins/semantic-reading/main'

/**
 * The main process's whole knowledge of plugins — see `ref/spec/plugins.md`.
 * Registering one is an import and an array entry; there is no second place
 * that has to hear about it.
 */
const PLUGINS: PluginMain[] = [semanticReading]

/**
 * A plugin's own corner of the app's state, made when it is first asked for.
 * Keyed by id, so two plugins cannot collide and neither writes into the app's
 * own files.
 */
function hostFor(id: string): PluginHost {
  const dir = path.join(app.getPath('userData'), 'plugins', id)
  return {
    configDir: () => {
      try {
        fs.mkdirSync(dir, { recursive: true })
      } catch {
        // Unwritable: the plugin's own file handling reports it, or falls back
        // to its defaults for this run. Not a reason to fail the call.
      }
      return dir
    }
  }
}

/**
 * The one channel. Both halves of the name are looked up rather than trusted:
 * without that check a renderer bug would have a name-shaped hole into the main
 * process, and a method a plugin never declared would be reachable by guessing
 * it.
 */
export function registerPlugins(ipcMain: IpcMain): void {
  const byId = new Map(PLUGINS.map((p) => [p.id, p]))
  ipcMain.handle('plugin:invoke', (_e, id: string, method: string, args: unknown[]) => {
    const plugin = byId.get(id)
    // `hasOwnProperty`, not a bare lookup: `constructor` and `__proto__` are
    // on every object, and a table indexed by a string from the renderer must
    // not answer with one of them.
    const own = plugin && Object.prototype.hasOwnProperty.call(plugin.methods, method)
    const fn = own ? plugin.methods[method] : undefined
    if (!fn) throw new Error(`no such plugin method: ${id}.${method}`)
    return fn(hostFor(id), Array.isArray(args) ? args : [])
  })
}
