import { useEffect, useState } from 'react'
import { useMsg } from '../locale'
import { ALL_LOCALES, type Locale } from '../locale'
import type { JSX } from 'react'
import type { DiffView } from './DiffPane'
import { allZones, systemZone, SYSTEM_TZ, type TimeZone } from '../time'
import { monoFonts } from '../fonts'
import type { DiffOptions } from '../../../shared/types'

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

/** A dropdown, where a segmented control would have too many options to lay out. */
function Dropdown<T extends string>({
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
    <label className="setting-row">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}

/**
 * Keep a stored value in the list even when this machine does not offer it —
 * a font uninstalled since, or a shell from another machine. Dropping it would
 * silently show the first entry instead and lose the setting on the next edit.
 */
function withValue(
  options: Array<{ value: string; label: string }>,
  value: string
): Array<{ value: string; label: string }> {
  return options.some((o) => o.value === value) ? options : [...options, { value, label: value }]
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
/** The dialog's sections, each its own tab. */
type Tab = 'appearance' | 'view' | 'session'

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
  mdLineNumbers: boolean
  setMdLineNumbers: (v: boolean) => void
  naturalSort: boolean
  setNaturalSort: (v: boolean) => void
  graph: boolean
  setGraph: (v: boolean) => void
  onReset: () => void
  locale: Locale
  setLocale: (v: Locale) => void
  timeZone: TimeZone
  setTimeZone: (v: TimeZone) => void
  relativeTime: boolean
  setRelativeTime: (v: boolean) => void
  monoFont: string
  setMonoFont: (v: string) => void
  diffContext: number
  setDiffContext: (v: number) => void
  ignoreWhitespace: DiffOptions['ignoreWhitespace']
  setIgnoreWhitespace: (v: DiffOptions['ignoreWhitespace']) => void
  restoreTabs: boolean
  setRestoreTabs: (v: boolean) => void
  singleInstance: boolean
  setSingleInstance: (v: boolean) => void
  termShell: string
  setTermShell: (v: string) => void
  termLogin: boolean
  setTermLogin: (v: boolean) => void
}): JSX.Element | null {
  const { msg } = useMsg()
  // Reset to the first tab between openings: the dialog is short-lived, and
  // coming back to where you were last time is not what a reader expects.
  const [tab, setTab] = useState<Tab>('appearance')
  const [shells, setShells] = useState<string[]>([])
  useEffect(() => {
    if (props.open) void window.gitty.shells().then(setShells)
  }, [props.open])
  useEffect(() => {
    if (props.open) setTab('appearance')
  }, [props.open])
  if (!props.open) return null

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'appearance', label: msg.settings.appearance },
    { id: 'view', label: msg.settings.view },
    { id: 'session', label: msg.settings.session }
  ]

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
        <div className="settings-tabs">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`settings-tab${tab === t.id ? ' on' : ''}`}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="settings-body">
          <div className={`settings-group${tab === 'appearance' ? '' : ' hidden'}`}>
            <Segmented
              label={msg.settings.language}
              value={props.locale}
              options={ALL_LOCALES.map((l) => ({ value: l.code, label: l.label }))}
              onChange={props.setLocale}
            />
            <Dropdown
              label={msg.settings.timeZone}
              value={props.timeZone}
              options={[
                { value: SYSTEM_TZ, label: msg.settings.systemTimeZone(systemZone()) },
                ...allZones().map((z) => ({ value: z, label: z }))
              ]}
              onChange={props.setTimeZone}
            />
            <Segmented
              label={msg.settings.timeFormat}
              value={props.relativeTime ? 'relative' : 'absolute'}
              options={[
                { value: 'absolute', label: msg.settings.absolute },
                { value: 'relative', label: msg.settings.relative }
              ]}
              onChange={(v) => props.setRelativeTime(v === 'relative')}
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
              min={9}
              max={20}
              step={0.5}
              onChange={props.setFontSize}
            />
            <Dropdown
              label={msg.settings.monoFont}
              value={props.monoFont}
              options={withValue(
                [
                  { value: '', label: msg.settings.systemDefault },
                  ...monoFonts().map((f) => ({ value: f, label: f }))
                ],
                props.monoFont
              )}
              onChange={props.setMonoFont}
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
          <div className={`settings-group${tab === 'view' ? '' : ' hidden'}`}>
            <Segmented
              label={msg.settings.diffLayout}
              value={props.diffView}
              options={[
                { value: 'inline', label: msg.settings.inline },
                { value: 'split', label: msg.settings.sideBySide }
              ]}
              onChange={props.setDiffView}
            />
            <Slider
              label={msg.settings.contextLines}
              value={props.diffContext}
              min={0}
              max={25}
              step={1}
              onChange={props.setDiffContext}
            />
            <Segmented
              label={msg.settings.ignoreWhitespace}
              value={props.ignoreWhitespace}
              options={[
                { value: 'none', label: msg.settings.whitespaceNone },
                { value: 'change', label: msg.settings.whitespaceChange },
                { value: 'all', label: msg.settings.whitespaceAll }
              ]}
              onChange={props.setIgnoreWhitespace}
            />
            <CheckRow label={msg.settings.wordWrap} checked={props.wrap} onChange={props.setWrap} />
            <CheckRow label={msg.settings.wordHighlight} checked={props.wordDiff} onChange={props.setWordDiff} />
            <CheckRow label={msg.settings.commitGraph} checked={props.graph} onChange={props.setGraph} />
            <CheckRow label={msg.settings.documentOutline} checked={props.mdOutline} onChange={props.setMdOutline} />
            <CheckRow label={msg.settings.markdownLineNumbers} checked={props.mdLineNumbers} onChange={props.setMdLineNumbers} />
            <Segmented
              label={msg.settings.fileSort}
              value={props.naturalSort ? 'natural' : 'byte'}
              options={[
                { value: 'natural', label: msg.settings.sortNatural },
                { value: 'byte', label: msg.settings.sortByte }
              ]}
              onChange={(v) => props.setNaturalSort(v === 'natural')}
            />
          </div>
          <div className={`settings-group${tab === 'session' ? '' : ' hidden'}`}>
            <CheckRow
              label={msg.settings.restoreTabs}
              checked={props.restoreTabs}
              onChange={props.setRestoreTabs}
            />
            <Segmented
              label={msg.settings.instances}
              value={props.singleInstance ? 'single' : 'multiple'}
              options={[
                { value: 'single', label: msg.settings.singleInstance },
                { value: 'multiple', label: msg.settings.multipleInstances }
              ]}
              onChange={(v) => props.setSingleInstance(v === 'single')}
            />
            <Dropdown
              label={msg.settings.shell}
              value={props.termShell}
              options={withValue(
                [
                  { value: '', label: msg.settings.systemDefault },
                  ...shells.map((sh) => ({ value: sh, label: sh }))
                ],
                props.termShell
              )}
              onChange={props.setTermShell}
            />
            <CheckRow
              label={msg.settings.loginShell}
              checked={props.termLogin}
              onChange={props.setTermLogin}
            />
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
