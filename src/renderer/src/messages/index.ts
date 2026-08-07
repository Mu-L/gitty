import type { Locale } from '../locale'
import type { RendererMessages } from '../../../shared/messages'
import { en } from './en'
import { zh } from './zh'
import { ja } from './ja'
import { ko } from './ko'
import { fr } from './fr'
import { de } from './de'
import { es } from './es'
import { ru } from './ru'
import { pt } from './pt'

const MESSAGES: Record<Locale, RendererMessages> = {
  en,
  zh,
  ja,
  ko,
  fr,
  de,
  es,
  ru,
  pt
}

/** Return the message table for `locale`, falling back to English. */
export function getMessages(locale: Locale): RendererMessages {
  return MESSAGES[locale] ?? MESSAGES['en']
}
