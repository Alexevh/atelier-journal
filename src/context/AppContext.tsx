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
import { Idea, Project, Tombstone } from '../types'
import { loadData, pushBackup, saveData } from '../db/storage'
import { createIdea, createProject } from '../utils/factory'
import { uid } from '../utils/id'

interface Toast {
  id: string
  message: string
  tone: 'info' | 'success' | 'error'
}

interface AppCtx {
  ready: boolean
  projects: Project[]
  addProject: (partial?: Partial<Project>) => Project
  updateProject: (id: string, updater: (p: Project) => Project) => void
  deleteProject: (id: string) => void
  duplicateProject: (id: string) => Project | undefined
  importProjects: (projects: Project[]) => void
  getProject: (id: string) => Project | undefined
  /**
   * Replace the whole project set verbatim — used by the sync engine to apply a
   * reconciled/remote state. Unlike updateProject it does NOT bump updatedAt, so
   * remote timestamps are preserved and no push feedback loop is created.
   */
  applyRemoteState: (projects: Project[]) => void
  /** Wipe all local projects (settings untouched). */
  clearAllProjects: () => void

  // ---- ideas backlog ----
  ideas: Idea[]
  addIdea: (partial?: Partial<Idea>) => Idea
  updateIdea: (id: string, updater: (i: Idea) => Idea) => void
  deleteIdea: (id: string) => void
  getIdea: (id: string) => Idea | undefined
  importIdeas: (ideas: Idea[]) => void
  /** Sync-engine hook: replace ideas verbatim (no updatedAt bump). */
  applyRemoteIdeas: (ideas: Idea[]) => void

  // ---- explicit deletion markers (for the sync engine) ----
  deletedProjects: Tombstone[]
  deletedIdeas: Tombstone[]

  notify: (message: string, tone?: Toast['tone']) => void
  toasts: Toast[]
  dismissToast: (id: string) => void
}

const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  // Explicit deletion markers, recorded only when the USER deletes something.
  const [deletedProjects, setDeletedProjects] = useState<Tombstone[]>([])
  const [deletedIdeas, setDeletedIdeas] = useState<Tombstone[]>([])
  const [ready, setReady] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const saveTimer = useRef<number | null>(null)
  const backupTimer = useRef<number | null>(null)

  // initial load
  useEffect(() => {
    loadData().then((data) => {
      setProjects(data.projects)
      setIdeas(data.ideas)
      setDeletedProjects(data.deletedProjects ?? [])
      setDeletedIdeas(data.deletedIdeas ?? [])
      setReady(true)
    })
  }, [])

  // debounced persistence + rolling backups
  useEffect(() => {
    if (!ready) return
    const snapshot = { version: 2, projects, ideas, deletedProjects, deletedIdeas }
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveData(snapshot)
    }, 350)

    if (backupTimer.current) window.clearTimeout(backupTimer.current)
    backupTimer.current = window.setTimeout(() => {
      pushBackup(snapshot)
    }, 4000)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      if (backupTimer.current) window.clearTimeout(backupTimer.current)
    }
  }, [projects, ideas, deletedProjects, deletedIdeas, ready])

  // Record / lift a deletion marker. Re-adding an id lifts its tombstone so a
  // stale marker can never shadow-delete a freshly created or imported item.
  const markDeleted = useCallback((kind: 'project' | 'idea', ids: string[], deleted: boolean) => {
    const setter = kind === 'project' ? setDeletedProjects : setDeletedIdeas
    setter((prev) => {
      const idSet = new Set(ids)
      const kept = prev.filter((t) => !idSet.has(t.id))
      if (!deleted) return kept.length === prev.length ? prev : kept
      const now = Date.now()
      return [...kept, ...ids.map((id) => ({ id, deletedAt: now }))]
    })
  }, [])

  const notify = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = uid('t_')
    setToasts((t) => [...t, { id, message, tone }])
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id))
    }, 3600)
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const addProject = useCallback((partial?: Partial<Project>) => {
    const project = createProject(partial)
    setProjects((prev) => [project, ...prev])
    markDeleted('project', [project.id], false)
    return project
  }, [markDeleted])

  const updateProject = useCallback((id: string, updater: (p: Project) => Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...updater(p), updatedAt: Date.now() } : p)),
    )
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
    markDeleted('project', [id], true)
  }, [markDeleted])

  const duplicateProject = useCallback(
    (id: string) => {
      // Build the copy outside the state updater so the updater stays pure
      // (StrictMode runs updaters twice; ids/timestamps must not differ).
      const original = projects.find((p) => p.id === id)
      if (!original) return undefined
      const now = Date.now()
      const copy: Project = {
        ...structuredClone(original),
        id: uid('p_'),
        title: `${original.title} (copy)`,
        createdAt: now,
        updatedAt: now,
      }
      setProjects((prev) => {
        const idx = prev.findIndex((p) => p.id === id)
        const next = [...prev]
        next.splice(idx < 0 ? 0 : idx + 1, 0, copy)
        return next
      })
      markDeleted('project', [copy.id], false)
      return copy
    },
    [projects, markDeleted],
  )

  const importProjects = useCallback((incoming: Project[]) => {
    setProjects((prev) => [...incoming, ...prev])
    markDeleted('project', incoming.map((p) => p.id), false)
  }, [markDeleted])

  const applyRemoteState = useCallback((next: Project[]) => {
    setProjects(next)
  }, [])

  const clearAllProjects = useCallback(() => {
    setProjects([])
    setIdeas([])
  }, [])

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  )

  // ---- ideas backlog ----
  const addIdea = useCallback((partial?: Partial<Idea>) => {
    const idea = createIdea(partial)
    setIdeas((prev) => [idea, ...prev])
    markDeleted('idea', [idea.id], false)
    return idea
  }, [markDeleted])

  const updateIdea = useCallback((id: string, updater: (i: Idea) => Idea) => {
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...updater(i), updatedAt: Date.now() } : i)),
    )
  }, [])

  const deleteIdea = useCallback((id: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== id))
    markDeleted('idea', [id], true)
  }, [markDeleted])

  const getIdea = useCallback((id: string) => ideas.find((i) => i.id === id), [ideas])

  const importIdeas = useCallback((incoming: Idea[]) => {
    setIdeas((prev) => [...incoming, ...prev])
    markDeleted('idea', incoming.map((i) => i.id), false)
  }, [markDeleted])

  const applyRemoteIdeas = useCallback((next: Idea[]) => {
    setIdeas(next)
  }, [])

  const value = useMemo<AppCtx>(
    () => ({
      ready,
      projects,
      addProject,
      updateProject,
      deleteProject,
      duplicateProject,
      importProjects,
      getProject,
      applyRemoteState,
      clearAllProjects,
      ideas,
      addIdea,
      updateIdea,
      deleteIdea,
      getIdea,
      importIdeas,
      applyRemoteIdeas,
      deletedProjects,
      deletedIdeas,
      notify,
      toasts,
      dismissToast,
    }),
    [
      ready,
      projects,
      addProject,
      updateProject,
      deleteProject,
      duplicateProject,
      importProjects,
      getProject,
      applyRemoteState,
      clearAllProjects,
      ideas,
      addIdea,
      updateIdea,
      deleteIdea,
      getIdea,
      importIdeas,
      applyRemoteIdeas,
      deletedProjects,
      deletedIdeas,
      notify,
      toasts,
      dismissToast,
    ],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
