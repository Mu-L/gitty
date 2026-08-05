import { useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react'

export interface MenuItem {
  label: string
  accel?: string
  action: () => void
  separatorBefore?: boolean
}

export interface MenuState {
  x: number
  y: number
  items: MenuItem[]
}

/** Lightweight in-page context menu; keeps the dark theme consistent across platforms. */
export function ContextMenu({
  state,
  onClose
}: {
  state: MenuState | null
  onClose: () => void
}): JSX.Element | null {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    if (!state || !ref.current) return
    const { width, height } = ref.current.getBoundingClientRect()
    setPos({
      x: Math.min(state.x, window.innerWidth - width - 4),
      y: Math.min(state.y, window.innerHeight - height - 4)
    })
  }, [state])

  useEffect(() => {
    if (!state) return
    const close = (): void => onClose()
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [state, onClose])

  if (!state) return null

  return (
    <div
      ref={ref}
      className="ctx"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {state.items.map((item, i) => (
        <div key={i}>
          {item.separatorBefore && <div className="ctx-sep" />}
          <div
            className="ctx-item"
            onClick={() => {
              item.action()
              onClose()
            }}
          >
            <span>{item.label}</span>
            {item.accel && <span className="accel">{item.accel}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
