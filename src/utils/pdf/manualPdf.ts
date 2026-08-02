import { jsPDF } from 'jspdf'
import { Lang, translate } from '../../i18n'
import { getManual } from '../manual'
import { PALETTE, brushDivider, setDraw, setFill, setText } from './helpers'

const A4 = { w: 210, h: 297 }
const MARGIN = 22

/** Build the user manual as a paper-styled PDF in the given language. */
export async function exportManualPdf(lang: Lang): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const contentW = A4.w - MARGIN * 2
  const t = (k: string) => translate(k, undefined, lang)

  const paintPaper = () => {
    setFill(doc, PALETTE.paper)
    doc.rect(0, 0, A4.w, A4.h, 'F')
  }
  let y = MARGIN
  const newPage = () => {
    doc.addPage()
    paintPaper()
    y = MARGIN
  }
  const ensure = (needed: number) => {
    if (y + needed > A4.h - 20) newPage()
  }

  // ---- cover ----------------------------------------------------------------
  paintPaper()
  setDraw(doc, PALETTE.line)
  doc.setLineWidth(0.4)
  doc.rect(12, 12, A4.w - 24, A4.h - 24)
  setText(doc, PALETTE.faint)
  doc.setFont('times', 'italic')
  doc.setFontSize(12)
  doc.text('A T E L I E R', A4.w / 2, 80, { align: 'center' })
  brushDivider(doc, A4.w / 2 - 30, 88, 60, PALETTE.gold)
  setText(doc, PALETTE.ink)
  doc.setFont('times', 'normal')
  doc.setFontSize(34)
  doc.text(t('help.pdfTitle'), A4.w / 2, 110, { align: 'center' })
  setText(doc, PALETTE.soft)
  doc.setFont('times', 'italic')
  doc.setFontSize(13)
  doc.text(t('help.pdfSubtitle'), A4.w / 2, 122, { align: 'center' })

  // ---- sections ---------------------------------------------------------------
  newPage()
  const sections = getManual(lang)
  sections.forEach((section, idx) => {
    ensure(30)
    setText(doc, PALETTE.gold)
    doc.setFont('times', 'normal')
    doc.setFontSize(13)
    doc.text(String(idx + 1).padStart(2, '0'), MARGIN, y)
    setText(doc, PALETTE.ink)
    doc.setFontSize(17)
    const titleLines = doc.splitTextToSize(section.title, contentW - 12)
    doc.text(titleLines, MARGIN + 11, y)
    y += titleLines.length * 7 + 2
    setDraw(doc, PALETTE.gold)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, y, MARGIN + 16, y)
    y += 6

    setText(doc, PALETTE.ink)
    doc.setFont('times', 'normal')
    doc.setFontSize(10.5)
    section.body.forEach((para) => {
      const lines = doc.splitTextToSize(para, contentW)
      ensure(lines.length * 5 + 4)
      doc.text(lines, MARGIN, y)
      y += lines.length * 5 + 3.5
    })
    y += 6
  })

  // page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i)
    setText(doc, PALETTE.faint)
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.text(`${i - 1} / ${pageCount - 1}`, A4.w / 2, A4.h - 12, { align: 'center' })
  }

  doc.save(lang === 'es' ? 'atelier-manual.pdf' : 'atelier-manual-en.pdf')
}
