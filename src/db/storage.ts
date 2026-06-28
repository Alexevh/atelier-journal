import { AppData, APP_DATA_VERSION, AppSettings, Project } from '../types'

// A tiny promise-based IndexedDB wrapper. Falls back to localStorage when
// IndexedDB is unavailable (private mode on some browsers). Both keep all data
// strictly on the user's device.

const DB_NAME = 'atelier-journal'
const STORE = 'kv'
const DATA_KEY = 'app-data'
const SETTINGS_KEY = 'app-settings'
const LS_KEY = 'atelier-journal-data'
const LS_SETTINGS_KEY = 'atelier-journal-settings'

let dbPromise: Promise<IDBDatabase> | null = null

function hasIndexedDB(): boolean {
  try {
    return typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(key)
    req.onsuccess = () => resolve(req.result as T | undefined)
    req.onerror = () => reject(req.error)
  })
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

function emptyData(): AppData {
  return { version: APP_DATA_VERSION, projects: [] }
}

/** Defensive normaliser — migrates/repairs loaded data into a valid shape. */
function normalize(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') return emptyData()
  const data = raw as Partial<AppData>
  if (!Array.isArray(data.projects)) return emptyData()
  return { version: APP_DATA_VERSION, projects: data.projects as Project[] }
}

export async function loadData(): Promise<AppData> {
  try {
    if (hasIndexedDB()) {
      const data = await idbGet<AppData>(DATA_KEY)
      if (data) return normalize(data)
      // migrate any legacy localStorage payload into IndexedDB
      const legacy = localStorage.getItem(LS_KEY)
      if (legacy) {
        const parsed = normalize(JSON.parse(legacy))
        await idbSet(DATA_KEY, parsed)
        return parsed
      }
      return emptyData()
    }
  } catch (err) {
    console.warn('IndexedDB load failed, falling back to localStorage', err)
  }
  try {
    const legacy = localStorage.getItem(LS_KEY)
    return legacy ? normalize(JSON.parse(legacy)) : emptyData()
  } catch {
    return emptyData()
  }
}

export async function saveData(data: AppData): Promise<void> {
  const payload: AppData = { version: APP_DATA_VERSION, projects: data.projects }
  try {
    if (hasIndexedDB()) {
      await idbSet(DATA_KEY, payload)
      return
    }
  } catch (err) {
    console.warn('IndexedDB save failed, falling back to localStorage', err)
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(payload))
  } catch (err) {
    console.error('Failed to persist data', err)
    throw err
  }
}

// ---- Settings ------------------------------------------------------------
// Settings live alongside the data, also strictly on-device.

export async function loadSettings(): Promise<Partial<AppSettings> | null> {
  try {
    if (hasIndexedDB()) {
      const s = await idbGet<Partial<AppSettings>>(SETTINGS_KEY)
      if (s) return s
      const legacy = localStorage.getItem(LS_SETTINGS_KEY)
      if (legacy) {
        const parsed = JSON.parse(legacy) as Partial<AppSettings>
        await idbSet(SETTINGS_KEY, parsed)
        return parsed
      }
      return null
    }
  } catch (err) {
    console.warn('IndexedDB settings load failed, falling back to localStorage', err)
  }
  try {
    const legacy = localStorage.getItem(LS_SETTINGS_KEY)
    return legacy ? (JSON.parse(legacy) as Partial<AppSettings>) : null
  } catch {
    return null
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    if (hasIndexedDB()) {
      await idbSet(SETTINGS_KEY, settings)
      return
    }
  } catch (err) {
    console.warn('IndexedDB settings save failed, falling back to localStorage', err)
  }
  try {
    localStorage.setItem(LS_SETTINGS_KEY, JSON.stringify(settings))
  } catch (err) {
    console.error('Failed to persist settings', err)
  }
}

// ---- Backups -------------------------------------------------------------

const BACKUP_KEY = 'atelier-journal-backups'
const MAX_BACKUPS = 5

interface Backup {
  timestamp: number
  data: AppData
}

/** Rolling automatic backups, kept lightweight in localStorage. */
export async function pushBackup(data: AppData): Promise<void> {
  try {
    const existing: Backup[] = JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]')
    existing.unshift({ timestamp: Date.now(), data })
    const trimmed = existing.slice(0, MAX_BACKUPS)
    localStorage.setItem(BACKUP_KEY, JSON.stringify(trimmed))
  } catch (err) {
    // Backups are best-effort; never block the main save.
    console.warn('Backup failed (likely storage quota)', err)
  }
}

export function listBackups(): Backup[] {
  try {
    return JSON.parse(localStorage.getItem(BACKUP_KEY) || '[]')
  } catch {
    return []
  }
}
