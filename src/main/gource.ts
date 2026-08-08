import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { msg } from './messages'
import type { GitOpResult } from '../shared/types'

/**
 * Gource, if the user happens to have it: an OpenGL animation of a repository
 * growing, commit by commit. It is an optional companion, never a dependency —
 * the button that starts it is not rendered when the binary is not on `PATH`.
 *
 * Gource draws its own window and reads the repository itself, so nothing is
 * piped through here. All this module does is find it, start it detached, and
 * report the failure if it does not survive its first seconds.
 */

/** Looked up once: PATH does not change under a running app. */
let found: string | null | undefined

/** Names to try; Windows needs the extension to find an executable at all. */
const NAMES = process.platform === 'win32' ? ['gource.exe', 'gource.cmd', 'gource.bat'] : ['gource']

function locate(): string | null {
  const dirs = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)
  for (const dir of dirs) {
    for (const name of NAMES) {
      const candidate = path.join(dir, name)
      try {
        // X_OK is meaningless on Windows, where being on PATH under one of the
        // executable names is the whole test.
        fs.accessSync(candidate, process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK)
        return candidate
      } catch {
        // Not here; keep looking.
      }
    }
  }
  return null
}

export function available(): boolean {
  if (found === undefined) found = locate()
  return found !== null
}

/**
 * How long to keep watching a freshly started gource. Long enough to catch the
 * ways it fails immediately — no display, a driver without OpenGL, a path it
 * will not read — and short enough that the button does not feel stuck. Once
 * the window is up, gource is on its own and outlives Gitty.
 */
const GRACE_MS = 2500

export function play(root: string): Promise<GitOpResult> {
  const bin = available() ? (found as string) : null
  if (!bin) return Promise.resolve({ ok: false, output: msg.gource.notInstalled })

  const child = spawn(
    bin,
    [
      '--title',
      path.basename(root),
      // A day of history per half second, idle files kept on screen and gaps
      // skipped: the defaults show a slow trickle that reads as nothing
      // happening on a repository with any real history behind it.
      '--seconds-per-day',
      '0.5',
      '--auto-skip-seconds',
      '1',
      '--file-idle-time',
      '0',
      '--key',
      '-1280x720',
      root
    ],
    { detached: true, stdio: ['ignore', 'pipe', 'pipe'] }
  )

  return new Promise<GitOpResult>((resolve) => {
    let settled = false
    let stderr = ''
    const finish = (r: GitOpResult): void => {
      if (settled) return
      settled = true
      resolve(r)
    }

    child.stderr?.on('data', (b: Buffer) => {
      stderr += b.toString()
    })
    child.on('error', (e) => finish({ ok: false, output: `${msg.gource.failed}: ${e.message}` }))
    child.on('exit', (code) =>
      finish(
        code
          ? { ok: false, output: stderr.trim() || `${msg.gource.failed} (${code})` }
          : // A gource that ends inside the grace period played a repository too
            // small to see; there is nothing to report.
            { ok: true, output: '' }
      )
    )

    setTimeout(() => {
      // Still running: let it go, and stop reading its pipes so a long session
      // does not accumulate output nobody will look at.
      child.stdout?.destroy()
      child.stderr?.destroy()
      child.unref()
      finish({ ok: true, output: '' })
    }, GRACE_MS)
  })
}
