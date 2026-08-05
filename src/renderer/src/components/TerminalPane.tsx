import { useEffect, useRef, type JSX } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

const THEME = {
  background: '#171a21',
  foreground: '#c8cede',
  cursor: '#c8cede',
  selectionBackground: '#2c3446',
  black: '#12141a',
  red: '#e26a6a',
  green: '#61c26b',
  yellow: '#d8b34a',
  blue: '#5b9cff',
  magenta: '#b98ae0',
  cyan: '#4fc3d0',
  white: '#c8cede'
}

/** Embedded interactive shell rooted at the repository. */
export function TerminalPane({ root }: { root: string }): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const term = new Terminal({
      fontFamily: getComputedStyle(document.body).fontFamily,
      fontSize: 12.5,
      theme: THEME,
      cursorBlink: true,
      scrollback: 10_000,
      allowProposedApi: true
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.loadAddon(new WebLinksAddon())
    term.open(host)

    const resize = (): void => {
      try {
        fit.fit()
        window.gitty.terminal.resize(term.cols, term.rows)
      } catch {
        /* host not laid out yet */
      }
    }
    resize()

    const offData = window.gitty.terminal.onData((data) => term.write(data))
    const offExit = window.gitty.terminal.onExit(({ exitCode }) =>
      term.writeln(`\r\n\x1b[90m[shell exited with code ${exitCode}]\x1b[0m`)
    )
    term.onData((data) => window.gitty.terminal.input(data))

    void window.gitty.terminal.start(root, term.cols, term.rows)

    const ro = new ResizeObserver(resize)
    ro.observe(host)

    return () => {
      ro.disconnect()
      offData()
      offExit()
      term.dispose()
    }
  }, [root])

  return <div className="term-host" ref={hostRef} />
}
