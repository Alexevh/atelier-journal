// Real, photographic picture frames rendered around the artwork via 9-slice.
//
// The frame photos are CC0 (public domain) photographs of antique frames from
// the Rijksmuseum collection, obtained through Wikimedia Commons. They are
// bundled with the app (no network needed) and adapted to any artwork aspect
// ratio by keeping the corners rigid and stretching the four edges.

export interface PhotoFrame {
  id: string
  nameKey: string
  /** File name under public/frames/. */
  file: string
  /**
   * Opening insets as fractions of the (already cropped) frame image size:
   * the artwork opening spans from (l*W, t*H) to ((1-r)*W, (1-b)*H).
   * Slightly conservative (inside the moulding) so no backdrop ever shows.
   */
  insets: { l: number; t: number; r: number; b: number }
  /** Desired moulding width relative to the artwork's smaller dimension. */
  scale?: number
}

// Insets were measured per photograph by pixel analysis against the studio
// backdrop (opening pulled ~1.2% into the moulding so no backdrop can show).
// Sources: Rijksmuseum objects RP-L-513/514/515/517/525/534, photographs CC0
// via Wikimedia Commons.
export const PHOTO_FRAMES: PhotoFrame[] = [
  {
    id: 'real-513',
    nameKey: 'frame.r.carvedGold',
    file: 'rp-l-513.jpg',
    insets: { l: 0.0451, t: 0.0532, r: 0.0512, b: 0.0631 },
    scale: 0.07,
  },
  {
    id: 'real-514',
    nameKey: 'frame.r.dutchCarved',
    file: 'rp-l-514.jpg',
    insets: { l: 0.0975, t: 0.1278, r: 0.1191, b: 0.1499 },
    scale: 0.16,
  },
  {
    id: 'real-515',
    nameKey: 'frame.r.frenchSalon',
    file: 'rp-l-515.jpg',
    insets: { l: 0.1964, t: 0.219, r: 0.1823, b: 0.209 },
    scale: 0.2,
  },
  {
    id: 'real-517',
    nameKey: 'frame.r.silverLinen',
    file: 'rp-l-517.jpg',
    insets: { l: 0.1529, t: 0.2027, r: 0.1892, b: 0.2372 },
    scale: 0.2,
  },
  {
    id: 'real-525',
    nameKey: 'frame.r.artNouveau',
    file: 'rp-l-525.jpg',
    insets: { l: 0.0922, t: 0.1196, r: 0.117, b: 0.1799 },
    scale: 0.13,
  },
  {
    id: 'real-534',
    nameKey: 'frame.r.mahogany',
    file: 'rp-l-534.jpg',
    insets: { l: 0.0211, t: 0.0357, r: 0.0282, b: 0.0446 },
    scale: 0.045,
  },
  {
    id: 'real-530',
    nameKey: 'frame.r.agedGilt',
    file: 'rp-l-530.jpg',
    insets: { l: 0.0545, t: 0.0662, r: 0.074, b: 0.0764 },
    scale: 0.075,
  },
  {
    id: 'real-579',
    nameKey: 'frame.r.oakGold',
    file: 'rp-l-579.jpg',
    insets: { l: 0.146, t: 0.118, r: 0.144, b: 0.12 },
    scale: 0.15,
  },
  {
    id: 'real-580',
    nameKey: 'frame.r.beech',
    file: 'rp-l-580.jpg',
    insets: { l: 0.03, t: 0.026, r: 0.028, b: 0.026 },
    scale: 0.035,
  },
]

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`Could not load ${src}`))
    img.src = src
  })
}

const frameCache = new Map<string, Promise<HTMLImageElement>>()

export function frameAssetUrl(file: string): string {
  return `${import.meta.env.BASE_URL}frames/${file}`
}

function getFrameImage(frame: PhotoFrame): Promise<HTMLImageElement> {
  let p = frameCache.get(frame.id)
  if (!p) {
    p = loadImage(frameAssetUrl(frame.file))
    frameCache.set(frame.id, p)
  }
  return p
}

export interface PhotoFrameOptions {
  mat?: { width: number; color: string }
}

function shade(hex: string, factor: number): string {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor))
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor))
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor))
  return `rgb(${r},${g},${b})`
}

/**
 * Render the artwork inside a photographic frame using 9-slice scaling:
 * corners keep their natural proportions, edges stretch to fit.
 */
export async function renderPhotoFramedImage(
  imageDataUrl: string,
  frame: PhotoFrame,
  opts: PhotoFrameOptions = {},
): Promise<HTMLCanvasElement> {
  const [art, fr] = await Promise.all([loadImage(imageDataUrl), getFrameImage(frame)])

  // ---- inner composite: artwork, optionally on a mat -----------------------
  let inner: HTMLCanvasElement | HTMLImageElement = art
  let innerW = art.width
  let innerH = art.height
  if (opts.mat) {
    const matW = Math.max(12, Math.round(Math.min(art.width, art.height) * opts.mat.width))
    const c = document.createElement('canvas')
    c.width = art.width + 2 * matW
    c.height = art.height + 2 * matW
    const mctx = c.getContext('2d')!
    mctx.fillStyle = opts.mat.color
    mctx.fillRect(0, 0, c.width, c.height)
    const bevel = Math.max(3, Math.round(matW * 0.06))
    mctx.fillStyle = shade(opts.mat.color, 0.75)
    mctx.fillRect(matW - bevel, matW - bevel, art.width + 2 * bevel, art.height + 2 * bevel)
    mctx.fillStyle = '#ffffff'
    mctx.fillRect(
      matW - Math.ceil(bevel / 2),
      matW - Math.ceil(bevel / 2),
      art.width + bevel,
      art.height + bevel,
    )
    mctx.drawImage(art, matW, matW)
    inner = c
    innerW = c.width
    innerH = c.height
  }

  // ---- source geometry ------------------------------------------------------
  const FW = fr.width
  const FH = fr.height
  const L = frame.insets.l * FW
  const T = frame.insets.t * FH
  const R = frame.insets.r * FW
  const B = frame.insets.b * FH

  // uniform moulding scale relative to the artwork
  const targetBorder = Math.min(innerW, innerH) * (frame.scale ?? 0.1)
  const s = targetBorder / ((L + T + R + B) / 4)
  const sL = L * s
  const sT = T * s
  const sR = R * s
  const sB = B * s

  const W = Math.round(innerW + sL + sR)
  const H = Math.round(innerH + sT + sB)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  // white underlay + artwork (transparent PNGs must not export black)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(sL, sT, innerW, innerH)
  ctx.drawImage(inner, sL, sT)

  // gentle shadow cast by the frame onto the artwork/mat
  const sh = Math.max(5, targetBorder * 0.14)
  const grad = ctx.createLinearGradient(0, sT, 0, sT + sh)
  grad.addColorStop(0, 'rgba(0,0,0,0.25)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(sL, sT, innerW, sh)

  // ---- 9-slice moulding -------------------------------------------------------
  const midSW = FW - L - R // source middle width
  const midSH = FH - T - B // source middle height
  const midDW = W - sL - sR // dest middle width
  const midDH = H - sT - sB // dest middle height

  // corners
  ctx.drawImage(fr, 0, 0, L, T, 0, 0, sL, sT)
  ctx.drawImage(fr, FW - R, 0, R, T, W - sR, 0, sR, sT)
  ctx.drawImage(fr, 0, FH - B, L, B, 0, H - sB, sL, sB)
  ctx.drawImage(fr, FW - R, FH - B, R, B, W - sR, H - sB, sR, sB)
  // edges
  ctx.drawImage(fr, L, 0, midSW, T, sL, 0, midDW, sT)
  ctx.drawImage(fr, L, FH - B, midSW, B, sL, H - sB, midDW, sB)
  ctx.drawImage(fr, 0, T, L, midSH, 0, sT, sL, midDH)
  ctx.drawImage(fr, FW - R, T, R, midSH, W - sR, sT, sR, midDH)

  return canvas
}
