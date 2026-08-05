import os from 'node:os'
import type { WebContents } from 'electron'
import * as nodePty from 'node-pty'

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
 * Spawn an interactive login shell rooted at the repository, streaming its
 * output to the renderer over `terminal:data`.
 */
export function createTerminal(
  wc: WebContents,
  cwd: string,
  cols = 80,
  rows = 24
): TerminalSession {
  const shell = defaultShell()
  const proc = nodePty.spawn(shell, process.platform === 'win32' ? [] : ['-l'], {
    name: 'xterm-256color',
    cwd,
    cols,
    rows,
    env: { ...process.env, TERM: 'xterm-256color', GIT_PAGER: 'cat', PAGER: 'cat' } as Record<
      string,
      string
    >
  })

  proc.onData((data) => {
    if (!wc.isDestroyed()) wc.send('terminal:data', data)
  })
  proc.onExit(({ exitCode, signal }) => {
    if (!wc.isDestroyed()) wc.send('terminal:exit', { exitCode, signal })
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
      try {
        proc.kill()
      } catch {
        /* already exited */
      }
    }
  }
}

export const homeDir = os.homedir()
