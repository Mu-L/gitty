/**
 * Which of the four panes are on screen.
 *
 * App-wide rather than per tab, like the other view preferences: the title bar
 * is where a hidden pane is brought back, and that bar belongs to the window,
 * not to a repository.
 */
import type { TooltipLine } from './components/Tooltip'

export type PaneId = 'files' | 'diff' | 'log' | 'terminal'

export type PaneVisibility = Record<PaneId, boolean>

/** Layout order — top-left, top-right, bottom-left, bottom-right. */
export const PANE_ORDER: PaneId[] = ['files', 'diff', 'log', 'terminal']

export const PANE_LABELS: Record<PaneId, string> = {
  files: 'Files',
  diff: 'Diff',
  log: 'Commits',
  terminal: 'Terminal'
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
export function paneControls(id: PaneId): TooltipLine[] {
  return [
    { key: paneAccel(id), desc: ' hides this pane' },
    { key: paneFullAccel(id), desc: ' fills the window' }
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
