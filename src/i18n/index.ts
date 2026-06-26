import { Lang, translations } from './translations'

export type { Lang } from './translations'
export { LANGUAGES, translations } from './translations'

export const LANG_KEY = 'atelier-lang'

export type TParams = Record<string, string | number>

/** Read the persisted language; Spanish is the default. */
export function readStoredLang(): Lang {
  try {
    const s = localStorage.getItem(LANG_KEY)
    return s === 'en' ? 'en' : 'es'
  } catch {
    return 'es'
  }
}

// Module-level current language, kept in sync by the provider so that pure
// utilities (factory defaults, date formatting, PDF generation) can translate
// without needing React context.
let currentLang: Lang = readStoredLang()

export function getLang(): Lang {
  return currentLang
}

export function setLangGlobal(lang: Lang): void {
  currentLang = lang
  try {
    localStorage.setItem(LANG_KEY, lang)
  } catch {
    /* ignore */
  }
}

function interpolate(template: string, params?: TParams): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    key in params ? String(params[key]) : `{${key}}`,
  )
}

/** Translate a key in a specific language (falls back to Spanish, then key). */
export function translate(key: string, params?: TParams, lang: Lang = currentLang): string {
  const dict = translations[lang] ?? translations.es
  const value = dict[key] ?? translations.es[key] ?? key
  return interpolate(value, params)
}

/** Standalone translator bound to the current global language. */
export function t(key: string, params?: TParams): string {
  return translate(key, params)
}

/** Locale string used for date formatting per language. */
export function dateLocale(lang: Lang = currentLang): string {
  return lang === 'en' ? 'en-GB' : 'es-ES'
}
