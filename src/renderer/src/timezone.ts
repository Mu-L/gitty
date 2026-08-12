import { createContext, createElement, useContext, type ReactNode } from 'react'

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
 * Today's rows show a time, anything older shows a date. The cutoff is the
 * calendar day, not the last 24 hours: at 3 PM a "9:45 PM" with no date beside
 * it would be yesterday evening, which reads as a time still to come. Which day
 * it is depends on the displayed zone, so both sides are read through it.
 */
export function stamp(iso: string, tz: TimeZone): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const zone = zoneOf(tz)
  const day = ymd(d, zone)
  return day === ymd(new Date(), zone)
    ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: zone })
    : day
}

/** Date and time together, for the commit header. */
export function fmtDateTime(iso: string, locale: string, tz: TimeZone): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short', timeZone: zoneOf(tz) })
}

/**
 * The same instant named with its zone, for hover tips. A row's short stamp
 * says nothing about which zone it is in, and once the setting can move that
 * zone the tip is where the answer belongs.
 */
export function fmtDateTimeZone(iso: string, locale: string, tz: TimeZone): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(locale, {
    dateStyle: 'medium',
    timeStyle: 'long',
    timeZone: zoneOf(tz)
  })
}

// ── React Context ────────────────────────────────────────────────────────────

const Ctx = createContext<TimeZone>(SYSTEM_TZ)

export function TimeZoneProvider({
  timeZone,
  children
}: {
  timeZone: TimeZone
  children: ReactNode
}) {
  return createElement(Ctx.Provider, { value: timeZone }, children)
}

/** The zone every stamp in the interface is rendered in. */
export function useTimeZone(): TimeZone {
  return useContext(Ctx)
}
