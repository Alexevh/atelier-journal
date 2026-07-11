// In-browser analysis of a user-imported frame photograph: detect the frame's
// outer bounds against a uniform backdrop, crop to them, and locate the
// opening for 9-slice insets. Same algorithm used to prepare the bundled
// museum frames, ported to canvas.

export interface FrameAnalysis {
  /** Cropped frame image (JPEG data URL). */
  dataUrl: string
  insets: { l: number; t: number; r: number; b: number }
  /** False when the opening could not be detected and defaults were used. */
  openingDetected: boolean
}

const MAX_DIM = 1600
const OUTER_TH = 70 // colour distance from backdrop that counts as "frame"
const OPEN_TH = 55 // colour distance from the centre colour (backing board)
const DEFAULT_INSETS = { l: 0.12, t: 0.12, r: 0.12, b: 0.12 }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

type Px = { data: Uint8ClampedArray; w: number; h: number }

function dist(p: Px, x: number, y: number, r: number, g: number, b: number): number {
  const i = (y * p.w + x) * 4
  return (
    Math.abs(p.data[i] - r) + Math.abs(p.data[i + 1] - g) + Math.abs(p.data[i + 2] - b)
  )
}

/** Average colour of a small patch centred at (x,y). */
function patchAvg(p: Px, cx: number, cy: number, radius: number): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  let n = 0
  for (let y = cy - radius; y <= cy + radius; y += radius || 1) {
    for (let x = cx - radius; x <= cx + radius; x += radius || 1) {
      const xx = Math.min(p.w - 1, Math.max(0, x))
      const yy = Math.min(p.h - 1, Math.max(0, y))
      const i = (yy * p.w + xx) * 4
      r += p.data[i]
      g += p.data[i + 1]
      b += p.data[i + 2]
      n++
    }
  }
  return [r / n, g / n, b / n]
}

export async function analyzeFrameImage(sourceDataUrl: string): Promise<FrameAnalysis> {
  const img = await loadImage(sourceDataUrl)
  const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height))
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')
  ctx.drawImage(img, 0, 0, w, h)
  const px: Px = { data: ctx.getImageData(0, 0, w, h).data, w, h }

  // backdrop colour = average of the four near-corner patches
  const corners = [
    patchAvg(px, 6, 6, 3),
    patchAvg(px, w - 7, 6, 3),
    patchAvg(px, 6, h - 7, 3),
    patchAvg(px, w - 7, h - 7, 3),
  ]
  const bg = corners
    .reduce((a, c) => [a[0] + c[0], a[1] + c[1], a[2] + c[2]], [0, 0, 0])
    .map((v) => v / 4) as [number, number, number]

  const step = Math.max(3, Math.round(w / 200))
  const rowHit = (y: number) => {
    let hits = 0
    for (let x = 5; x < w - 5; x += step) {
      if (dist(px, x, y, bg[0], bg[1], bg[2]) > OUTER_TH && ++hits >= 12) return true
    }
    return false
  }
  const colHit = (x: number) => {
    let hits = 0
    for (let y = 5; y < h - 5; y += step) {
      if (dist(px, x, y, bg[0], bg[1], bg[2]) > OUTER_TH && ++hits >= 12) return true
    }
    return false
  }

  let top = 0
  while (top < h / 2 && !rowHit(top)) top += 2
  let bot = h - 1
  while (bot > h / 2 && !rowHit(bot)) bot -= 2
  let lef = 0
  while (lef < w / 2 && !colHit(lef)) lef += 2
  let rig = w - 1
  while (rig > w / 2 && !colHit(rig)) rig -= 2

  // if nothing was detected (image already tightly cropped), keep full bounds
  if (rig - lef < w * 0.3 || bot - top < h * 0.3) {
    lef = 0
    top = 0
    rig = w - 1
    bot = h - 1
  }
  const cw = rig - lef + 1
  const ch = bot - top + 1

  // opening detection: scan outward from the centre until the colour departs
  // from the centre (backing) colour — median of three parallel scan lines
  const cx = Math.round((lef + rig) / 2)
  const cy = Math.round((top + bot) / 2)
  const ctr = patchAvg(px, cx, cy, 8)

  const scanOut = (dx: number, dy: number): number => {
    const off = Math.round(Math.min(cw, ch) * 0.03)
    const crossings: number[] = []
    for (const k of [-1, 0, 1]) {
      let x = cx + (dx !== 0 ? 0 : k * off)
      let y = cy + (dy !== 0 ? 0 : k * off)
      let misses = 0
      while (x > lef && x < rig && y > top && y < bot) {
        if (dist(px, x, y, ctr[0], ctr[1], ctr[2]) > OPEN_TH) {
          if (++misses >= 5) break
        } else {
          misses = 0
        }
        x += dx
        y += dy
      }
      crossings.push(dx !== 0 ? x : y)
    }
    crossings.sort((a, b) => a - b)
    return crossings[1]
  }

  const oL = scanOut(-1, 0)
  const oR = scanOut(1, 0)
  const oT = scanOut(0, -1)
  const oB = scanOut(0, 1)

  const m = Math.round(Math.min(cw, ch) * 0.012)
  let insets = {
    l: (oL - lef - m) / cw,
    t: (oT - top - m) / ch,
    r: (rig - oR - m) / cw,
    b: (bot - oB - m) / ch,
  }
  // sanity: each border 1.5%–45% of the image, opening at least 20% wide
  const sane =
    [insets.l, insets.t, insets.r, insets.b].every((v) => v >= 0.015 && v <= 0.45) &&
    1 - insets.l - insets.r >= 0.2 &&
    1 - insets.t - insets.b >= 0.2
  const openingDetected = sane
  if (!sane) insets = { ...DEFAULT_INSETS }

  // crop + re-encode
  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  const octx = out.getContext('2d')
  if (!octx) throw new Error('Canvas not supported')
  octx.drawImage(canvas, lef, top, cw, ch, 0, 0, cw, ch)

  return {
    dataUrl: out.toDataURL('image/jpeg', 0.85),
    insets: {
      l: Math.round(insets.l * 1e4) / 1e4,
      t: Math.round(insets.t * 1e4) / 1e4,
      r: Math.round(insets.r * 1e4) / 1e4,
      b: Math.round(insets.b * 1e4) / 1e4,
    },
    openingDetected,
  }
}
