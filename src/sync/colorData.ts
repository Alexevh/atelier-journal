// Snapshot-level sync for the ported Pigment Match colour tool.
//
// The tool's own persistence (localStorage `pigment-match.*` keys + its
// logbook IndexedDB with photos) is left untouched — instead, the whole state
// is snapshotted into a single JSON payload that rides Atelier's Firebase as
// one more channel, with last-write-wins semantics. This keeps the ported
// code verbatim while making Atelier's cloud the durable home for the data.

import { exportLogbook, importLogbook, clearAll } from '../lib/logbook'

const PREFIX = 'pigment-match.'
// Language is bridged live from Atelier; a stale snapshot must not fight it.
const EXCLUDE = new Set(['pigment-match.lang.v1'])

const TS_KEY = 'atelier.colorSync.updatedAt'
const HASH_KEY = 'atelier.colorSync.hash'

function readKeys(): Record<string, string> {
  const out: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX) && !EXCLUDE.has(k)) {
        out[k] = localStorage.getItem(k) ?? ''
      }
    }
  } catch {
    /* ignore */
  }
  return out
}

/** djb2 string hash — cheap change detection for the payload. */
function hash(s: string): string {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0
  return (h >>> 0).toString(36) + ':' + s.length.toString(36)
}

export interface ColorSnapshot {
  payload: string
  hash: string
}

export async function snapshotColorData(): Promise<ColorSnapshot> {
  const keys = readKeys()
  let logbook = ''
  try {
    logbook = await exportLogbook(true)
  } catch {
    /* logbook empty / unavailable */
  }
  // sort keys so the payload (and its hash) is deterministic
  const sorted: Record<string, string> = {}
  Object.keys(keys)
    .sort()
    .forEach((k) => {
      sorted[k] = keys[k]
    })
  const payload = JSON.stringify({ v: 1, keys: sorted, logbook })
  return { payload, hash: hash(payload) }
}

export interface ColorLocalMeta {
  updatedAt: number
  hash: string
  /** True when this device has synced colour data at least once. */
  everSynced: boolean
}

export function getColorLocalMeta(): ColorLocalMeta {
  try {
    const ts = Number(localStorage.getItem(TS_KEY) ?? '')
    const h = localStorage.getItem(HASH_KEY) ?? ''
    return { updatedAt: Number.isFinite(ts) ? ts : 0, hash: h, everSynced: !!h }
  } catch {
    return { updatedAt: 0, hash: '', everSynced: false }
  }
}

export function setColorLocalMeta(updatedAt: number, h: string): void {
  try {
    localStorage.setItem(TS_KEY, String(updatedAt))
    localStorage.setItem(HASH_KEY, h)
  } catch {
    /* ignore */
  }
}

/**
 * Replace the local colour-tool state with a remote snapshot: rewrite the
 * pigment-match.* keys and swap the logbook wholesale (import merges and
 * re-ids, so it must be cleared first).
 */
export async function applyColorSnapshot(payload: string): Promise<void> {
  const data = JSON.parse(payload) as { v: number; keys: Record<string, string>; logbook: string }
  // remove current prefixed keys (except excluded), then write the snapshot's
  try {
    const stale: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(PREFIX) && !EXCLUDE.has(k)) stale.push(k)
    }
    stale.forEach((k) => localStorage.removeItem(k))
    Object.entries(data.keys ?? {}).forEach(([k, v]) => {
      if (k.startsWith(PREFIX) && !EXCLUDE.has(k)) localStorage.setItem(k, v)
    })
  } catch {
    /* ignore */
  }
  if (data.logbook) {
    await clearAll()
    await importLogbook(data.logbook)
  }
}
