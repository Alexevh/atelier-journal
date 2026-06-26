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
