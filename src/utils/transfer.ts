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
 *
 * By default assigns fresh ids so importing never clobbers existing data (the
 * merge/append case), remapping project↔idea provenance links to the new ids.
 *
 * With `preserveIds` (used when the local library is EMPTY — a migration/restore
 * to a fresh browser) the original ids and timestamps are kept verbatim. This is
 * what makes "export from browser A → import into empty browser B → connect to
 * the same cloud" NOT duplicate everything: the ids match what's already in the
 * cloud, so sync recognises them as the same items instead of copies.
 */
export function parseImport(text: string, opts: { preserveIds?: boolean } = {}): ImportResult {
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

  if (opts.preserveIds) {
    // Faithful restore: keep ids, provenance links and timestamps untouched.
    return {
      projects: projects.map((p) => ({ ...p })),
      ideas: ideas.map((i) => ({ ...i })),
      settings:
        raw && typeof raw.settings === 'object' && raw.settings
          ? (raw.settings as Partial<AppSettings>)
          : undefined,
      colorTool: typeof raw?.colorTool === 'string' && raw.colorTool ? raw.colorTool : undefined,
    }
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

/** Extract ONLY the settings (incl. Firebase config) + colour snapshot from a
 *  backup, ignoring projects/ideas — for carrying your connection config to a
 *  new browser without importing (and later duplicating) the data. */
export function parseSettingsOnly(text: string): {
  settings?: Partial<AppSettings>
  colorTool?: string
} {
  const raw = JSON.parse(text)
  const settings =
    raw && typeof raw.settings === 'object' && raw.settings
      ? (raw.settings as Partial<AppSettings>)
      : undefined
  const colorTool =
    typeof raw?.colorTool === 'string' && raw.colorTool ? (raw.colorTool as string) : undefined
  if (!settings && !colorTool) {
    throw new Error('This file has no settings/configuration to import.')
  }
  return { settings, colorTool }
}

// A content fingerprint that ignores the fields import rewrites (id, updatedAt,
// provenance links). Two records with the same signature are the same content —
// exactly the shape of the "imported a backup, then synced" duplicates.
function signature(obj: Record<string, unknown>, drop: string[]): string {
  const clone: Record<string, unknown> = { ...obj }
  for (const k of ['id', 'updatedAt', ...drop]) delete clone[k]
  return JSON.stringify(clone)
}

export interface DuplicateScan {
  projectIds: string[] // ids safe to remove (extras beyond the first of each group)
  ideaIds: string[]
  projectGroups: number // how many groups had duplicates
  ideaGroups: number
}

/**
 * Find content-identical duplicates among projects and ideas. Within each group
 * of identical records the FIRST is kept and the rest are returned for removal.
 * Safe: the signature includes every meaningful field, so genuinely different
 * works are never grouped together.
 */
export function findDuplicates(projects: Project[], ideas: Idea[]): DuplicateScan {
  const scan = <T extends { id: string }>(items: T[], drop: string[]) => {
    const seen = new Set<string>()
    const remove: string[] = []
    let groups = 0
    const counts = new Map<string, number>()
    for (const it of items) {
      const sig = signature(it as unknown as Record<string, unknown>, drop)
      if (seen.has(sig)) {
        remove.push(it.id)
        counts.set(sig, (counts.get(sig) ?? 1) + 1)
      } else {
        seen.add(sig)
        counts.set(sig, 1)
      }
    }
    counts.forEach((c) => {
      if (c > 1) groups += 1
    })
    return { remove, groups }
  }

  const p = scan(projects, ['fromIdeaId'])
  const i = scan(ideas, ['convertedProjectId'])
  return {
    projectIds: p.remove,
    ideaIds: i.remove,
    projectGroups: p.groups,
    ideaGroups: i.groups,
  }
}
