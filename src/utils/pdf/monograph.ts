import { jsPDF } from 'jspdf'
import { Project } from '../../types'
import { t } from '../../i18n'
import {
  PALETTE,
  brushDivider,
  drawFittedImage,
  drawWatermark,
  formatLongDate,
  setDraw,
  setFill,
  setText,
} from './helpers'

const A4 = { w: 210, h: 297 }
const MARGIN = 22

/**
 * Build the collector monograph — an art-book style document chronicling the
 * making of the painting. Returns the jsPDF instance (caller saves/opens it).
 */
export async function buildMonograph(project: Project): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const opts = project.pdfOptions
  const contentW = A4.w - MARGIN * 2

  // --- helpers bound to this document -----------------------------------
  let y = MARGIN

  const paintPaper = () => {
    setFill(doc, PALETTE.paper)
    doc.rect(0, 0, A4.w, A4.h, 'F')
  }
  const footer = (label: string) => {
    setText(doc, PALETTE.faint)
    doc.setFont('times', 'italic')
    doc.setFontSize(8)
    doc.text(label, A4.w / 2, A4.h - 12, { align: 'center' })
  }
  const newPage = () => {
    doc.addPage()
    paintPaper()
    if (opts.watermark) drawWatermark(doc, opts.watermark, A4.w, A4.h)
    y = MARGIN
  }
  const ensure = (needed: number) => {
    if (y + needed > A4.h - 22) newPage()
  }

  // ====================== COVER =========================================
  paintPaper()
  if (opts.watermark) drawWatermark(doc, opts.watermark, A4.w, A4.h)

  // thin inner keyline border
  setDraw(doc, PALETTE.line)
  doc.setLineWidth(0.4)
  doc.rect(12, 12, A4.w - 24, A4.h - 24)
  doc.setLineWidth(0.2)
  doc.rect(14, 14, A4.w - 28, A4.h - 28)

  setText(doc, PALETTE.faint)
  doc.setFont('times', 'italic')
  doc.setFontSize(12)
  doc.text(t('pdf.eyebrow'), A4.w / 2, 40, { align: 'center' })

  brushDivider(doc, A4.w / 2 - 30, 47, 60, PALETTE.gold)

  // cover image (final artwork preferred)
  const cover = project.finalImage || project.referenceImage
  if (cover) {
    await drawFittedImage(doc, cover.dataUrl, MARGIN, 58, contentW, 150, { frame: true })
  }

  setText(doc, PALETTE.ink)
  doc.setFont('times', 'normal')
  doc.setFontSize(30)
  const titleLines = doc.splitTextToSize(project.title || t('card.untitledWork'), contentW)
  doc.text(titleLines, A4.w / 2, 226, { align: 'center' })

  let cy = 226 + titleLines.length * 11
  if (project.shortDescription) {
    setText(doc, PALETTE.soft)
    doc.setFont('times', 'italic')
    doc.setFontSize(13)
    const sd = doc.splitTextToSize(project.shortDescription, contentW - 20)
    doc.text(sd, A4.w / 2, cy + 2, { align: 'center' })
    cy += sd.length * 6 + 4
  }

  setText(doc, PALETTE.faint)
  doc.setFont('times', 'normal')
  doc.setFontSize(11)
  const meta = [project.technique, project.dimensions, project.year].filter(Boolean).join('   ·   ')
  doc.text(meta, A4.w / 2, cy + 6, { align: 'center' })
  if (opts.artistName) {
    doc.setFont('times', 'italic')
    doc.text(opts.artistName, A4.w / 2, cy + 14, { align: 'center' })
  }
  footer(t('pdf.preparedFor'))

  // ====================== THE WORK ======================================
  newPage()
  sectionHeading(doc, t('pdf.theWork'), y)
  y += 16

  setText(doc, PALETTE.ink)
  doc.setFont('times', 'normal')
  doc.setFontSize(11)
  if (project.detailedDescription) {
    const dd = doc.splitTextToSize(project.detailedDescription, contentW)
    doc.text(dd, MARGIN, y)
    y += dd.length * 5.4 + 8
  }

  // detail table
  const rows: [string, string][] = [
    [t('pdf.status'), t(`status.${project.status}`)],
    [t('pdf.year'), project.year],
    [t('pdf.technique'), project.technique],
    [t('pdf.dimensions'), project.dimensions],
    [t('pdf.tags'), project.tags.join(', ')],
  ].filter(([, v]) => v) as [string, string][]

  rows.forEach(([k, v]) => {
    ensure(8)
    setText(doc, PALETTE.faint)
    doc.setFont('times', 'italic')
    doc.setFontSize(10)
    doc.text(k.toUpperCase(), MARGIN, y)
    setText(doc, PALETTE.ink)
    doc.setFont('times', 'normal')
    doc.setFontSize(11)
    const vLines = doc.splitTextToSize(v, contentW - 45)
    doc.text(vLines, MARGIN + 42, y)
    y += Math.max(7, vLines.length * 5.4)
  })

  y += 4
  ensure(120)
  brushDivider(doc, MARGIN, y, contentW)
  y += 10

  // reference + final side by side
  const half = (contentW - 8) / 2
  if (project.referenceImage || project.finalImage) {
    const top = y
    if (project.referenceImage) {
      caption(doc, t('pdf.reference'), MARGIN, top)
      await drawFittedImage(doc, project.referenceImage.dataUrl, MARGIN, top + 4, half, 95, { frame: true })
    }
    if (project.finalImage) {
      caption(doc, t('pdf.finalArtwork'), MARGIN + half + 8, top)
      await drawFittedImage(doc, project.finalImage.dataUrl, MARGIN + half + 8, top + 4, half, 95, { frame: true })
    }
    y = top + 105
  }

  // ====================== MATERIALS =====================================
  if (project.materials.length) {
    ensure(40)
    sectionHeading(doc, t('pdf.materials'), y)
    y += 14
    setText(doc, PALETTE.ink)
    doc.setFont('times', 'normal')
    doc.setFontSize(11)
    project.materials.forEach((m) => {
      ensure(8)
      setFill(doc, PALETTE.gold)
      doc.circle(MARGIN + 1, y - 1.4, 0.8, 'F')
      const lines = doc.splitTextToSize(m.text, contentW - 8)
      doc.text(lines, MARGIN + 6, y)
      y += Math.max(6.5, lines.length * 5.4)
    })
    y += 6
  }

  // ====================== PROCESS TIMELINE ==============================
  newPage()
  sectionHeading(doc, t('pdf.theProcess'), y)
  y += 8
  setText(doc, PALETTE.soft)
  doc.setFont('times', 'italic')
  doc.setFontSize(11)
  doc.text(t('pdf.processIntro'), MARGIN, y + 2)
  y += 14

  const entries = [...project.entries]
  for (let idx = 0; idx < entries.length; idx++) {
    const entry = entries[idx]
    ensure(40)
    // timeline index + date
    setText(doc, PALETTE.gold)
    doc.setFont('times', 'normal')
    doc.setFontSize(22)
    doc.text(String(idx + 1).padStart(2, '0'), MARGIN, y)

    setText(doc, PALETTE.ink)
    doc.setFont('times', 'normal')
    doc.setFontSize(15)
    const titleLines = doc.splitTextToSize(entry.title, contentW - 18)
    doc.text(titleLines, MARGIN + 14, y - 1)
    let blockY = y + titleLines.length * 6

    if (entry.date) {
      setText(doc, PALETTE.faint)
      doc.setFont('times', 'italic')
      doc.setFontSize(10)
      doc.text(formatLongDate(entry.date), MARGIN + 14, blockY)
      blockY += 6
    }
    y = blockY + 2

    if (entry.description) {
      ensure(20)
      setText(doc, PALETTE.ink)
      doc.setFont('times', 'normal')
      doc.setFontSize(11)
      const dl = doc.splitTextToSize(entry.description, contentW)
      doc.text(dl, MARGIN, y)
      y += dl.length * 5.4 + 4
    }

    // photographs — large, stacked
    for (const img of entry.images) {
      ensure(80)
      const r = await drawFittedImage(doc, img.dataUrl, MARGIN, y, contentW, 110, { frame: true })
      y = r.y + r.h + 8
    }

    // artistic notes (optional)
    if (opts.includeNotes && entry.notes.length) {
      for (const note of entry.notes) {
        ensure(26)
        const noteText = note.text
        const label = note.category ? t(`note.${note.category}`) : t('pdf.atelierNote')
        const lines = doc.splitTextToSize(noteText, contentW - 16)
        const boxH = 10 + lines.length * 5
        setFill(doc, PALETTE.paperDeep)
        doc.rect(MARGIN, y, contentW, boxH, 'F')
        setFill(doc, PALETTE.gold)
        doc.rect(MARGIN, y, 1.6, boxH, 'F')
        setText(doc, PALETTE.accent)
        doc.setFont('times', 'italic')
        doc.setFontSize(9)
        doc.text(label.toUpperCase(), MARGIN + 6, y + 6)
        setText(doc, PALETTE.ink)
        doc.setFont('times', 'italic')
        doc.setFontSize(10.5)
        doc.text(lines, MARGIN + 6, y + 12)
        y += boxH + 6
      }
    }

    ensure(14)
    brushDivider(doc, MARGIN, y, contentW)
    y += 12
  }

  // ====================== COLOPHON ======================================
  ensure(60)
  y = Math.max(y, A4.h - 70)
  brushDivider(doc, A4.w / 2 - 25, y, 50, PALETTE.gold)
  y += 10
  setText(doc, PALETTE.soft)
  doc.setFont('times', 'italic')
  doc.setFontSize(11)
  doc.text(t('pdf.colophon1'), A4.w / 2, y, { align: 'center' })
  doc.text(t('pdf.colophon2'), A4.w / 2, y + 6, { align: 'center' })
  if (opts.artistName) {
    setText(doc, PALETTE.ink)
    doc.setFont('times', 'normal')
    doc.setFontSize(12)
    doc.text(opts.artistName, A4.w / 2, y + 18, { align: 'center' })
  }

  // page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i)
    setText(doc, PALETTE.faint)
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.text(`${i} / ${pageCount}`, A4.w / 2, A4.h - 12, { align: 'center' })
  }

  return doc
}

function sectionHeading(doc: jsPDF, text: string, y: number) {
  setText(doc, PALETTE.ink)
  doc.setFont('times', 'normal')
  doc.setFontSize(22)
  doc.text(text, MARGIN, y + 6)
  setDraw(doc, PALETTE.gold)
  doc.setLineWidth(0.6)
  doc.line(MARGIN, y + 9, MARGIN + 18, y + 9)
}

function caption(doc: jsPDF, text: string, x: number, y: number) {
  setText(doc, PALETTE.faint)
  doc.setFont('times', 'italic')
  doc.setFontSize(9)
  doc.text(text.toUpperCase(), x, y)
}
