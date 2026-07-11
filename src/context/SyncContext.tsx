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
import { Project, SyncStatus, Tombstone } from '../types'
import { useApp } from './AppContext'
import { useSettings } from './SettingsContext'
import { collectProjectImages, rehydrateImages } from '../sync/images'
import { computeMerge, sameProjects } from '../sync/merge'

interface SyncCtx {
  status: SyncStatus
  email: string | null
  error: string | null
  configured: boolean
  enabled: boolean
  /** True once signed in and the engine is live (can sync now). */
  active: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

const Ctx = createContext<SyncCtx | null>(null)

function isConfigured(cfg: import('../types').FirebaseConfig | null): boolean {
  return (
    !!cfg &&
    !!cfg.apiKey &&
    !!cfg.authDomain &&
    !!cfg.projectId &&
    !!cfg.appId &&
    !!cfg.storageBucket &&
    !!cfg.messagingSenderId
  )
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { projects, applyRemoteState } = useApp()
  const { settings } = useSettings()

  const cfg = settings.sync.firebaseConfig
  const enabled = settings.sync.enabled
  const configured = isConfigured(cfg)

  const [status, setStatus] = useState<SyncStatus>('disabled')
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // engine internals (refs so they don't trigger renders / effect loops)
  const projectsRef = useRef<Project[]>(projects)
  const remoteRef = useRef<{ projects: Project[]; tombstones: Tombstone[] }>({
    projects: [],
    tombstones: [],
  })
  const syncedRef = useRef<Map<string, number>>(new Map())
  const activeRef = useRef(false)
  const reconcilingRef = useRef(false)
  const reconcileQueuedRef = useRef(false)
  const pushingRef = useRef(false)
  const unwatchRef = useRef<(() => void) | null>(null)
  const unauthRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    projectsRef.current = projects
  }, [projects])

  // ---- core reconcile (remote -> local) ---------------------------------
  const reconcile = useCallback(async () => {
    if (!activeRef.current) return
    if (reconcilingRef.current) {
      reconcileQueuedRef.current = true
      return
    }
    reconcilingRef.current = true
    try {
      const fb = await import('../sync/firebase')
      const local = projectsRef.current
      const { projects: remote, tombstones } = remoteRef.current
      const { resultMap, remoteWonIds } = computeMerge(local, remote, tombstones)

      // cache image data we already have locally to avoid re-downloading
      const cache = new Map<string, string>()
      local.forEach((p) =>
        collectProjectImages(p).forEach((img) => {
          if (img.dataUrl) cache.set(img.id, img.dataUrl)
        }),
      )
      // figure out which remote-won images we still need to fetch
      const needed = new Set<string>()
      remoteWonIds.forEach((id) => {
        const p = resultMap.get(id)
        if (p) collectProjectImages(p).forEach((img) => {
          if (!cache.has(img.id)) needed.add(img.id)
        })
      })
      const fetched = needed.size ? await fb.loadImages([...needed]) : new Map<string, string>()
      const allImages = new Map<string, string>([...cache, ...fetched])
      remoteWonIds.forEach((id) => {
        const p = resultMap.get(id)
        if (p) resultMap.set(id, rehydrateImages(p, allImages))
      })

      // remember which remote versions we know about (prevents push echo)
      const tombSet = new Map(tombstones.map((t) => [t.id, t.deletedAt]))
      remote.forEach((r) => {
        const dt = tombSet.get(r.id) ?? -1
        if (dt < r.updatedAt) syncedRef.current.set(r.id, r.updatedAt)
      })
      // ids removed by a remote tombstone need no delete-push from our side
      for (const id of [...syncedRef.current.keys()]) {
        if (!resultMap.has(id) && tombSet.has(id)) syncedRef.current.delete(id)
      }

      const merged = [...resultMap.values()].sort((a, b) => b.createdAt - a.createdAt)
      if (!sameProjects(merged, projectsRef.current)) {
        applyRemoteState(merged)
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      reconcilingRef.current = false
      if (reconcileQueuedRef.current) {
        reconcileQueuedRef.current = false
        void reconcile()
      }
    }
  }, [applyRemoteState])

  // ---- push local changes -> remote -------------------------------------
  const pushLocalChanges = useCallback(async () => {
    if (!activeRef.current || pushingRef.current) return
    pushingRef.current = true
    try {
      const fb = await import('../sync/firebase')
      const local = projectsRef.current
      const localIds = new Set(local.map((p) => p.id))
      for (const p of local) {
        const known = syncedRef.current.get(p.id) ?? -1
        if (p.updatedAt > known) {
          await fb.pushProject(p)
          syncedRef.current.set(p.id, p.updatedAt)
        }
      }
      for (const id of [...syncedRef.current.keys()]) {
        if (!localIds.has(id)) {
          await fb.deleteProjectRemote(id)
          syncedRef.current.delete(id)
        }
      }
      // read connectivity live rather than a captured status (avoids a stale
      // closure overwriting 'offline' set by a concurrent handler)
      if (activeRef.current && navigator.onLine) setStatus('synced')
    } catch (err) {
      // network blips are expected; reflect offline but keep local intact
      if (!navigator.onLine) setStatus('offline')
      else {
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      pushingRef.current = false
    }
  }, [])

  // push whenever local projects change (only while sync is active)
  useEffect(() => {
    if (activeRef.current) void pushLocalChanges()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects])

  // ---- connect / disconnect lifecycle -----------------------------------
  const teardown = useCallback(() => {
    activeRef.current = false
    unwatchRef.current?.()
    unwatchRef.current = null
    unauthRef.current?.()
    unauthRef.current = null
    syncedRef.current.clear()
    remoteRef.current = { projects: [], tombstones: [] }
  }, [])

  const startSyncing = useCallback(async () => {
    try {
      setStatus('syncing')
      const fb = await import('../sync/firebase')
      const remote = await fb.pullAll()
      remoteRef.current = remote
      activeRef.current = true
      await reconcile()
      await pushLocalChanges()
      // attach realtime listeners
      unwatchRef.current = fb.watch(
        (rp) => {
          remoteRef.current = { ...remoteRef.current, projects: rp }
          void reconcile()
        },
        (tb) => {
          remoteRef.current = { ...remoteRef.current, tombstones: tb }
          void reconcile()
        },
        (err) => {
          if (!navigator.onLine) setStatus('offline')
          else {
            setStatus('error')
            setError(err.message)
          }
        },
      )
      setStatus('synced')
    } catch (err) {
      if (!navigator.onLine) setStatus('offline')
      else {
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    }
  }, [reconcile, pushLocalChanges])

  // react to settings (enabled / config) changes
  useEffect(() => {
    let cancelled = false
    setError(null)

    if (!enabled) {
      teardown()
      setStatus('disabled')
      setEmail(null)
      return
    }
    if (!configured || !cfg) {
      teardown()
      setStatus('unconfigured')
      return
    }

    setStatus('connecting')
    ;(async () => {
      try {
        const fb = await import('../sync/firebase')
        await fb.initFirebase(cfg)
        if (cancelled) return
        // observe auth; start syncing once a user is present
        unauthRef.current?.()
        unauthRef.current = fb.onAuthChange((user) => {
          setEmail(user?.email ?? null)
          if (user) {
            void startSyncing()
          } else {
            activeRef.current = false
            unwatchRef.current?.()
            unwatchRef.current = null
            setStatus('signed_out')
          }
        })
      } catch (err) {
        if (cancelled) return
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    })()

    return () => {
      cancelled = true
      // detach auth + snapshot listeners so config changes / unmount don't leak
      teardown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, configured, cfg?.projectId, cfg?.apiKey, cfg?.appId])

  // online/offline awareness
  useEffect(() => {
    const onOnline = () => {
      if (activeRef.current) void reconcile()
    }
    const onOffline = () => {
      if (activeRef.current) setStatus('offline')
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [reconcile])

  const signIn = useCallback(async () => {
    setError(null)
    setStatus('connecting')
    try {
      const fb = await import('../sync/firebase')
      if (cfg) await fb.initFirebase(cfg)
      await fb.signInWithGoogle()
      // onAuthChange will pick it up and start syncing
    } catch (err) {
      setStatus(configured ? 'signed_out' : 'unconfigured')
      setError(err instanceof Error ? err.message : String(err))
    }
  }, [cfg, configured])

  const signOut = useCallback(async () => {
    try {
      const fb = await import('../sync/firebase')
      await fb.signOutUser()
    } catch {
      /* ignore */
    }
    activeRef.current = false
    unwatchRef.current?.()
    unwatchRef.current = null
    syncedRef.current.clear()
    setEmail(null)
    setStatus(enabled && configured ? 'signed_out' : enabled ? 'unconfigured' : 'disabled')
  }, [enabled, configured])

  const syncNow = useCallback(async () => {
    if (!activeRef.current) return
    setStatus('syncing')
    setError(null)
    try {
      const fb = await import('../sync/firebase')
      remoteRef.current = await fb.pullAll()
      await reconcile()
      await pushLocalChanges()
      if (activeRef.current) setStatus('synced')
    } catch (err) {
      if (!navigator.onLine) setStatus('offline')
      else {
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    }
  }, [reconcile, pushLocalChanges])

  const active = status === 'synced' || status === 'syncing' || status === 'offline'

  const value = useMemo<SyncCtx>(
    () => ({ status, email, error, configured, enabled, active, signIn, signOut, syncNow }),
    [status, email, error, configured, enabled, active, signIn, signOut, syncNow],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSync() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSync must be used within SyncProvider')
  return ctx
}
