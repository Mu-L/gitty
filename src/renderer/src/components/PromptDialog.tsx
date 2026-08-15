import { useEffect, useRef, useState, type JSX } from 'react'

/**
 * A one-line prompt, in the app rather than through the main process: an
 * Electron message box has no text field, and a command is typed often enough
 * that it should not cost a trip through IPC. Shares the settings dialog's
 * backdrop, header and footer, so it is the same window furniture.
 */
export function PromptDialog({
  open,
  title,
  placeholder,
  initial,
  submitLabel,
  cancelLabel,
  onSubmit,
  onCancel
}: {
  open: boolean
  title: string
  placeholder: string
  /** What the box starts with; the whole of it is selected, so typing replaces it. */
  initial: string
  submitLabel: string
  cancelLabel: string
  onSubmit: (value: string) => void
  onCancel: () => void
}): JSX.Element | null {
  const [value, setValue] = useState(initial)
  const input = useRef<HTMLInputElement>(null)

  // Re-seed on opening rather than on every render: the box is edited while it
  // is open, and `initial` is the current command, which does not change under it.
  useEffect(() => {
    if (open) setValue(initial)
  }, [open, initial])

  useEffect(() => {
    if (open) input.current?.select()
  }, [open])

  if (!open) return null

  return (
    <div
      className="settings-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div className="prompt">
        <div className="settings-header">
          <span className="settings-title">{title}</span>
          <button title={cancelLabel} onClick={onCancel}>
            ×
          </button>
        </div>
        <div className="prompt-body">
          <input
            ref={input}
            type="text"
            className="setting-text prompt-input"
            value={value}
            placeholder={placeholder}
            spellCheck={false}
            autoFocus
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              // The dialog is one field, so Enter is its button; Escape is
              // handled here too, since nothing above it knows it is open.
              if (e.key === 'Enter' && value.trim()) onSubmit(value.trim())
              else if (e.key === 'Escape') onCancel()
              e.stopPropagation()
            }}
          />
        </div>
        <div className="settings-footer">
          <button onClick={onCancel}>{cancelLabel}</button>
          <button disabled={!value.trim()} onClick={() => onSubmit(value.trim())}>
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
