/**
 * Which of the four panes are on screen.
 *
 * App-wide rather than per tab, like the other view preferences: the title bar
 * is where a hidden pane is brought back, and that bar belongs to the window,
 * not to a repository.
 */
import type { TooltipLine } from './components/Tooltip'
import type { RendererMessages } from '../../shared/messages'

export type PaneId = 'files' | 'diff' | 'log' | 'terminal'

export type PaneVisibility = Record<PaneId, boolean>

/** Layout order — top-left, top-right, bottom-left, bottom-right. */
export const PANE_ORDER: PaneId[] = ['files', 'diff', 'log', 'terminal']

/** Pane labels drawn from the current message table. */
export function paneLabels(msg: RendererMessages): Record<PaneId, string> {
  return {
    files: msg.paneChrome.paneLabelFiles,
    diff: msg.paneChrome.paneLabelDiff,
    log: msg.log.commits,
    terminal: msg.terminal.title
  }
}

export const ALL_PANES: PaneVisibility = { files: true, diff: true, log: true, terminal: true }

/** Accelerator shown in the menu; the handler lives in App. */
export function paneAccel(id: PaneId): string {
  return `Ctrl+${PANE_ORDER.indexOf(id) + 1}`
}

/**
 * Bring every pane back. Zero belongs to this family — one key past the four
 * that toggle a pane each — but Ctrl+0 is Chromium's reset-zoom, which the View
 * menu keeps, so it takes the Shift.
 */
export const ALL_PANES_ACCEL = 'Ctrl+Shift+0'

/** Full screen is per repository tab, so RepoTab handles this one. */
export function paneFullAccel(id: PaneId): string {
  return `Ctrl+Shift+${PANE_ORDER.indexOf(id) + 1}`
}

/** Cycling between full-screen panes; RepoTab handles it, like full screen. */
export const PANE_CYCLE_ACCEL = 'Ctrl+Tab'

/**
 * True for that key. Read off `code`, like every other chord here, and shared
 * with the terminal: xterm would otherwise pass it to the shell, and while the
 * terminal is the pane filling the window this is the way out of it.
 */
export function isPaneCycleChord(e: KeyboardEvent): boolean {
  return (e.ctrlKey || e.metaKey) && !e.altKey && e.code === 'Tab'
}

/**
 * The pane one step from `from` in layout order, skipping the hidden ones.
 * Cycling is what full screen is missing: with the layout gone there is no
 * other pane to click, so the key has to be the way across.
 *
 * Returns `from` when it is the only pane left, and `null` when `from` is
 * itself hidden — a caller in that state has nothing to cycle from.
 */
export function nextPane(from: PaneId, panes: PaneVisibility, back = false): PaneId | null {
  const visible = PANE_ORDER.filter((id) => panes[id])
  const i = visible.indexOf(from)
  if (i < 0) return null
  return visible[(i + (back ? -1 : 1) + visible.length) % visible.length]
}

/** The uniform controls every pane shares — hide and full screen — as
 *  structured tooltip lines. Each pane's own interactions go above them. */
export function paneControls(id: PaneId, msg: RendererMessages): TooltipLine[] {
  return [
    { key: paneAccel(id), desc: msg.paneChrome.hidesThisPane },
    { key: paneFullAccel(id), desc: msg.paneChrome.fillsTheWindow },
    { key: PANE_CYCLE_ACCEL, desc: msg.paneChrome.cyclesWhileFull },
    // Double-clicking the title does the same as Ctrl+Shift+N; a mouse
    // gesture has no key to highlight, so the line renders as plain text.
    { key: '', desc: msg.paneChrome.dblClickToggles }
  ]
}

export function visibleCount(panes: PaneVisibility): number {
  return PANE_ORDER.filter((id) => panes[id]).length
}

export function loadPanes(): PaneVisibility {
  try {
    const raw = localStorage.getItem('gitty.panes')
    if (!raw) return { ...ALL_PANES }
    const saved = JSON.parse(raw) as Partial<Record<PaneId, unknown>>
    const panes = { ...ALL_PANES }
    for (const id of PANE_ORDER) if (saved[id] === false) panes[id] = false
    // Never restore a window with nothing in it.
    return visibleCount(panes) === 0 ? { ...ALL_PANES } : panes
  } catch {
    return { ...ALL_PANES }
  }
}
