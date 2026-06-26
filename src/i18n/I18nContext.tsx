import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Lang,
  LANG_KEY,
  readStoredLang,
  setLangGlobal,
  TParams,
  translate,
} from './index'

interface I18nCtx {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: string, params?: TParams) => string
}

const Ctx = createContext<I18nCtx | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang())

  // keep the global accessor + <html lang> + storage in sync
  useEffect(() => {
    setLangGlobal(lang)
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangGlobal(next)
    setLangState(next)
  }, [])

  // reflect changes made in other tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === LANG_KEY && (e.newValue === 'es' || e.newValue === 'en')) {
        setLangState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const t = useCallback(
    (key: string, params?: TParams) => translate(key, params, lang),
    [lang],
  )

  const value = useMemo<I18nCtx>(() => ({ lang, setLang, t }), [lang, setLang, t])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useI18n() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
