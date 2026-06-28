import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AppSettings } from '../types'
import { loadSettings, saveSettings } from '../db/storage'
import { createSettings, mergeSettings } from '../utils/factory'

interface SettingsCtx {
  ready: boolean
  settings: AppSettings
  updateSettings: (updater: (s: AppSettings) => AppSettings) => void
}

const Ctx = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => createSettings())
  const [ready, setReady] = useState(false)
  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    loadSettings().then((stored) => {
      setSettings(mergeSettings(stored))
      setReady(true)
    })
  }, [])

  // debounced local persistence — settings always live on-device
  useEffect(() => {
    if (!ready) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveSettings(settings)
    }, 300)
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [settings, ready])

  const updateSettings = useCallback((updater: (s: AppSettings) => AppSettings) => {
    setSettings((prev) => updater(prev))
  }, [])

  const value = useMemo<SettingsCtx>(
    () => ({ ready, settings, updateSettings }),
    [ready, settings, updateSettings],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSettings() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
