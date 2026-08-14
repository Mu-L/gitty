import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import type { WebContents } from 'electron'
import * as nodePty from 'node-pty'
import type { TerminalOptions } from '../shared/types'

export interface TerminalSession {
  write(data: string): void
  resize(cols: number, rows: number): void
  dispose(): void
}

function defaultShell(): string {
  if (process.platform === 'win32') return process.env.COMSPEC || 'powershell.exe'
  return process.env.SHELL || '/bin/bash'
}

/**
 * A shell the settings named, falling back to the system's when it is empty or
 * not there. A typo would otherwise spawn nothing and leave the pane dead with
 * no way to fix it from inside the app.
 */
function chosenShell(want: string): string {
  const s = want.trim()
  if (!s) return defaultShell()
  if (path.isAbsolute(s) && !fs.existsSync(s)) return defaultShell()
  return s
}

/**
 * The shells this machine offers, for the settings list. `/etc/shells` is the
 * system's own answer on Linux and macOS; Windows has no such file, so the
 * usual three are probed by name. Anything not on disk is dropped, and $SHELL
 * is included even when the file does not list it.
 */
export async function availableShells(): Promise<string[]> {
  const found = new Set<string>()
  if (process.platform === 'win32') {
    for (const c of [process.env.COMSPEC, 'powershell.exe', 'pwsh.exe', 'cmd.exe']) {
      if (c) found.add(c)
    }
    return [...found]
  }
  try {
    const text = await fs.promises.readFile('/etc/shells', 'utf8')
    for (const line of text.split('\n')) {
      const p = line.trim()
      if (p && !p.startsWith('#')) found.add(p)
    }
  } catch {
    // No /etc/shells (a minimal container, say); the probes below still answer.
  }
  for (const p of ['/bin/bash', '/bin/zsh', '/bin/sh', '/usr/bin/fish', '/bin/dash']) {
    found.add(p)
  }
  if (process.env.SHELL) found.add(process.env.SHELL)
  const existing = await Promise.all(
    [...found].map((p) =>
      fs.promises
        .access(p, fs.constants.X_OK)
        .then(() => p)
        .catch(() => null)
    )
  )
  return existing.filter((p): p is string => p !== null).sort()
}

/**
 * Spawn an interactive login shell rooted at the repository, streaming its
 * output to the renderer over `terminal:data`. Every message carries the
 * session id, since the renderer may hold several split terminals at once.
 */
export function createTerminal(
  wc: WebContents,
  id: string,
  cwd: string,
  cols = 80,
  rows = 24,
  opts: TerminalOptions = { shell: '', login: true }
): TerminalSession {
  const shell = chosenShell(opts.shell)
  // Windows shells have no login flag; -l is a POSIX-shell idea.
  const args = process.platform === 'win32' || !opts.login ? [] : ['-l']
  const proc = nodePty.spawn(shell, args, {
    name: 'xterm-256color',
    cwd,
    cols,
    rows,
    env: { ...process.env, TERM: 'xterm-256color', GIT_PAGER: 'cat', PAGER: 'cat' } as Record<
      string,
      string
    >
  })

  // A replaced session (window reload, repository switch) must stay quiet:
  // its output would otherwise land in the terminal that succeeded it.
  let disposed = false

  proc.onData((data) => {
    if (!disposed && !wc.isDestroyed()) wc.send('terminal:data', id, data)
  })
  proc.onExit(({ exitCode, signal }) => {
    if (!disposed && !wc.isDestroyed()) wc.send('terminal:exit', id, { exitCode, signal })
  })

  return {
    write: (data) => proc.write(data),
    resize: (c, r) => {
      try {
        proc.resize(Math.max(c, 1), Math.max(r, 1))
      } catch {
        /* the pty may already be gone */
      }
    },
    dispose: () => {
      disposed = true
      try {
        proc.kill()
      } catch {
        /* already exited */
      }
    }
  }
}

export const homeDir = os.homedir()
