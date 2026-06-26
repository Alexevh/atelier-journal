/** Compact, collision-resistant id generator (no external deps). */
export function uid(prefix = ''): string {
  const rand = Math.random().toString(36).slice(2, 10)
  const time = Date.now().toString(36)
  return `${prefix}${time}${rand}`
}

/**
 * Generate a human-friendly certificate number, e.g. "ATL-2026-7Q3K".
 * Year keeps it sortable; the suffix keeps it unique.
 */
export function generateCertificateNumber(year?: string): string {
  const y = year && /^\d{4}$/.test(year) ? year : new Date().getFullYear().toString()
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `ATL-${y}-${suffix}`
}
