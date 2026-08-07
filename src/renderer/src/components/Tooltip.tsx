import { useState, type JSX, type ReactNode } from 'react'

/** One row in the tooltip. An empty key renders plain text (no colour). */
export interface TooltipLine {
  key: string
  desc?: string
}

/**
 * A styled replacement for the native `title` attribute. The browser's
 * tooltip is drawn by the OS in a small fixed face, so it cannot match the
 * app's own font.  `className` is applied to the wrapper, which stands in
 * for the element it wraps — the pane titles pass "title" and keep their
 * flex sizing and ellipsis.
 */
export function Tooltip({
  lines,
  className = '',
  children
}: {
  lines: TooltipLine[]
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
      {open && (
        <span className="tooltip">
          {lines.map((l, i) => (
            <span key={i}>
              {l.key ? <span className="tooltip-key">{l.key}</span> : l.desc}
              {l.key && l.desc}
              {i < lines.length - 1 && '\n'}
            </span>
          ))}
        </span>
      )}
    </span>
  )
}
