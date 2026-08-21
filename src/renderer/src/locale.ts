import { createContext, createElement, useContext, type ReactNode } from 'react'
import type { Locale, RendererMessages } from '../../shared/messages'
import { getMessages } from './messages'

// ── Locale type and list ─────────────────────────────────────────────────────

// Declared in shared/messages.ts: both processes and every plugin name it.
export type { Locale }

export interface LocaleInfo {
  /** Label in the language's own script, shown in the settings selector. */
  label: string
  code: Locale
}

export const ALL_LOCALES: LocaleInfo[] = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'ru', label: 'Русский' },
  { code: 'pt', label: 'Português' }
]

export const FALLBACK: Locale = 'en'

/** Load the persisted locale, or fall back to English. */
export function loadLocale(): Locale {
  try {
    const v = localStorage.getItem('gitty.locale')
    if (ALL_LOCALES.some((l) => l.code === v)) return v as Locale
  } catch {
    // localStorage may be unavailable in some environments.
  }
  return FALLBACK
}

// ── React Context ────────────────────────────────────────────────────────────

interface LocaleCtx {
  locale: Locale
  msg: RendererMessages
  setLocale: (locale: Locale) => void
}

const Ctx = createContext<LocaleCtx | null>(null)

export function LocaleProvider({
  locale,
  setLocale,
  children
}: {
  locale: Locale
  setLocale: (locale: Locale) => void
  children: ReactNode
}) {
  const msg = getMessages(locale)
  return createElement(Ctx.Provider, { value: { locale, msg, setLocale } }, children)
}

/** Pull the current message table and locale out of context. */
export function useMsg(): LocaleCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useMsg() must be inside <LocaleProvider>')
  return ctx
}
