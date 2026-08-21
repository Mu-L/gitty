import { useEffect, useState } from 'react'
import { useMsg } from '../locale'
import { ALL_LOCALES } from '../locale'
import type { JSX } from 'react'
import { allZones, systemZone, SYSTEM_TZ } from '../time'
import { monoFonts } from '../fonts'
import type { Preferences } from '../prefs'
import { PLUGINS, usePluginPrefs } from '../plugins'
import type { Plugin, PluginPrefs, SettingsRow } from '../../../plugins/types'

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

/**
 * A row naming a file a plugin lets the reader edit, with a button that opens
 * it in whatever the system opens JSON with. Resolving the path is usually
 * also what creates the file, so there is always something to open.
 */
function FileRow({
  label,
  open,
  action
}: {
  label: string
  open: () => Promise<string>
  action: string
}): JSX.Element {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <button
        className="toggle"
        onClick={() => {
          void open().then((abs) => window.gitty.file.open(abs))
        }}
      >
        {action}
      </button>
    </div>
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
 * One plugin in Settings ▸ Plugins: its name, a line of summary, the switch
 * that turns it on, and the rows it declared — drawn here, decided there. A
 * plugin that is off shows only the switch: everything under it is about how
 * it behaves, which is nothing while it does not.
 */
function PluginGroup({ plugin }: { plugin: Plugin }): JSX.Element {
  const { locale } = useMsg()
  const prefs = usePluginPrefs(plugin.id)
  return (
    <div className="settings-plugin">
      <div className="settings-group-title">{plugin.name(locale)}</div>
      <div className="settings-plugin-summary">{plugin.summary(locale)}</div>
      <CheckRow
        label={plugin.name(locale)}
        checked={prefs.enabled}
        onChange={(on) => prefs.set('enabled', on)}
      />
      {prefs.enabled
        ? plugin.rows(locale, prefs).map((row) => (
            <PluginRow key={`${row.kind}:${row.label}`} row={row} prefs={prefs} />
          ))
        : null}
    </div>
  )
}

/** A declared row, drawn with the controls the app already has. */
function PluginRow({ row, prefs }: { row: SettingsRow; prefs: PluginPrefs }): JSX.Element {
  if (row.kind === 'check') {
    return (
      <CheckRow
        label={row.label}
        checked={prefs.get(row.pref) === true}
        onChange={(v) => prefs.set(row.pref, v)}
      />
    )
  }
  if (row.kind === 'segmented') {
    return (
      <Segmented
        label={row.label}
        value={String(prefs.get(row.pref))}
        options={row.options}
        onChange={(v) => prefs.set(row.pref, v)}
      />
    )
  }
  return <FileRow label={row.label} action={row.action} open={row.open} />
}

/**
 * Modal settings dialog. Escape is handled by the App (which owns the open
 * state), so this component does not register its own key listeners.
 */
/** The dialog's sections, each its own tab. */
type Tab = 'appearance' | 'view' | 'session' | 'plugins'

export function SettingsPane(props: {
  open: boolean
  onClose: () => void
  /**
   * The whole preference set, rather than forty props that only pass through:
   * every row here is one of them, so the dialog and the hook stay in step by
   * construction — a new setting is a new row, not a new prop as well.
   */
  prefs: Preferences
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
    { id: 'session', label: msg.settings.session },
    { id: 'plugins', label: msg.settings.plugins }
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
              value={props.prefs.locale}
              options={ALL_LOCALES.map((l) => ({ value: l.code, label: l.label }))}
              onChange={props.prefs.setLocale}
            />
            <Dropdown
              label={msg.settings.timeZone}
              value={props.prefs.timeZone}
              options={[
                { value: SYSTEM_TZ, label: msg.settings.systemTimeZone(systemZone()) },
                ...allZones().map((z) => ({ value: z, label: z }))
              ]}
              onChange={props.prefs.setTimeZone}
            />
            <Segmented
              label={msg.settings.timeFormat}
              value={props.prefs.relativeTime ? 'relative' : 'absolute'}
              options={[
                { value: 'absolute', label: msg.settings.absolute },
                { value: 'relative', label: msg.settings.relative }
              ]}
              onChange={(v) => props.prefs.setRelativeTime(v === 'relative')}
            />
            <Segmented
              label={msg.settings.theme}
              value={props.prefs.theme}
              options={[
                { value: 'dark', label: msg.settings.dark },
                { value: 'light', label: msg.settings.light }
              ]}
              onChange={props.prefs.setTheme}
            />
            <Slider
              label={msg.settings.fontSize}
              value={props.prefs.fontSize}
              min={9}
              max={20}
              step={0.5}
              onChange={props.prefs.setFontSize}
            />
            <Dropdown
              label={msg.settings.monoFont}
              value={props.prefs.monoFont}
              options={withValue(
                [
                  { value: '', label: msg.settings.systemDefault },
                  ...monoFonts().map((f) => ({ value: f, label: f }))
                ],
                props.prefs.monoFont
              )}
              onChange={props.prefs.setMonoFont}
            />
            <Slider
              label={msg.settings.rowHeight}
              value={props.prefs.rowHeight}
              min={18}
              max={26}
              step={1}
              onChange={props.prefs.setRowHeight}
            />
          </div>
          <div className={`settings-group${tab === 'view' ? '' : ' hidden'}`}>
            <Segmented
              label={msg.settings.diffLayout}
              value={props.prefs.diffView}
              options={[
                { value: 'inline', label: msg.settings.inline },
                { value: 'split', label: msg.settings.sideBySide }
              ]}
              onChange={props.prefs.setDiffView}
            />
            <Slider
              label={msg.settings.contextLines}
              value={props.prefs.diffContext}
              min={0}
              max={25}
              step={1}
              onChange={props.prefs.setDiffContext}
            />
            <Segmented
              label={msg.settings.ignoreWhitespace}
              value={props.prefs.ignoreWhitespace}
              options={[
                { value: 'none', label: msg.settings.whitespaceNone },
                { value: 'change', label: msg.settings.whitespaceChange },
                { value: 'all', label: msg.settings.whitespaceAll }
              ]}
              onChange={props.prefs.setIgnoreWhitespace}
            />
            <CheckRow label={msg.settings.wordWrap} checked={props.prefs.wrap} onChange={props.prefs.setWrap} />
            <CheckRow label={msg.settings.wordHighlight} checked={props.prefs.wordDiff} onChange={props.prefs.setWordDiff} />
            <CheckRow label={msg.settings.commitGraph} checked={props.prefs.graph} onChange={props.prefs.setGraph} />
            <CheckRow label={msg.settings.documentOutline} checked={props.prefs.mdOutline} onChange={props.prefs.setMdOutline} />
            <CheckRow label={msg.settings.markdownLineNumbers} checked={props.prefs.mdLineNumbers} onChange={props.prefs.setMdLineNumbers} />
            <Segmented
              label={msg.settings.fileSort}
              value={props.prefs.naturalSort ? 'natural' : 'byte'}
              options={[
                { value: 'natural', label: msg.settings.sortNatural },
                { value: 'byte', label: msg.settings.sortByte }
              ]}
              onChange={(v) => props.prefs.setNaturalSort(v === 'natural')}
            />
          </div>
          <div className={`settings-group${tab === 'session' ? '' : ' hidden'}`}>
            <CheckRow
              label={msg.settings.restoreTabs}
              checked={props.prefs.restoreTabs}
              onChange={props.prefs.setRestoreTabs}
            />
            <Segmented
              label={msg.settings.instances}
              value={props.prefs.singleInstance ? 'single' : 'multiple'}
              options={[
                { value: 'single', label: msg.settings.singleInstance },
                { value: 'multiple', label: msg.settings.multipleInstances }
              ]}
              onChange={(v) => props.prefs.setSingleInstance(v === 'single')}
            />
            <Dropdown
              label={msg.settings.shell}
              value={props.prefs.termShell}
              options={withValue(
                [
                  { value: '', label: msg.settings.systemDefault },
                  ...shells.map((sh) => ({ value: sh, label: sh }))
                ],
                props.prefs.termShell
              )}
              onChange={props.prefs.setTermShell}
            />
            <CheckRow
              label={msg.settings.loginShell}
              checked={props.prefs.termLogin}
              onChange={props.prefs.setTermLogin}
            />
          </div>
          <div className={`settings-group${tab === 'plugins' ? '' : ' hidden'}`}>
            {PLUGINS.map((plugin) => (
              <PluginGroup key={plugin.id} plugin={plugin} />
            ))}
          </div>
        </div>
        <div className="settings-footer">
          <button onClick={props.prefs.resetSettings}>{msg.settings.restoreDefaults}</button>
          <button onClick={props.onClose}>{msg.settings.done}</button>
        </div>
      </div>
    </div>
  )
}
