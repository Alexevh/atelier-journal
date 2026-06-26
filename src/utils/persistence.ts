// Helpers around the StorageManager API. Everything is best-effort: older
// browsers simply report "not supported" and the app keeps working.

export interface StorageInfo {
  supported: boolean
  persisted: boolean
  usage: number
  quota: number
}

/**
 * Ask the browser to mark this origin's storage as persistent, so it is not
 * silently evicted under disk pressure. Installed PWAs are often granted this
 * automatically. Returns the resulting persisted state.
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage || !navigator.storage.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

/** Current usage / quota and whether storage is persisted. */
export async function getStorageInfo(): Promise<StorageInfo> {
  try {
    if (!navigator.storage || !navigator.storage.estimate) {
      return { supported: false, persisted: false, usage: 0, quota: 0 }
    }
    const persisted = navigator.storage.persisted
      ? await navigator.storage.persisted()
      : false
    const est = await navigator.storage.estimate()
    return {
      supported: true,
      persisted,
      usage: est.usage ?? 0,
      quota: est.quota ?? 0,
    }
  } catch {
    return { supported: false, persisted: false, usage: 0, quota: 0 }
  }
}

/** Human-friendly byte size, e.g. "2.4 MB". */
export function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}
