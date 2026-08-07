import { useState, type JSX, type ReactNode } from 'react'

/**
 * A styled replacement for the native `title` attribute. The browser's tooltip
 * is drawn by the OS in a small fixed face, so it cannot match the app's own
 * font; this renders the same text as CSS instead. `className` is applied to
 * the wrapper, which stands in for the element it wraps — the pane titles pass
 * "title" and keep their flex sizing and ellipsis. Multi-line text (separated
 * by \n) is shown below the element.
 */
export function Tooltip({
  text,
  className = '',
  children
}: {
  text: string
  className?: string
  children: ReactNode
}): JSX.Element {
  const [open, setOpen] = useState(false)
  return (
    <span
      className={`tooltip-anchor${className ? ` ${className}` : ''}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span className="tooltip-inner">{children}</span>
      {open && <span className="tooltip">{text}</span>}
    </span>
  )
}
