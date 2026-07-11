import { jsPDF } from 'jspdf'
import { getImageSize } from '../image'

// Warm monograph palette, mirrored from the on-screen design.
export const PALETTE = {
  ink: '#2b2620',
  soft: '#6b5d4f',
  faint: '#9a8b78',
  line: '#cdbfa8',
  paper: '#f6f1e6',
  paperDeep: '#efe7d6',
  gold: '#b8893b',
  accent: '#9c4a2f',
}

export function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ]
}

export function setFill(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  doc.setFillColor(r, g, b)
}
export function setText(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  doc.setTextColor(r, g, b)
}
export function setDraw(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex)
  doc.setDrawColor(r, g, b)
}

export function imageFormat(dataUrl: string): 'JPEG' | 'PNG' {
  return dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
}

interface FitResult {
  w: number
  h: number
}

/** Compute draw dimensions for an image fit inside a box, preserving ratio. */
export async function fitInBox(
  dataUrl: string,
  boxW: number,
  boxH: number,
): Promise<FitResult> {
  const { width, height } = await getImageSize(dataUrl)
  const ratio = width / height
  let w = boxW
  let h = w / ratio
  if (h > boxH) {
    h = boxH
    w = h * ratio
  }
  return { w, h }
}

/**
 * Draw an image centered within a box at (x,y,boxW,boxH). Returns the
 * rendered rectangle so callers can position captions beneath it.
 */
export async function drawFittedImage(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  boxW: number,
  boxH: number,
  opts: { frame?: boolean } = {},
): Promise<{ x: number; y: number; w: number; h: number }> {
  const { w, h } = await fitInBox(dataUrl, boxW, boxH)
  const dx = x + (boxW - w) / 2
  const dy = y + (boxH - h) / 2
  if (opts.frame) {
    setFill(doc, '#ffffff')
    doc.rect(dx - 1.5, dy - 1.5, w + 3, h + 3, 'F')
    setDraw(doc, PALETTE.line)
    doc.setLineWidth(0.3)
    doc.rect(dx - 1.5, dy - 1.5, w + 3, h + 3, 'S')
  }
  doc.addImage(dataUrl, imageFormat(dataUrl), dx, dy, w, h, undefined, 'FAST')
  return { x: dx, y: dy, w, h }
}

/** A delicate hand-drawn-feel brushstroke divider. */
export function brushDivider(doc: jsPDF, x: number, y: number, width: number, hex = PALETTE.line) {
  setDraw(doc, hex)
  doc.setLineWidth(0.5)
  const segments = 26
  const step = width / segments
  doc.lines(
    Array.from({ length: segments }, (_, i) => {
      const dy = Math.sin((i / segments) * Math.PI) * 0.6 - 0.3
      return [step, dy]
    }),
    x,
    y,
  )
}

export function drawCenteredText(
  doc: jsPDF,
  text: string,
  centerX: number,
  y: number,
) {
  doc.text(text, centerX, y, { align: 'center' })
}

/** Diagonal repeating watermark across the whole page. */
export function drawWatermark(doc: jsPDF, text: string, pageW: number, pageH: number) {
  if (!text.trim()) return
  const gs = (doc as unknown as { GState: new (o: object) => unknown }).GState
  const setGState = (doc as unknown as { setGState?: (s: unknown) => void }).setGState
  if (gs && setGState) setGState.call(doc, new gs({ opacity: 0.07 }))
  setText(doc, PALETTE.ink)
  doc.setFont('times', 'italic')
  doc.setFontSize(26)
  for (let yy = 20; yy < pageH; yy += 55) {
    for (let xx = -10; xx < pageW; xx += 90) {
      doc.text(text, xx, yy, { angle: 30 })
    }
  }
  if (gs && setGState) setGState.call(doc, new gs({ opacity: 1 }))
}

// Re-export the locale-aware date formatter so PDFs honour the active language.
export { formatLongDate } from '../date'
