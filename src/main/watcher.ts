import fs from 'node:fs'
import path from 'node:path'

/** Paths whose churn should never trigger a UI refresh. */
const NOISE = /(^|[\\/])(node_modules|\.cache|dist|out|target|\.venv|__pycache__)([\\/]|$)/

/** Inside .git only these actually change what we display. */
const GIT_INTERESTING = /^\.git[\\/](HEAD|ORIG_HEAD|index|MERGE_HEAD|refs[\\/]|packed-refs)/

export interface RepoWatcher {
  close(): void
}

/**
 * Watch a work tree and fire `onChange` (debounced) when something that affects
 * the status or the log changes. Falls back to no-op if recursive watch is
 * unsupported on this platform.
 */
export function watchRepo(root: string, onChange: () => void, delay = 250): RepoWatcher {
  let timer: NodeJS.Timeout | null = null
  const fire = (): void => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(onChange, delay)
  }

  let watcher: fs.FSWatcher | null = null
  try {
    watcher = fs.watch(root, { recursive: true }, (_event, filename) => {
      if (!filename) return fire()
      const rel = path.normalize(String(filename))
      if (rel.startsWith('.git')) {
        if (GIT_INTERESTING.test(rel)) fire()
        return
      }
      if (NOISE.test(rel)) return
      fire()
    })
    watcher.on('error', () => {
      /* watching is best-effort; the manual refresh still works */
    })
  } catch {
    watcher = null
  }

  return {
    close(): void {
      if (timer) clearTimeout(timer)
      watcher?.close()
    }
  }
}
