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
import { Idea, Project } from '../types'
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

  notify: (message: string, tone?: Toast['tone']) => void
  toasts: Toast[]
  dismissToast: (id: string) => void
}

const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [ready, setReady] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const saveTimer = useRef<number | null>(null)
  const backupTimer = useRef<number | null>(null)

  // initial load
  useEffect(() => {
    loadData().then((data) => {
      setProjects(data.projects)
      setIdeas(data.ideas)
      setReady(true)
    })
  }, [])

  // debounced persistence + rolling backups
  useEffect(() => {
    if (!ready) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveData({ version: 2, projects, ideas })
    }, 350)

    if (backupTimer.current) window.clearTimeout(backupTimer.current)
    backupTimer.current = window.setTimeout(() => {
      pushBackup({ version: 2, projects, ideas })
    }, 4000)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      if (backupTimer.current) window.clearTimeout(backupTimer.current)
    }
  }, [projects, ideas, ready])

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
    return project
  }, [])

  const updateProject = useCallback((id: string, updater: (p: Project) => Project) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...updater(p), updatedAt: Date.now() } : p)),
    )
  }, [])

  const deleteProject = useCallback((id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }, [])

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
      return copy
    },
    [projects],
  )

  const importProjects = useCallback((incoming: Project[]) => {
    setProjects((prev) => [...incoming, ...prev])
  }, [])

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
    return idea
  }, [])

  const updateIdea = useCallback((id: string, updater: (i: Idea) => Idea) => {
    setIdeas((prev) =>
      prev.map((i) => (i.id === id ? { ...updater(i), updatedAt: Date.now() } : i)),
    )
  }, [])

  const deleteIdea = useCallback((id: string) => {
    setIdeas((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const getIdea = useCallback((id: string) => ideas.find((i) => i.id === id), [ideas])

  const importIdeas = useCallback((incoming: Idea[]) => {
    setIdeas((prev) => [...incoming, ...prev])
  }, [])

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
