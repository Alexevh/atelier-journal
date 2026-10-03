// Lightweight crash diagnostics.
//
// A browser OOM kill (Chrome's "Oh no!" page) terminates the tab's process, so
// no JS runs at that moment and it can't be caught. What we CAN do:
//  • log every catchable error (render errors, window.onerror, rejected promises)
//    to a small persisted ring buffer;
//  • keep a heartbeat with breadcrumbs (screen, JS heap usage) while the page is
//    visible, and mark clean exits — so on the next launch we can tell the
//    previous session died unexpectedly and show where/with how much memory;
//  • warn when the JS heap approaches its limit (Chrome exposes it).

import { APP_VERSION } from '../version'

const LOG_KEY = 'atelier.errorLog'
const SESSION_KEY = 'atelier.session'
const MAX_LOG = 25
const BEAT_MS = 5000
const MEM_WARN = 0.85 // fraction of the JS heap limit

export interface ErrorEntry {
  t: number
  kind: 'render' | 'error' | 'promise' | 'memory'
  message: string
  stack?: string
  where: string
  version: string
}

export interface SessionCrumbs {
  alive: boolean
  startedAt: number
  lastBeat: number
  where: string
  heapUsedMB?: number
  heapLimitMB?: number
  version: string
}

let breadcrumb = ''
let previousCrash: SessionCrumbs | null = null

/** Name the current screen (route / colour-tool tab) for crash reports. */
export function setBreadcrumb(where: string) {
  breadcrumb = where
}

function currentWhere(): string {
  return breadcrumb || location.hash || '#/'
}

function heap(): { used?: number; limit?: number } {
  const m = (performance as unknown as { memory?: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory
  if (!m) return {}
  return { used: m.usedJSHeapSize, limit: m.jsHeapSizeLimit }
}

const MB = (b?: number) => (b == null ? undefined : Math.round(b / 1048576))

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full / blocked — diagnostics are best-effort */
  }
}

export function getErrorLog(): ErrorEntry[] {
  return readJSON<ErrorEntry[]>(LOG_KEY, [])
}
export function clearErrorLog() {
  writeJSON(LOG_KEY, [])
}

export function logError(kind: ErrorEntry['kind'], err: unknown): ErrorEntry {
  const e = err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err))
  const entry: ErrorEntry = {
    t: Date.now(),
    kind,
    message: (e.message || String(err)).slice(0, 500),
    stack: e.stack?.split('\n').slice(0, 8).join('\n'),
    where: currentWhere(),
    version: APP_VERSION,
  }
  const log = getErrorLog()
  log.unshift(entry)
  writeJSON(LOG_KEY, log.slice(0, MAX_LOG))
  try {
    window.dispatchEvent(new CustomEvent('atelier-error', { detail: entry }))
  } catch {
    /* ignore */
  }
  return entry
}

/** The previous session if it ended without a clean exit (likely a crash). */
export function getPreviousCrash(): SessionCrumbs | null {
  return previousCrash
}
export function dismissPreviousCrash() {
  previousCrash = null
}

function beat(alive: boolean) {
  const h = heap()
  const prev = readJSON<SessionCrumbs | null>(SESSION_KEY, null)
  writeJSON(SESSION_KEY, {
    alive,
    startedAt: prev?.startedAt ?? Date.now(),
    lastBeat: Date.now(),
    where: currentWhere(),
    heapUsedMB: MB(h.used),
    heapLimitMB: MB(h.limit),
    version: APP_VERSION,
  } satisfies SessionCrumbs)
}

let memWarnedAt = 0
function checkMemory() {
  const h = heap()
  if (!h.used || !h.limit) return
  if (h.used / h.limit >= MEM_WARN && Date.now() - memWarnedAt > 60_000) {
    memWarnedAt = Date.now()
    logError('memory', new Error(`High memory: ${MB(h.used)} / ${MB(h.limit)} MB`))
  }
}

let installed = false
export function installDiagnostics() {
  if (installed) return
  installed = true

  // Did the last session end without marking a clean exit?
  const prev = readJSON<SessionCrumbs | null>(SESSION_KEY, null)
  if (prev?.alive) previousCrash = prev
  writeJSON(SESSION_KEY, { ...(prev ?? {}), alive: false, startedAt: Date.now() })

  window.addEventListener('error', (ev) => {
    // resource load errors have no `error` object; ignore those
    if (ev.error || ev.message) logError('error', ev.error ?? ev.message)
  })
  window.addEventListener('unhandledrejection', (ev) => logError('promise', ev.reason))

  // Heartbeat only while visible: a phone discarding a BACKGROUND tab is
  // normal and must not be reported as a crash.
  const onVisibility = () => beat(document.visibilityState === 'visible')
  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', () => beat(false))
  beat(document.visibilityState === 'visible')
  window.setInterval(() => {
    if (document.visibilityState === 'visible') {
      beat(true)
      checkMemory()
    }
  }, BEAT_MS)
}

/** Plain-text report for copy/paste. */
export function formatReport(extra?: string): string {
  const h = heap()
  const lines = [
    `Atelier v${APP_VERSION}`,
    `When: ${new Date().toISOString()}`,
    `Screen: ${currentWhere()}`,
    `UA: ${navigator.userAgent}`,
    h.used ? `Memory: ${MB(h.used)} / ${MB(h.limit)} MB` : 'Memory: n/a',
  ]
  if (extra) lines.push('', extra)
  const log = getErrorLog()
  if (log.length) {
    lines.push('', 'Recent errors:')
    for (const e of log.slice(0, 10)) {
      lines.push(`- [${new Date(e.t).toISOString()}] ${e.kind} @ ${e.where} (v${e.version}): ${e.message}`)
      if (e.stack) lines.push(e.stack.split('\n').map((l) => '    ' + l).join('\n'))
    }
  }
  return lines.join('\n')
}
