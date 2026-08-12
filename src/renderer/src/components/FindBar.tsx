import { useEffect, useRef, type JSX } from 'react'
import { useMsg } from '../locale'

/**
 * The search strip over a document: a box, how many matches there are and
 * which one is current, and the two ways to walk them. Escape and Enter are
 * handled here rather than by the document, since the field has the focus for
 * as long as the strip is open.
 */
export function FindBar({
  query,
  onQuery,
  count,
  index,
  onNext,
  onPrev,
  onClose
}: {
  query: string
  onQuery: (v: string) => void
  count: number
  /** Zero-based position among the matches; -1 when there are none. */
  index: number
  onNext: () => void
  onPrev: () => void
  onClose: () => void
}): JSX.Element {
  const { msg } = useMsg()
  const inputRef = useRef<HTMLInputElement>(null)

  // Opening the strip puts the caret in it, and re-opening selects what is
  // already there so a second search replaces the first by typing.
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  const empty = query !== '' && count === 0

  return (
    <div className="find-bar">
      <input
        ref={inputRef}
        type="text"
        className={`find-input${empty ? ' none' : ''}`}
        value={query}
        placeholder={msg.find.placeholder}
        spellCheck={false}
        onChange={(e) => onQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (e.shiftKey) onPrev()
            else onNext()
          }
        }}
      />
      <span className="find-count">
        {query === '' ? '' : count === 0 ? msg.find.noMatches : msg.find.count(index + 1, count)}
      </span>
      <button className="find-btn" title={msg.find.previous} onClick={onPrev} disabled={count === 0}>
        ↑
      </button>
      <button className="find-btn" title={msg.find.next} onClick={onNext} disabled={count === 0}>
        ↓
      </button>
      <button className="find-btn" title={msg.find.close} onClick={onClose}>
        ×
      </button>
    </div>
  )
}
