import { jsPDF } from 'jspdf'
import { Project } from '../../types'
import { t } from '../../i18n'
import { PALETTE, brushDivider, drawFittedImage, setDraw, setFill, setText } from './helpers'

const A6 = { w: 105, h: 148 }
const M = 11

/**
 * A6 Artist Context Card — front side only. A gallery-interpretation style
 * companion card carrying a poem, reflection or statement.
 */
export async function buildArtistCard(project: Project): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a6' })
  const card = project.artistCard
  const contentW = A6.w - M * 2

  setFill(doc, PALETTE.paper)
  doc.rect(0, 0, A6.w, A6.h, 'F')
  setDraw(doc, PALETTE.line)
  doc.setLineWidth(0.3)
  doc.rect(5, 5, A6.w - 10, A6.h - 10)

  let y = 18
  if (project.finalImage) {
    const r = await drawFittedImage(doc, project.finalImage.dataUrl, M, y, contentW, 46, {
      frame: true,
    })
    y = r.y + r.h + 8
  }

  setText(doc, PALETTE.ink)
  doc.setFont('times', 'normal')
  doc.setFontSize(15)
  const titleLines = doc.splitTextToSize(project.title || t('card.untitledWork'), contentW)
  doc.text(titleLines, A6.w / 2, y, { align: 'center' })
  y += titleLines.length * 6 + 2

  brushDivider(doc, A6.w / 2 - 16, y, 32, PALETTE.gold)
  y += 8

  if (card.statement) {
    setText(doc, PALETTE.soft)
    doc.setFont('times', 'italic')
    doc.setFontSize(10.5)
    const st = doc.splitTextToSize(card.statement, contentW)
    doc.text(st, A6.w / 2, y, { align: 'center', lineHeightFactor: 1.5 })
    y += st.length * 5.4 + 6
  }

  // signature near the bottom
  const sigY = A6.h - 30
  if (card.signatureImage) {
    await drawFittedImage(doc, card.signatureImage.dataUrl, A6.w / 2 - 20, sigY - 6, 40, 14)
  }
  setText(doc, PALETTE.faint)
  doc.setFont('times', 'italic')
  doc.setFontSize(8)
  doc.text(
    project.certificate.artistName || project.pdfOptions.artistName || '',
    A6.w / 2,
    A6.h - 14,
    { align: 'center' },
  )

  return doc
}
