import { AppData, APP_DATA_VERSION, Idea, Project } from '../types'
import { uid } from './id'

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function safeName(s: string): string {
  return (s || 'project').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'project'
}

// Track when the user last exported a backup, so the UI can gently remind them.
const LAST_EXPORT_KEY = 'atelier-last-export'

function markExported() {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

export function getLastExport(): number | null {
  try {
    const v = localStorage.getItem(LAST_EXPORT_KEY)
    return v ? Number(v) : null
  } catch {
    return null
  }
}

/** Export a single project as a self-contained JSON file. */
export function exportProject(project: Project) {
  const payload = {
    type: 'atelier-project',
    version: APP_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    project,
  }
  download(`${safeName(project.title)}.atelier.json`, JSON.stringify(payload, null, 2), 'application/json')
  markExported()
}

/** Export the whole library (all projects + idea backlog). */
export function exportLibrary(data: AppData) {
  const payload = {
    type: 'atelier-library',
    version: APP_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    projects: data.projects,
    ideas: data.ideas,
  }
  download(`atelier-library-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json')
  markExported()
}

export interface ImportResult {
  projects: Project[]
  ideas: Idea[]
}

/**
 * Parse an imported JSON file. Accepts single-project and full-library exports.
 * Assigns fresh ids so importing never clobbers existing data, while remapping
 * project↔idea provenance links to the new ids.
 */
export function parseImport(text: string): ImportResult {
  const raw = JSON.parse(text)
  let projects: Project[] = []
  let ideas: Idea[] = []
  if (raw && raw.type === 'atelier-project' && raw.project) {
    projects = [raw.project]
  } else if (raw && raw.type === 'atelier-library') {
    projects = Array.isArray(raw.projects) ? raw.projects : []
    ideas = Array.isArray(raw.ideas) ? raw.ideas : []
  } else if (Array.isArray(raw?.projects)) {
    projects = raw.projects
    ideas = Array.isArray(raw.ideas) ? raw.ideas : []
  } else if (raw && raw.id && raw.title !== undefined) {
    projects = [raw] // bare project object
  } else {
    throw new Error('Unrecognised file format. Expected an Atelier export.')
  }

  const now = Date.now()
  const projMap = new Map<string, string>()
  const ideaMap = new Map<string, string>()
  projects.forEach((p) => projMap.set(p.id, uid('p_')))
  ideas.forEach((i) => ideaMap.set(i.id, uid('i_')))

  return {
    projects: projects.map((p) => ({
      ...p,
      id: projMap.get(p.id)!,
      fromIdeaId: p.fromIdeaId ? ideaMap.get(p.fromIdeaId) : undefined,
      updatedAt: now,
    })),
    ideas: ideas.map((i) => ({
      ...i,
      id: ideaMap.get(i.id)!,
      convertedProjectId: i.convertedProjectId ? projMap.get(i.convertedProjectId) : undefined,
      updatedAt: now,
    })),
  }
}

export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
