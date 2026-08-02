import { AppData, APP_DATA_VERSION, AppSettings, Idea, Project } from '../types'
import { snapshotColorData } from '../sync/colorData'
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

/**
 * Export EVERYTHING: projects, ideas, app settings, and the colour tool's
 * snapshot (palettes, prefs, calibration and the Logbook with photos) — one
 * self-contained backup file.
 */
export async function exportLibrary(data: AppData, settings?: AppSettings) {
  let colorTool: string | undefined
  try {
    colorTool = (await snapshotColorData()).payload
  } catch {
    /* colour tool data unavailable — export the rest */
  }
  const payload = {
    type: 'atelier-library',
    version: APP_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    projects: data.projects,
    ideas: data.ideas,
    settings,
    colorTool,
  }
  download(`atelier-library-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2), 'application/json')
  markExported()
}

export interface ImportResult {
  projects: Project[]
  ideas: Idea[]
  /** Present when the file carries a full-backup settings block. */
  settings?: Partial<AppSettings>
  /** Present when the file carries the colour tool snapshot payload. */
  colorTool?: string
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
    settings:
      raw && typeof raw.settings === 'object' && raw.settings
        ? (raw.settings as Partial<AppSettings>)
        : undefined,
    colorTool: typeof raw?.colorTool === 'string' && raw.colorTool ? raw.colorTool : undefined,
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
