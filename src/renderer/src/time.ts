import { createContext, createElement, useContext, type ReactNode } from 'react'
import type { RendererMessages } from '../../shared/messages'

/** The relative-time wordings, the only strings this module needs. */
type TimeMessages = RendererMessages['time']

// ── The setting ──────────────────────────────────────────────────────────────

/**
 * Either the sentinel `system` or an IANA zone name ('UTC', 'Asia/Shanghai').
 * Git records each commit with the author's own offset (`%aI`), so a stamp is
 * always a rendering choice; this is the zone every stamp is rendered in.
 */
export type TimeZone = string

export const SYSTEM_TZ: TimeZone = 'system'

/** The machine's own zone, named — what the `system` entry stands for. */
export function systemZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

/**
 * `undefined` leaves Intl on the machine's zone, which is what `system` means —
 * and is also the answer for a name Intl does not know. A stored setting can
 * outlive the zone it names, and an unknown one makes `toLocaleString` throw:
 * a RangeError from a date in the commit log would take the whole UI down.
 */
function zoneOf(tz: TimeZone): string | undefined {
  return tz !== SYSTEM_TZ && allZones().includes(tz) ? tz : undefined
}

/**
 * Every zone the selector offers. `Intl.supportedValuesOf` is the runtime's own
 * list but leaves out `UTC` — it is an alias, not a canonical IANA zone — and
 * UTC is exactly what someone reading a shared history reaches for. The catch
 * keeps the selector usable if the method is ever missing.
 */
export function allZones(): string[] {
  if (zones) return zones
  let known: string[]
  try {
    known = Intl.supportedValuesOf('timeZone')
  } catch {
    known = [systemZone()]
  }
  zones = ['UTC', ...known.filter((z) => z !== 'UTC')]
  return zones
}

// Several hundred names that never change under a running app; built on first
// use so the cost lands when the settings dialog opens, not at startup.
let zones: string[] | null = null

/**
 * Everything that decides how an instant is written: which zone it is read in,
 * and whether it is named absolutely or by its distance from now.
 */
export interface TimeSettings {
  zone: TimeZone
  /** "2h ago" in place of a clock time or a date. */
  relative: boolean
}

export const DEFAULT_TIME: TimeSettings = { zone: SYSTEM_TZ, relative: false }

/** Load the persisted zone, or fall back to the system's. */
export function loadTimeZone(): TimeZone {
  try {
    const v = localStorage.getItem('gitty.timeZone')
    if (v === SYSTEM_TZ) return SYSTEM_TZ
    if (v && allZones().includes(v)) return v
  } catch {
    // localStorage may be unavailable in some environments.
  }
  return SYSTEM_TZ
}

// ── Formatting ───────────────────────────────────────────────────────────────

/** The calendar day of an instant, in the displayed zone, as YYYY-MM-DD. */
function ymd(d: Date, zone: string | undefined): string {
  return d.toLocaleDateString('en-CA', { timeZone: zone })
}

/**
 * Distance from now, coarsening as it grows — the same ladder the branch menu
 * dates its entries on. Nothing here needs the zone: an elapsed span is the
 * same span wherever it is read.
 */
function relative(d: Date, m: TimeMessages): string {
  const secs = Math.max(0, (Date.now() - d.getTime()) / 1000)
  if (secs < 60) return m.justNow
  const mins = Math.floor(secs / 60)
  if (mins < 60) return m.minutesAgo(mins)
  const hours = Math.floor(mins / 60)
  if (hours < 24) return m.hoursAgo(hours)
  const days = Math.floor(hours / 24)
  if (days < 30) return m.daysAgo(days)
  if (days < 365) return m.monthsAgo(days)
  return m.yearsAgo(days)
}

/**
 * A row's stamp. Today's rows show a time, anything older shows a date. The
 * cutoff is the calendar day, not the last 24 hours: at 3 PM a "9:45 PM" with
 * no date beside it would be yesterday evening, which reads as a time still to
 * come. Which day it is depends on the displayed zone, so both sides are read
 * through it. Relative stamps sidestep the question entirely.
 */
export function stamp(iso: string, t: TimeSettings, m: TimeMessages): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (t.relative) return relative(d, m)
  const zone = zoneOf(t.zone)
  const day = ymd(d, zone)
  return day === ymd(new Date(), zone)
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: zone })
    : day
}

/**
 * A compact date for a narrow column, like blame's: month and day, with the
 * year only when it is not the current one, so a run of dates does not repeat
 * a year that is the same on every row. The split is a calendar split in the
 * displayed zone, like `stamp`'s "today". Relative stamps keep the ladder.
 */
export function fmtShortDate(iso: string, locale: string, t: TimeSettings, m: TimeMessages): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (t.relative) return relative(d, m)
  const zone = zoneOf(t.zone)
  const year = (x: Date): string => x.toLocaleDateString('en-CA', { timeZone: zone }).slice(0, 4)
  const opts: Intl.DateTimeFormatOptions = { timeZone: zone, month: 'short', day: 'numeric' }
  if (year(d) !== year(new Date())) opts.year = 'numeric'
  return d.toLocaleDateString(locale, opts)
}

/** Date and time together, for the commit header. */
export function fmtDateTime(
  iso: string,
  locale: string,
  t: TimeSettings,
  m: TimeMessages
): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  if (t.relative) return relative(d, m)
  return d.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: zoneOf(t.zone)
  })
}

/**
 * The same instant named with its zone, for hover tips — always absolute,
 * whatever the rows show. A short stamp, relative or not, says nothing about
 * which zone it is in, and the tip is where that answer belongs.
 */
export function fmtDateTimeZone(iso: string, locale: string, t: TimeSettings): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'long',
    timeZone: zoneOf(t.zone)
  })
}

// ── React Context ────────────────────────────────────────────────────────────

const Ctx = createContext<TimeSettings>(DEFAULT_TIME)

export function TimeProvider({ time, children }: { time: TimeSettings; children: ReactNode }) {
  return createElement(Ctx.Provider, { value: time }, children)
}

/** How every stamp in the interface is written. */
export function useTime(): TimeSettings {
  return useContext(Ctx)
}
