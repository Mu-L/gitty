import { useEffect, useRef, type JSX } from 'react'
import type { Commit } from '../../../shared/types'
import type { MenuState } from './ContextMenu'

const DAY = 86_400_000

function stamp(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const fresh = Date.now() - d.getTime() < DAY
  return fresh
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('en-CA')
}

export function LogPane({
  commits,
  selected,
  compare,
  onSelect,
  onEnter,
  onMenu,
  onScrollEnd
}: {
  commits: Commit[]
  selected: string | null
  compare: string | null
  onSelect: (hash: string, additive: boolean) => void
  onEnter: (hash: string) => void
  onMenu: (commit: Commit, state: MenuState) => void
  onScrollEnd: () => void
}): JSX.Element {
  const listRef = useRef<HTMLDivElement>(null)
  const index = commits.findIndex((c) => c.hash === selected)

  // Keep the cursor row in view when it moves by keyboard.
  useEffect(() => {
    const el = listRef.current?.querySelector('.commit-row.selected')
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  const move = (delta: number): void => {
    if (commits.length === 0) return
    const next = Math.min(Math.max((index < 0 ? 0 : index) + delta, 0), commits.length - 1)
    onSelect(commits[next].hash, false)
  }

  return (
    <div
      ref={listRef}
      className="pane-body"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown' || e.key === 'j') {
          e.preventDefault()
          move(1)
        } else if (e.key === 'ArrowUp' || e.key === 'k') {
          e.preventDefault()
          move(-1)
        } else if (e.key === 'PageDown') {
          e.preventDefault()
          move(20)
        } else if (e.key === 'PageUp') {
          e.preventDefault()
          move(-20)
        } else if (e.key === 'Home') {
          e.preventDefault()
          move(-commits.length)
        } else if (e.key === 'End') {
          e.preventDefault()
          move(commits.length)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          if (selected) onEnter(selected)
        } else if (e.key === ' ') {
          e.preventDefault()
          if (selected) onSelect(selected, true)
        }
      }}
      onScroll={(e) => {
        const el = e.currentTarget
        if (el.scrollTop + el.clientHeight >= el.scrollHeight - 40) onScrollEnd()
      }}
    >
      {commits.length === 0 && <div className="empty">No commits yet.</div>}
      {commits.map((c) => {
        const cls =
          c.hash === selected ? ' selected' : c.hash === compare ? ' compare' : ''
        return (
          <div
            key={c.hash}
            className={`commit-row${cls}`}
            onClick={(e) => onSelect(c.hash, e.ctrlKey || e.metaKey || e.shiftKey)}
            onDoubleClick={() => onEnter(c.hash)}
            onContextMenu={(e) => {
              e.preventDefault()
              onMenu(c, { x: e.clientX, y: e.clientY, items: [] })
            }}
            title={`${c.hash}\n${c.author} <${c.email}>\n${c.date}\n\n${c.subject}`}
          >
            <span className="commit-hash">{c.short}</span>
            <span className="commit-time">{stamp(c.date)}</span>
            <span className="commit-author">{c.author}</span>
            {c.refs && <span className="commit-refs">({c.refs})</span>}
            <span className="commit-subject">{c.subject}</span>
          </div>
        )
      })}
    </div>
  )
}
