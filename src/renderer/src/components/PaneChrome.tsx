import type { JSX } from 'react'
import { msg } from '../messages'

/**
 * The two controls every pane header carries: full screen on the left, hide on
 * the right. Shared because the terminal pane owns its own header, and the
 * icons and wording must not drift between it and the other three.
 */

export function FullButton({
  full,
  accel,
  onToggle
}: {
  full: boolean
  /** Shortcut for this pane's own toggle, shown in the tooltip. */
  accel: string
  onToggle: () => void
}): JSX.Element {
  return (
    <button
      className={`pane-full${full ? ' on' : ''}`}
      title={
        full
          ? msg.paneChrome.restoreLayout(accel)
          : msg.paneChrome.fillWindow(accel)
      }
      onClick={onToggle}
    >
      {full ? '⤡' : '⤢'}
    </button>
  )
}

export function HideButton({
  accel,
  note,
  onHide
}: {
  accel: string
  /** Appended to the tooltip; the terminal's shells outlive its pane. */
  note?: string
  onHide: () => void
}): JSX.Element {
  return (
    <button
      className="pane-hide"
      title={note ? msg.paneChrome.hidePaneTerminal(accel) : msg.paneChrome.hidePane(accel)}
      onClick={onHide}
    >
      ×
    </button>
  )
}
