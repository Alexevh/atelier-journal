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
import { Project } from '../types'
import { loadData, pushBackup, saveData } from '../db/storage'
import { createProject } from '../utils/factory'
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
  notify: (message: string, tone?: Toast['tone']) => void
  toasts: Toast[]
  dismissToast: (id: string) => void
}

const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<Project[]>([])
  const [ready, setReady] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const saveTimer = useRef<number | null>(null)
  const backupTimer = useRef<number | null>(null)

  // initial load
  useEffect(() => {
    loadData().then((data) => {
      setProjects(data.projects)
      setReady(true)
    })
  }, [])

  // debounced persistence + rolling backups
  useEffect(() => {
    if (!ready) return
    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(() => {
      saveData({ version: 1, projects })
    }, 350)

    if (backupTimer.current) window.clearTimeout(backupTimer.current)
    backupTimer.current = window.setTimeout(() => {
      pushBackup({ version: 1, projects })
    }, 4000)

    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
    }
  }, [projects, ready])

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
      let copy: Project | undefined
      setProjects((prev) => {
        const original = prev.find((p) => p.id === id)
        if (!original) return prev
        const now = Date.now()
        copy = {
          ...structuredClone(original),
          id: uid('p_'),
          title: `${original.title} (copy)`,
          createdAt: now,
          updatedAt: now,
        }
        const idx = prev.findIndex((p) => p.id === id)
        const next = [...prev]
        next.splice(idx + 1, 0, copy)
        return next
      })
      return copy
    },
    [],
  )

  const importProjects = useCallback((incoming: Project[]) => {
    setProjects((prev) => [...incoming, ...prev])
  }, [])

  const applyRemoteState = useCallback((next: Project[]) => {
    setProjects(next)
  }, [])

  const clearAllProjects = useCallback(() => {
    setProjects([])
  }, [])

  const getProject = useCallback(
    (id: string) => projects.find((p) => p.id === id),
    [projects],
  )

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
