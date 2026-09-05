import { create } from 'zustand'
import {
  LOCALE_LABELS,
  type Locale,
  translate,
  translateWarning,
  type EstimateWarning,
} from '../i18n/messages'

const STORAGE_KEY = 'tile-estimate-locale'

function readInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'ja' || saved === 'en') return saved
  } catch {
    /* ignore */
  }
  return 'ja'
}

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: string, values?: Record<string, string | number>) => string
  tw: (warning: EstimateWarning) => string
}

export const useLocaleStore = create<LocaleState>((set, get) => ({
  locale: readInitialLocale(),
  setLocale: (locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, locale)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = locale === 'ja' ? 'ja' : 'en'
    set({ locale })
  },
  t: (key, values) => translate(get().locale, key, values),
  tw: (warning) => translateWarning(get().locale, warning),
}))

export { LOCALE_LABELS }
