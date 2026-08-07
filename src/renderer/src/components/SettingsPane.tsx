import { useMsg } from '../locale'
import { ALL_LOCALES, type Locale } from '../locale'
import type { JSX } from 'react'
import type { DiffView } from './DiffPane'

export type Theme = 'dark' | 'light'

/** A checkbox row: label on the left, the control on the right. */
function CheckRow({
  label,
  checked,
  onChange
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}): JSX.Element {
  return (
    <label className="setting-row">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

/** A two-value segmented control, e.g. Dark / Light or Inline / Side-by-Side. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange
}: {
  label: string
  value: T
  options: Array<{ value: T; label: string }>
  onChange: (v: T) => void
}): JSX.Element {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <div className="seg">
        {options.map((o) => (
          <button
            key={o.value}
            className={`toggle${value === o.value ? ' on' : ''}`}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** A labelled slider with a numeric read-out. */
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (v: number) => void
}): JSX.Element {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="setting-value">{value}</span>
    </div>
  )
}

/**
 * Modal settings dialog. Escape is handled by the App (which owns the open
 * state), so this component does not register its own key listeners.
 */
export function SettingsPane(props: {
  open: boolean
  onClose: () => void
  theme: Theme
  setTheme: (v: Theme) => void
  fontSize: number
  setFontSize: (v: number) => void
  rowHeight: number
  setRowHeight: (v: number) => void
  wrap: boolean
  setWrap: (v: boolean) => void
  diffView: DiffView
  setDiffView: (v: DiffView) => void
  wordDiff: boolean
  setWordDiff: (v: boolean) => void
  mdOutline: boolean
  setMdOutline: (v: boolean) => void
  onReset: () => void
  locale: Locale
  setLocale: (v: Locale) => void
}): JSX.Element | null {
  const { msg } = useMsg()
  if (!props.open) return null

  return (
    <div
      className="settings-backdrop"
      onMouseDown={(e) => {
        // Clicking the backdrop (not the panel) closes the dialog.
        if (e.target === e.currentTarget) props.onClose()
      }}
    >
      <div className="settings">
        <div className="settings-header">
          <span className="settings-title">{msg.settings.title}</span>
          <button title={msg.settings.close} onClick={props.onClose}>
            ×
          </button>
        </div>
        <div className="settings-body">
          <div className="settings-group">
            <h3 className="settings-group-title">{msg.settings.appearance}</h3>
            <Segmented
              label={msg.settings.language}
              value={props.locale}
              options={ALL_LOCALES.map((l) => ({ value: l.code, label: l.label }))}
              onChange={props.setLocale}
            />
            <Segmented
              label={msg.settings.theme}
              value={props.theme}
              options={[
                { value: 'dark', label: msg.settings.dark },
                { value: 'light', label: msg.settings.light }
              ]}
              onChange={props.setTheme}
            />
            <Slider
              label={msg.settings.fontSize}
              value={props.fontSize}
              min={11}
              max={16}
              step={0.5}
              onChange={props.setFontSize}
            />
            <Slider
              label={msg.settings.rowHeight}
              value={props.rowHeight}
              min={18}
              max={26}
              step={1}
              onChange={props.setRowHeight}
            />
          </div>
          <div className="settings-group">
            <h3 className="settings-group-title">{msg.settings.view}</h3>
            <Segmented
              label={msg.settings.diffLayout}
              value={props.diffView}
              options={[
                { value: 'inline', label: msg.settings.inline },
                { value: 'split', label: msg.settings.sideBySide }
              ]}
              onChange={props.setDiffView}
            />
            <CheckRow label={msg.settings.wordWrap} checked={props.wrap} onChange={props.setWrap} />
            <CheckRow label={msg.settings.wordHighlight} checked={props.wordDiff} onChange={props.setWordDiff} />
            <CheckRow label={msg.settings.markdownOutline} checked={props.mdOutline} onChange={props.setMdOutline} />
          </div>
        </div>
        <div className="settings-footer">
          <button onClick={props.onReset}>{msg.settings.restoreDefaults}</button>
          <button onClick={props.onClose}>{msg.settings.done}</button>
        </div>
      </div>
    </div>
  )
}
