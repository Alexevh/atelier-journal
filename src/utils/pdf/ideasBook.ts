import { jsPDF } from 'jspdf'
import { Idea, StoredImage } from '../../types'
import { Lang, translate } from '../../i18n'
import { formatLongDate } from '../date'
import {
  PALETTE,
  brushDivider,
  drawFittedImage,
  fitInBox,
  setDraw,
  setFill,
  setText,
} from './helpers'

const A4 = { w: 210, h: 297 }
const MARGIN = 20
const BOTTOM = A4.h - 18

/**
 * Export the whole idea notebook as a warm, readable PDF: a cover, then every
 * idea with its note, tags, images and dated development entries. Ideas are
 * ordered oldest-first so it reads like a growing journal.
 */
export async function exportIdeasBookPdf(ideas: Idea[], lang: Lang): Promise<void> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const contentW = A4.w - MARGIN * 2
  const t = (k: string, p?: Record<string, string | number>) => translate(k, p, lang)

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
    if (y + needed > BOTTOM) newPage()
  }

  const paragraph = (
    text: string,
    size = 10.5,
    hex: string = PALETTE.ink,
    font: 'normal' | 'italic' = 'normal',
    indent = 0,
  ) => {
    if (!text.trim()) return
    setText(doc, hex)
    doc.setFont('times', font)
    doc.setFontSize(size)
    const lines = doc.splitTextToSize(text, contentW - indent)
    lines.forEach((line: string) => {
      ensure(size * 0.52)
      doc.text(line, MARGIN + indent, y)
      y += size * 0.52
    })
    y += 2
  }

  // An image grid that never splits a row across a page break.
  const drawImageGrid = async (images: StoredImage[], small = false) => {
    const pics = images.filter((im) => im.dataUrl)
    if (!pics.length) return
    const cols = small ? 3 : pics.length === 1 ? 1 : 2
    const gap = 4
    const cellW = (contentW - gap * (cols - 1)) / cols
    const cellH = small ? 40 : 62
    for (let i = 0; i < pics.length; i += cols) {
      const row = pics.slice(i, i + cols)
      const heights = await Promise.all(
        row.map((im) => fitInBox(im.dataUrl, cellW, cellH).then((r) => r.h)),
      )
      const rowH = Math.max(...heights)
      ensure(rowH + gap)
      for (let c = 0; c < row.length; c++) {
        await drawFittedImage(doc, row[c].dataUrl, MARGIN + c * (cellW + gap), y, cellW, rowH, {
          frame: true,
        })
      }
      y += rowH + gap
    }
    y += 2
  }

  const ordered = [...ideas].sort((a, b) => a.createdAt - b.createdAt)

  // ---- cover ----------------------------------------------------------------
  paintPaper()
  setDraw(doc, PALETTE.line)
  doc.setLineWidth(0.4)
  doc.rect(12, 12, A4.w - 24, A4.h - 24)
  setText(doc, PALETTE.faint)
  doc.setFont('times', 'italic')
  doc.setFontSize(12)
  doc.text('A T E L I E R', A4.w / 2, 96, { align: 'center' })
  brushDivider(doc, A4.w / 2 - 30, 104, 60, PALETTE.gold)
  setText(doc, PALETTE.ink)
  doc.setFont('times', 'normal')
  doc.setFontSize(34)
  doc.text(t('ideasPdf.title'), A4.w / 2, 128, { align: 'center' })
  setText(doc, PALETTE.soft)
  doc.setFont('times', 'italic')
  doc.setFontSize(13)
  doc.text(t('ideasPdf.subtitle'), A4.w / 2, 140, { align: 'center' })
  setText(doc, PALETTE.faint)
  doc.setFont('times', 'normal')
  doc.setFontSize(11)
  doc.text(
    `${t('ideasPdf.count', { n: ordered.length })} · ${formatLongDate(
      new Date().toISOString().slice(0, 10),
    )}`,
    A4.w / 2,
    154,
    { align: 'center' },
  )

  if (ordered.length === 0) {
    newPage()
    setText(doc, PALETTE.soft)
    doc.setFont('times', 'italic')
    doc.setFontSize(13)
    doc.text(t('ideasPdf.empty'), A4.w / 2, 60, { align: 'center' })
    doc.save('cuaderno-de-ideas.pdf')
    return
  }

  newPage()

  let n = 0
  for (const idea of ordered) {
    n++
    // separate ideas with a brushstroke, keeping the header block together
    if (y > MARGIN + 2) {
      ensure(34)
      brushDivider(doc, MARGIN, y, contentW, PALETTE.line)
      y += 10
    }
    ensure(30)

    // number + title
    setText(doc, PALETTE.gold)
    doc.setFont('times', 'normal')
    doc.setFontSize(12)
    doc.text(String(n).padStart(2, '0'), MARGIN, y)
    setText(doc, PALETTE.ink)
    doc.setFontSize(20)
    const titleLines = doc.splitTextToSize(idea.title || t('ideas.untitled'), contentW - 12)
    doc.text(titleLines, MARGIN + 11, y)
    y += titleLines.length * 8 + 1

    // status + created date
    setText(doc, PALETTE.soft)
    doc.setFont('times', 'italic')
    doc.setFontSize(9.5)
    doc.text(
      `${t(`idea.status.${idea.status}`)} · ${t('ideas.created', {
        date: formatLongDate(new Date(idea.createdAt).toISOString().slice(0, 10)),
      })}`,
      MARGIN + 11,
      y,
    )
    y += 5
    setDraw(doc, PALETTE.gold)
    doc.setLineWidth(0.5)
    doc.line(MARGIN, y, MARGIN + 16, y)
    y += 6

    paragraph(idea.note)
    if (idea.tags.length) {
      paragraph(idea.tags.map((tg) => `#${tg}`).join('   '), 9.5, PALETTE.faint, 'italic')
    }
    await drawImageGrid(idea.images)

    // dated development entries — the idea maturing over time
    const entries = [...(idea.entries ?? [])]
      .filter((e) => e.text.trim() || e.images.length)
      .sort((a, b) => a.date.localeCompare(b.date))
    if (entries.length) {
      ensure(10)
      y += 1
      setText(doc, PALETTE.accent)
      doc.setFont('times', 'italic')
      doc.setFontSize(11)
      doc.text(t('ideas.timeline'), MARGIN, y)
      y += 6
      for (const entry of entries) {
        ensure(10)
        setText(doc, PALETTE.gold)
        doc.setFont('times', 'normal')
        doc.setFontSize(9.5)
        doc.text(`— ${formatLongDate(entry.date)}`, MARGIN, y)
        y += 5
        paragraph(entry.text, 10, PALETTE.ink, 'normal', 4)
        await drawImageGrid(entry.images, true)
      }
    }
  }

  // page numbers (skip the cover)
  const pageCount = doc.getNumberOfPages()
  for (let i = 2; i <= pageCount; i++) {
    doc.setPage(i)
    setText(doc, PALETTE.faint)
    doc.setFont('times', 'normal')
    doc.setFontSize(9)
    doc.text(`${i - 1} / ${pageCount - 1}`, A4.w / 2, A4.h - 10, { align: 'center' })
  }

  doc.save('cuaderno-de-ideas.pdf')
}
