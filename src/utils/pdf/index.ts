import { Project } from '../../types'
import { buildArtistCard } from './artistCard'
import { buildCertificate } from './certificate'
import { buildMonograph } from './monograph'

function fileSafe(s: string): string {
  return (s || 'artwork').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'artwork'
}

export async function exportMonographPdf(project: Project) {
  const doc = await buildMonograph(project)
  doc.save(`${fileSafe(project.title)}-monograph.pdf`)
}

export async function exportCertificatePdf(project: Project) {
  const doc = await buildCertificate(project)
  doc.save(`${fileSafe(project.title)}-certificate.pdf`)
}

export async function exportArtistCardPdf(project: Project) {
  const doc = await buildArtistCard(project)
  doc.save(`${fileSafe(project.title)}-artist-card.pdf`)
}
