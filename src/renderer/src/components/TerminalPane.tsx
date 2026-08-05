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

interface Session {
  /** The element xterm was opened on; React moves it, never rebuilds it. */
  host: HTMLDivElement
  term: Terminal
  fit: FitAddon
  onExit?: () => void
  onFocus?: () => void
}

/**
 * Live terminals, keyed by session id.
 *
 * Splitting reshapes the panel tree, and React unmounts whatever sat where a
 * split now sits. A terminal cannot survive that: disposing the xterm and
 * starting over would take the running shell with it. So the DOM node and the
 * xterm instance live here, outside React, and the component only parents the
 * node — moving it between panels leaves the terminal and its scrollback
 * untouched. Sessions end only when the pane is closed or the repository
 * changes, which is where `destroySession` is called.
 */
const sessions = new Map<string, Session>()

// One pair of IPC listeners for every session; the main process tags each
// message with the id it came from.
window.gitty.terminal.onData((id, data) => sessions.get(id)?.term.write(data))
window.gitty.terminal.onExit((id, { exitCode }) => {
  const s = sessions.get(id)
  if (!s) return
  s.term.writeln(`\r\n\x1b[90m[shell exited with code ${exitCode}]\x1b[0m`)
  s.onExit?.()
})

function fitSession(s: Session, id: string): void {
  // A detached or not-yet-laid-out host has no size to fit to.
  if (!s.host.isConnected || s.host.clientHeight === 0) return
  try {
    s.fit.fit()
    window.gitty.terminal.resize(id, s.term.cols, s.term.rows)
  } catch {
    /* nothing to measure yet */
  }
}

function ensureSession(id: string, root: string, fontSize: number): Session {
  const existing = sessions.get(id)
  if (existing) return existing

  const host = document.createElement('div')
  host.className = 'term-xterm'
  const term = new Terminal({
    fontFamily: getComputedStyle(document.body).fontFamily,
    fontSize,
    theme: readTheme(),
    cursorBlink: true,
    scrollback: 10_000,
    allowProposedApi: true
  })
  const fit = new FitAddon()
  term.loadAddon(fit)
  term.loadAddon(new WebLinksAddon())
  term.open(host)
  term.onData((data) => window.gitty.terminal.input(id, data))

  const s: Session = { host, term, fit }
  sessions.set(id, s)
  term.textarea?.addEventListener('focus', () => s.onFocus?.())

  new ResizeObserver(() => fitSession(s, id)).observe(host)
  void window.gitty.terminal.start(id, root, term.cols || 80, term.rows || 24)
  return s
}

/** End a session for good: the shell, the xterm and its DOM. */
export function destroySession(id: string): void {
  const s = sessions.get(id)
  if (!s) return
  sessions.delete(id)
  window.gitty.terminal.close(id)
  s.term.dispose()
  s.host.remove()
}

/** Give a session keyboard focus, if it still exists. */
export function focusSession(id: string): void {
  sessions.get(id)?.term.focus()
}

/** One interactive shell rooted at the repository; one leaf of the split. */
export function TerminalPane({
  id,
  root,
  theme,
  fontSize,
  active,
  onFocus,
  onExit
}: {
  id: string
  root: string
  theme: Theme
  fontSize: number
  active: boolean
  onFocus: () => void
  onExit: () => void
}): JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const s = ensureSession(id, root, fontSize)
    s.onFocus = onFocus
    s.onExit = onExit
    // appendChild moves the node when it already has a parent, which is
    // exactly what a re-parented panel needs.
    box.appendChild(s.host)
    // Once now and once after the browser has laid the panel out: closing a
    // split re-parents the terminal into a box that has no size yet.
    fitSession(s, id)
    const raf = requestAnimationFrame(() => fitSession(s, id))
    return () => cancelAnimationFrame(raf)
  })

  // Appearance changes apply to the running shell rather than replacing it.
  useEffect(() => {
    const s = sessions.get(id)
    if (!s) return
    s.term.options.fontSize = fontSize
    s.term.options.theme = readTheme()
    fitSession(s, id)
  }, [id, theme, fontSize])

  return (
    <div
      className={`term-host${active ? ' active' : ''}`}
      data-term-id={id}
      ref={boxRef}
      onMouseDown={onFocus}
      // A click on the padding around the terminal should still land in it.
      onClick={() => focusSession(id)}
    />
  )
}
