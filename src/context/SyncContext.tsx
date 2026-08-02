import {
  createContext,
  MutableRefObject,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Idea, Project, StoredImage, SyncStatus, Tombstone } from '../types'
import { useApp } from './AppContext'
import { useSettings } from './SettingsContext'
import {
  collectIdeaImages,
  collectProjectImages,
  rehydrateIdeaImages,
  rehydrateImages,
} from '../sync/images'
import { computeMerge, sameEntities, Syncable } from '../sync/merge'

interface SyncCtx {
  status: SyncStatus
  email: string | null
  error: string | null
  configured: boolean
  enabled: boolean
  active: boolean
  signIn: () => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
}

const Ctx = createContext<SyncCtx | null>(null)

type Fb = typeof import('../sync/firebase')

/** A synced entity stream (projects or ideas) with its engine state + IO. */
interface Channel<T extends Syncable> {
  getLocal: () => T[]
  apply: (items: T[]) => void
  collectImages: (item: T) => StoredImage[]
  rehydrate: (item: T, imgs: Map<string, string>) => T
  remoteRef: MutableRefObject<{ items: T[]; tombstones: Tombstone[] }>
  syncedRef: MutableRefObject<Map<string, number>>
  pull: (fb: Fb) => Promise<{ items: T[]; tombstones: Tombstone[] }>
  push: (fb: Fb, item: T) => Promise<void>
  del: (fb: Fb, id: string) => Promise<void>
  watch: (
    fb: Fb,
    onItems: (x: T[]) => void,
    onTombs: (x: Tombstone[]) => void,
    onErr: (e: Error) => void,
  ) => () => void
}

// ---- generic per-channel reconcile / push (remote <-> local) --------------

async function reconcileChannel<T extends Syncable>(fb: Fb, ch: Channel<T>): Promise<void> {
  const local = ch.getLocal()
  const { items: remote, tombstones } = ch.remoteRef.current
  const { resultMap, remoteWonIds } = computeMerge(local, remote, tombstones)

  const cache = new Map<string, string>()
  local.forEach((p) =>
    ch.collectImages(p).forEach((img) => {
      if (img.dataUrl) cache.set(img.id, img.dataUrl)
    }),
  )
  const needed = new Set<string>()
  remoteWonIds.forEach((id) => {
    const p = resultMap.get(id)
    if (p) ch.collectImages(p).forEach((img) => {
      if (!cache.has(img.id)) needed.add(img.id)
    })
  })
  const fetched = needed.size ? await fb.loadImages([...needed]) : new Map<string, string>()
  const all = new Map<string, string>([...cache, ...fetched])
  remoteWonIds.forEach((id) => {
    const p = resultMap.get(id)
    if (p) resultMap.set(id, ch.rehydrate(p, all))
  })

  const tombSet = new Map(tombstones.map((t) => [t.id, t.deletedAt]))
  remote.forEach((r) => {
    const dt = tombSet.get(r.id) ?? -1
    if (dt < r.updatedAt) ch.syncedRef.current.set(r.id, r.updatedAt)
  })
  for (const id of [...ch.syncedRef.current.keys()]) {
    if (!resultMap.has(id) && tombSet.has(id)) ch.syncedRef.current.delete(id)
  }

  const merged = [...resultMap.values()].sort((a, b) => b.createdAt - a.createdAt)
  if (!sameEntities(merged, ch.getLocal())) ch.apply(merged)
}

async function pushChannel<T extends Syncable>(fb: Fb, ch: Channel<T>): Promise<void> {
  const local = ch.getLocal()
  const localIds = new Set(local.map((p) => p.id))
  for (const p of local) {
    const known = ch.syncedRef.current.get(p.id) ?? -1
    if (p.updatedAt > known) {
      await ch.push(fb, p)
      ch.syncedRef.current.set(p.id, p.updatedAt)
    }
  }
  for (const id of [...ch.syncedRef.current.keys()]) {
    if (!localIds.has(id)) {
      await ch.del(fb, id)
      ch.syncedRef.current.delete(id)
    }
  }
}

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
  const { projects, ideas, applyRemoteState, applyRemoteIdeas } = useApp()
  const { settings } = useSettings()

  const cfg = settings.sync.firebaseConfig
  const enabled = settings.sync.enabled
  const configured = isConfigured(cfg)

  const [status, setStatus] = useState<SyncStatus>('disabled')
  const [email, setEmail] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // local snapshots (refs so engine reads latest without effect churn)
  const projectsRef = useRef<Project[]>(projects)
  const ideasRef = useRef<Idea[]>(ideas)
  useEffect(() => {
    projectsRef.current = projects
  }, [projects])
  useEffect(() => {
    ideasRef.current = ideas
  }, [ideas])

  // per-channel engine state
  const projRemote = useRef<{ items: Project[]; tombstones: Tombstone[] }>({ items: [], tombstones: [] })
  const projSynced = useRef<Map<string, number>>(new Map())
  const ideaRemote = useRef<{ items: Idea[]; tombstones: Tombstone[] }>({ items: [], tombstones: [] })
  const ideaSynced = useRef<Map<string, number>>(new Map())

  const activeRef = useRef(false)
  const reconcilingRef = useRef(false)
  const reconcileQueuedRef = useRef(false)
  const pushingRef = useRef(false)
  const unwatchRef = useRef<(() => void) | null>(null)
  const unauthRef = useRef<(() => void) | null>(null)

  const projectChannel = useMemo<Channel<Project>>(
    () => ({
      getLocal: () => projectsRef.current,
      apply: applyRemoteState,
      collectImages: collectProjectImages,
      rehydrate: rehydrateImages,
      remoteRef: projRemote,
      syncedRef: projSynced,
      pull: (fb) => fb.pullAll().then((r) => ({ items: r.projects, tombstones: r.tombstones })),
      push: (fb, item) => fb.pushProject(item),
      del: (fb, id) => fb.deleteProjectRemote(id),
      watch: (fb, onI, onT, onE) => fb.watch(onI, onT, onE),
    }),
    [applyRemoteState],
  )
  const ideaChannel = useMemo<Channel<Idea>>(
    () => ({
      getLocal: () => ideasRef.current,
      apply: applyRemoteIdeas,
      collectImages: collectIdeaImages,
      rehydrate: rehydrateIdeaImages,
      remoteRef: ideaRemote,
      syncedRef: ideaSynced,
      pull: (fb) => fb.pullIdeas().then((r) => ({ items: r.ideas, tombstones: r.tombstones })),
      push: (fb, item) => fb.pushIdea(item),
      del: (fb, id) => fb.deleteIdeaRemote(id),
      watch: (fb, onI, onT, onE) => fb.watchIdeas(onI, onT, onE),
    }),
    [applyRemoteIdeas],
  )

  // ---- reconcile (both channels) ----------------------------------------
  const reconcile = useCallback(async () => {
    if (!activeRef.current) return
    if (reconcilingRef.current) {
      reconcileQueuedRef.current = true
      return
    }
    reconcilingRef.current = true
    try {
      const fb = await import('../sync/firebase')
      await reconcileChannel(fb, projectChannel)
      await reconcileChannel(fb, ideaChannel)
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
  }, [projectChannel, ideaChannel])

  // ---- push local changes (both channels) -------------------------------
  const pushLocalChanges = useCallback(async () => {
    if (!activeRef.current || pushingRef.current) return
    pushingRef.current = true
    try {
      const fb = await import('../sync/firebase')
      await pushChannel(fb, projectChannel)
      await pushChannel(fb, ideaChannel)
      if (activeRef.current && navigator.onLine) setStatus('synced')
    } catch (err) {
      if (!navigator.onLine) setStatus('offline')
      else {
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    } finally {
      pushingRef.current = false
    }
  }, [projectChannel, ideaChannel])

  // push whenever local projects or ideas change (while sync is active)
  useEffect(() => {
    if (activeRef.current) void pushLocalChanges()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projects, ideas])

  const teardown = useCallback(() => {
    activeRef.current = false
    unwatchRef.current?.()
    unwatchRef.current = null
    unauthRef.current?.()
    unauthRef.current = null
    projSynced.current.clear()
    ideaSynced.current.clear()
    projRemote.current = { items: [], tombstones: [] }
    ideaRemote.current = { items: [], tombstones: [] }
  }, [])

  const startSyncing = useCallback(async () => {
    try {
      setStatus('syncing')
      const fb = await import('../sync/firebase')
      const [pr, ir] = await Promise.all([projectChannel.pull(fb), ideaChannel.pull(fb)])
      projRemote.current = pr
      ideaRemote.current = ir
      activeRef.current = true
      await reconcile()
      await pushLocalChanges()
      const onErr = (err: Error) => {
        if (!navigator.onLine) setStatus('offline')
        else {
          setStatus('error')
          setError(err.message)
        }
      }
      const unP = projectChannel.watch(
        fb,
        (rp) => {
          projRemote.current = { ...projRemote.current, items: rp }
          void reconcile()
        },
        (tb) => {
          projRemote.current = { ...projRemote.current, tombstones: tb }
          void reconcile()
        },
        onErr,
      )
      const unI = ideaChannel.watch(
        fb,
        (ri) => {
          ideaRemote.current = { ...ideaRemote.current, items: ri }
          void reconcile()
        },
        (tb) => {
          ideaRemote.current = { ...ideaRemote.current, tombstones: tb }
          void reconcile()
        },
        onErr,
      )
      unwatchRef.current = () => {
        unP()
        unI()
      }
      setStatus('synced')
    } catch (err) {
      if (!navigator.onLine) setStatus('offline')
      else {
        setStatus('error')
        setError(err instanceof Error ? err.message : String(err))
      }
    }
  }, [projectChannel, ideaChannel, reconcile, pushLocalChanges])

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
      teardown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, configured, cfg?.projectId, cfg?.apiKey, cfg?.appId])

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
    projSynced.current.clear()
    ideaSynced.current.clear()
    setEmail(null)
    setStatus(enabled && configured ? 'signed_out' : enabled ? 'unconfigured' : 'disabled')
  }, [enabled, configured])

  const syncNow = useCallback(async () => {
    if (!activeRef.current) return
    setStatus('syncing')
    setError(null)
    try {
      const fb = await import('../sync/firebase')
      const [pr, ir] = await Promise.all([projectChannel.pull(fb), ideaChannel.pull(fb)])
      projRemote.current = pr
      ideaRemote.current = ir
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
  }, [projectChannel, ideaChannel, reconcile, pushLocalChanges])

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
