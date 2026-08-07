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

/** Full screen is per repository tab, so RepoTab handles this one. */
export function paneFullAccel(id: PaneId): string {
  return `Ctrl+Shift+${PANE_ORDER.indexOf(id) + 1}`
}

/** The uniform controls every pane shares — hide and full screen — as
 *  structured tooltip lines. Each pane's own interactions go above them. */
export function paneControls(id: PaneId, msg: RendererMessages): TooltipLine[] {
  return [
    { key: paneAccel(id), desc: msg.paneChrome.hidesThisPane },
    { key: paneFullAccel(id), desc: msg.paneChrome.fillsTheWindow },
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
