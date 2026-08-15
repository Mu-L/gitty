import { useEffect, useLayoutEffect, useRef, useState, type JSX } from 'react'

export interface MenuItem {
  label: string
  accel?: string
  /** Hover tooltip; the label is often abbreviated. */
  title?: string
  action: (mods?: { ctrl: boolean }) => void
  /** Right-click on the item itself, for a secondary action such as removal. */
  altAction?: () => void
  /** A × at the right of the item, for taking the entry out of the list it is
   *  in. Its own button rather than a modifier, because a destructive action
   *  should be visible; the menu stays open so several can go in a row. */
  remove?: { title: string; action: () => void }
  /** Middle-click, conventionally "the other place". */
  auxAction?: () => void
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
            title={item.title}
            onClick={(e) => {
              item.action({ ctrl: e.ctrlKey || e.metaKey })
              onClose()
            }}
            onAuxClick={(e) => {
              if (e.button !== 1 || !item.auxAction) return
              e.preventDefault()
              item.auxAction()
              onClose()
            }}
            onContextMenu={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (!item.altAction) return
              // The menu stays open so several entries can be removed in a row.
              item.altAction()
            }}
          >
            <span>{item.label}</span>
            {item.accel && <span className="accel">{item.accel}</span>}
            {item.remove && (
              <button
                className="ctx-remove"
                title={item.remove.title}
                // The item's own click would run the action the × is beside.
                onClick={(e) => {
                  e.stopPropagation()
                  item.remove?.action()
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
