import type { FitAddon } from '@xterm/addon-fit'
import type { Terminal } from '@xterm/xterm'

/**
 * The terminal state that must survive the terminal pane's React component:
 * the split layouts and the live xterm sessions, keyed by repository and by
 * session id respectively. They live here, outside both `TerminalsPane` and
 * `TerminalPane`, so the heavy xterm chunk can be lazy-loaded while `RepoTab`
 * still calls `destroyTerminals` synchronously when a repository tab closes.
 *
 * Only `import type` touches xterm in this module — the annotations erase at
 * build time, so nothing here pulls the terminal into the main bundle.
 */

/** A running shell: the element xterm was opened on, and the terminal. */
export interface Session {
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
export const sessions = new Map<string, Session>()

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

type Orientation = 'horizontal' | 'vertical'

/** The split layout: a leaf is one shell, a branch divides its area between its children. */
export type TermNode =
  | { kind: 'leaf'; id: string }
  | { kind: 'split'; orientation: Orientation; children: TermNode[] }

export function leaves(node: TermNode): string[] {
  return node.kind === 'leaf' ? [node.id] : node.children.flatMap(leaves)
}

let counter = 0
export const nextTermId = (): string => `term${++counter}`

/**
 * The split layout per repository, kept outside React for the same reason the
 * xterms are: hiding the terminal pane unmounts the component, and a shell
 * must not die because its pane was toggled away. Sessions end only in
 * `destroyTerminals`, which the repository tab calls when it closes.
 */
export const layouts = new Map<string, { tree: TermNode; focused: string }>()

export function layoutFor(root: string): { tree: TermNode; focused: string } {
  const existing = layouts.get(root)
  if (existing) return existing
  const id = nextTermId()
  const fresh = { tree: { kind: 'leaf', id } as TermNode, focused: id }
  layouts.set(root, fresh)
  return fresh
}

/**
 * Type a command into a repository's focused shell and press Enter.
 *
 * This is the whole of "hand the index to an agent": Gitty writes text into a
 * pty and stops there. Whatever runs then has a real terminal, so its prompts,
 * its confirmations and its streaming output appear where the user is already
 * looking, and hooks or gpg signing that want a tty find one. False when there
 * is no shell to write to — the terminal pane has never been opened in this
 * tab — which the caller reports rather than swallowing.
 */
export function runInTerminal(root: string, command: string): boolean {
  const layout = layouts.get(root)
  if (!layout) return false
  const id = sessions.has(layout.focused)
    ? layout.focused
    : leaves(layout.tree).find((leaf) => sessions.has(leaf))
  if (!id) return false
  window.gitty.terminal.input(id, `${command}\r`)
  focusSession(id)
  return true
}

/** End every shell of a repository, and forget its layout. */
export function destroyTerminals(root: string): void {
  const layout = layouts.get(root)
  if (!layout) return
  layouts.delete(root)
  leaves(layout.tree).forEach(destroySession)
}
