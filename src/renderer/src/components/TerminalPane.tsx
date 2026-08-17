import { useEffect, useRef, type JSX } from 'react'
import { Terminal, type ITheme } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import { focusSession, sessions, type Session } from '../terminals'
import { getMessages } from '../messages'
import { loadLocale, useMsg } from '../locale'
import type { TerminalOptions } from '../../../shared/types'
import { isCopyChord } from '../copy'
import { isBrowseChord, isPaneCycleChord } from '../panes'

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

// One pair of IPC listeners for every session; the main process tags each
// message with the id it came from. Sessions are only ever created here (in
// `ensureSession`), so by the time one exists the listeners are in place.
window.gitty.terminal.onData((id, data) => sessions.get(id)?.term.write(data))
window.gitty.terminal.onExit((id, { exitCode }) => {
  const s = sessions.get(id)
  if (!s) return
  s.term.writeln(`\r\n\x1b[90m${getMessages(loadLocale()).terminal.shellExited(exitCode)}\x1b[0m`)
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

function ensureSession(
  id: string,
  root: string,
  fontSize: number,
  opts: TerminalOptions
): Session {
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
  // Ctrl+Shift+C is a copy, not something the shell should see: xterm would
  // otherwise send it on as the interrupt. Returning false leaves the event to
  // bubble, which is where the app's copy handler picks it up.
  // Ctrl+Tab is the same kind of thing: while the terminal fills the window it
  // is the only way out of it, so the shell must not see it either.
  term.attachCustomKeyEventHandler(
    (e) =>
      !(e.type === 'keydown' && (isCopyChord(e) || isPaneCycleChord(e) || isBrowseChord(e)))
  )
  term.onData((data) => window.gitty.terminal.input(id, data))

  const s: Session = { host, term, fit }
  sessions.set(id, s)
  term.textarea?.addEventListener('focus', () => s.onFocus?.())

  new ResizeObserver(() => fitSession(s, id)).observe(host)
  void window.gitty.terminal.start(id, root, term.cols || 80, term.rows || 24, opts)
  return s
}

/** One interactive shell rooted at the repository; one leaf of the split. */
export function TerminalPane({
  id,
  root,
  theme,
  fontSize,
  fontFamily,
  options,
  active,
  canClose,
  onFocus,
  onClose,
  onExit
}: {
  id: string
  root: string
  theme: Theme
  fontSize: number
  /** The monospace font setting. Only a signal that it changed: the value the
   *  terminal takes is the computed one, the same the panes are drawn in. */
  fontFamily: string
  /** Which shell this session starts, and how — read only when it is created. */
  options: TerminalOptions
  active: boolean
  canClose: boolean
  onFocus: () => void
  onClose: () => void
  onExit: () => void
}): JSX.Element {
  const { msg } = useMsg()
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const s = ensureSession(id, root, fontSize, options)
    s.onFocus = onFocus
    s.onExit = onExit
    // Repo changes trigger state updates that re-render the whole tree, and
    // this effect (no deps) runs on every one. Re-appending the host and
    // calling fit on a terminal whose container never moved is at best wasted
    // work and at worst the reason the textarea loses focus mid-type. The
    // guard below skips both unless the container actually changed — a split,
    // a merge, or the first mount after ensureSession created the host.
    if (s.host.parentElement !== box) {
      // appendChild moves a node that already has a parent, which is exactly
      // what a re-parented panel needs.
      box.appendChild(s.host)
      // Once now and once after the browser has laid the panel out: closing a
      // split re-parents the terminal into a box that has no size yet.
      fitSession(s, id)
      const raf = requestAnimationFrame(() => fitSession(s, id))
      return () => cancelAnimationFrame(raf)
    }
  })

  // Appearance changes apply to the running shell rather than replacing it.
  useEffect(() => {
    const s = sessions.get(id)
    if (!s) return
    s.term.options.fontSize = fontSize
    s.term.options.fontFamily = getComputedStyle(document.body).fontFamily
    s.term.options.theme = readTheme()
    fitSession(s, id)
  }, [id, theme, fontSize, fontFamily])

  return (
    <div
      className={`term-host${active ? ' active' : ''}`}
      data-term-id={id}
      ref={boxRef}
      onMouseDown={onFocus}
      // A click on the padding around the terminal should still land in it.
      onClick={() => focusSession(id)}
    >
      {canClose && (
        <button
          className="term-close"
          title={msg.terminal.closeTerminal}
          // The button floats over the shell; a click on it must not also
          // focus the terminal underneath.
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
