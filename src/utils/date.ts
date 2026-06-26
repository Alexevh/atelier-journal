import { dateLocale } from '../i18n'

/** Format an ISO yyyy-mm-dd date as "14 March 2026" / "14 de marzo de 2026". */
export function formatLongDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString(dateLocale(), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** Whole-days difference, then a localized "2 days ago" / "hace 2 días". */
export function formatRelativeDays(timestamp: number): string {
  const days = Math.round((timestamp - Date.now()) / 86_400_000)
  const rtf = new Intl.RelativeTimeFormat(dateLocale(), { numeric: 'auto' })
  return rtf.format(days, 'day')
}

/** Days elapsed since a timestamp (>= 0). */
export function daysSince(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / 86_400_000)
}
