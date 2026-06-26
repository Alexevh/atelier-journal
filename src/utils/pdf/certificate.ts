import { jsPDF } from 'jspdf'
import { Project } from '../../types'
import { t } from '../../i18n'
import {
  PALETTE,
  brushDivider,
  drawFittedImage,
  formatLongDate,
  setDraw,
  setFill,
  setText,
} from './helpers'

const A6 = { w: 105, h: 148 }
const M = 10

function paper(doc: jsPDF) {
  setFill(doc, PALETTE.paper)
  doc.rect(0, 0, A6.w, A6.h, 'F')
  setDraw(doc, PALETTE.line)
  doc.setLineWidth(0.4)
  doc.rect(5, 5, A6.w - 10, A6.h - 10)
  doc.setLineWidth(0.2)
  doc.rect(6.6, 6.6, A6.w - 13.2, A6.h - 13.2)
}

/** Print-ready A6 Certificate of Authenticity — front then back page. */
export async function buildCertificate(project: Project): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a6' })
  const c = project.certificate
  const contentW = A6.w - M * 2

  // ----- FRONT ----------------------------------------------------------
  paper(doc)

  setText(doc, PALETTE.faint)
  doc.setFont('times', 'italic')
  doc.setFontSize(8)
  doc.text(t('pdf.cert.front'), A6.w / 2, 16, { align: 'center' })
  brushDivider(doc, A6.w / 2 - 18, 19, 36, PALETTE.gold)

  let y = 24
  if (project.finalImage) {
    const r = await drawFittedImage(doc, project.finalImage.dataUrl, M, y, contentW, 42, {
      frame: true,
    })
    y = r.y + r.h + 6
  }

  setText(doc, PALETTE.ink)
  doc.setFont('times', 'normal')
  doc.setFontSize(16)
  const titleLines = doc.splitTextToSize(project.title || t('card.untitledWork'), contentW)
  doc.text(titleLines, A6.w / 2, y, { align: 'center' })
  y += titleLines.length * 6 + 1

  setText(doc, PALETTE.soft)
  doc.setFont('times', 'italic')
  doc.setFontSize(9.5)
  const td = [project.technique, project.dimensions].filter(Boolean).join(' · ')
  if (td) {
    doc.text(td, A6.w / 2, y, { align: 'center' })
    y += 5
  }
  if (project.year) {
    doc.text(project.year, A6.w / 2, y, { align: 'center' })
    y += 6
  }

  // materials summary
  if (c.materialsSummary) {
    setText(doc, PALETTE.ink)
    doc.setFont('times', 'normal')
    doc.setFontSize(8)
    const ms = doc.splitTextToSize(`${t('pdf.cert.materialsPrefix')}: ${c.materialsSummary}`, contentW)
    doc.text(ms, A6.w / 2, y, { align: 'center' })
    y += ms.length * 3.8 + 3
  }

  // signature
  if (c.signatureImage) {
    await drawFittedImage(doc, c.signatureImage.dataUrl, A6.w / 2 - 22, y, 44, 16)
    y += 18
  } else {
    y += 6
  }
  setDraw(doc, PALETTE.faint)
  doc.setLineWidth(0.2)
  doc.line(A6.w / 2 - 24, y, A6.w / 2 + 24, y)
  setText(doc, PALETTE.faint)
  doc.setFont('times', 'italic')
  doc.setFontSize(7.5)
  doc.text(c.artistName || t('pdf.cert.signatureFallback'), A6.w / 2, y + 4, { align: 'center' })

  // cert number footer
  setText(doc, PALETTE.gold)
  doc.setFont('times', 'normal')
  doc.setFontSize(8)
  doc.text(t('pdf.cert.no', { num: c.certificateNumber }), A6.w / 2, A6.h - 12, { align: 'center' })

  // ----- BACK -----------------------------------------------------------
  doc.addPage()
  paper(doc)

  setText(doc, PALETTE.faint)
  doc.setFont('times', 'italic')
  doc.setFontSize(8)
  doc.text(t('pdf.cert.back'), A6.w / 2, 16, { align: 'center' })
  brushDivider(doc, A6.w / 2 - 18, 19, 36, PALETTE.gold)

  y = 26
  setText(doc, PALETTE.ink)
  doc.setFont('times', 'normal')
  doc.setFontSize(9.5)
  if (c.authenticityText) {
    const at = doc.splitTextToSize(c.authenticityText, contentW)
    doc.text(at, M, y)
    y += at.length * 4.4 + 4
  }

  if (c.dedication) {
    setText(doc, PALETTE.soft)
    doc.setFont('times', 'italic')
    doc.setFontSize(9)
    const dd = doc.splitTextToSize(c.dedication, contentW)
    doc.text(dd, M, y)
    y += dd.length * 4.4 + 4
  }

  // contact + issue date block near the bottom
  let by = A6.h - 48
  brushDivider(doc, M, by, contentW)
  by += 7
  setText(doc, PALETTE.faint)
  doc.setFont('times', 'italic')
  doc.setFontSize(7.5)
  if (c.artistName) {
    doc.text(t('pdf.cert.artist'), M, by)
    setText(doc, PALETTE.ink)
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.text(c.artistName, M, by + 4)
    by += 9
  }
  if (c.artistContact) {
    setText(doc, PALETTE.faint)
    doc.setFont('times', 'italic')
    doc.setFontSize(7.5)
    doc.text(t('pdf.cert.contact'), M, by)
    setText(doc, PALETTE.ink)
    doc.setFont('times', 'normal')
    doc.setFontSize(8.5)
    const cc = doc.splitTextToSize(c.artistContact, contentW)
    doc.text(cc, M, by + 4)
    by += 4 + cc.length * 4
  }

  setText(doc, PALETTE.faint)
  doc.setFont('times', 'italic')
  doc.setFontSize(7.5)
  doc.text(t('pdf.cert.issued', { date: formatLongDate(c.issueDate) }), M, A6.h - 12)
  doc.text(t('pdf.cert.no', { num: c.certificateNumber }), A6.w - M, A6.h - 12, { align: 'right' })

  // optional second signature / initials, right side
  if (c.secondSignatureImage) {
    await drawFittedImage(doc, c.secondSignatureImage.dataUrl, A6.w - M - 30, by - 2, 30, 12)
  }

  return doc
}
