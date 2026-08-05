import { useEffect, useRef, type JSX } from 'react'
import { Terminal, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'

export type Theme = 'dark' | 'light'

/**
 * Read the terminal palette from the CSS variables, so the terminal follows
 * the app theme without a second, duplicated colour set.
 */
function readTheme(): ITheme {
  const v = (name: string): string =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return {
    background: v('--bg-pane'),
    foreground: v('--fg'),
    cursor: v('--fg'),
    selectionBackground: v('--bg-select'),
    black: v('--bg'),
    red: v('--red'),
    green: v('--green'),
    yellow: v('--yellow'),
    blue: v('--blue'),
    magenta: v('--magenta'),
    cyan: v('--cyan'),
    white: v('--fg')
  }
}

/** Embedded interactive shell rooted at the repository. */
export function TerminalPane({
  root,
  theme,
  fontSize
}: {
  root: string
  theme: Theme
  fontSize: number
}): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitRef = useRef<FitAddon | null>(null)

  // Create the terminal once per repository; the shell must survive later
  // appearance changes, which the effect below applies live instead.
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const term = new Terminal({
      fontFamily: getComputedStyle(document.body).fontFamily,
      fontSize,
      theme: readTheme(),
      cursorBlink: true,
      scrollback: 10_000,
      allowProposedApi: true
    })
    termRef.current = term
    const fit = new FitAddon()
    fitRef.current = fit
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
      termRef.current = null
      fitRef.current = null
    }
  }, [root, fontSize])

  // Apply appearance changes live, keeping the running shell.
  useEffect(() => {
    const term = termRef.current
    if (!term) return
    term.options.fontSize = fontSize
    term.options.theme = readTheme()
    try {
      fitRef.current?.fit()
    } catch {
      /* host not laid out yet */
    }
    window.gitty.terminal.resize(term.cols, term.rows)
  }, [theme, fontSize])

  return <div className="term-host" ref={hostRef} />
}
