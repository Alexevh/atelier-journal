// Procedural picture-frame renderer.
//
// Frames are drawn entirely on a canvas — moulding bands with mitred 45°
// corners, per-side lighting, wood grain / gilt / linen textures, optional
// mat (paspartout) and corner ornaments. No external assets: nothing to
// license, nothing to download, works fully offline.

export type BandTexture = 'flat' | 'wood' | 'gold' | 'linen'

export interface FrameBand {
  /** Relative share of the total frame width (normalised across bands). */
  width: number
  color: string
  texture: BandTexture
  /** Rounded-profile shading: 'convex' bulges out, 'concave' dips in. */
  profile?: 'convex' | 'concave' | 'flat'
}

export interface MatSpec {
  /** Mat width as a fraction of the image's smaller dimension. */
  width: number
  color: string
}

export interface FrameSpec {
  /** Frame width as a fraction of the image's smaller dimension. */
  scale: number
  bands: FrameBand[]
  mat?: MatSpec
  /** Draw simple corner rosettes (for ornate gilt frames). */
  ornaments?: boolean
}

export interface FramePreset {
  id: string
  nameKey: string // i18n key
  spec: FrameSpec
}

// ---- shared colour palette (mat + frame recolouring) -----------------------

export interface ColorOption {
  id: string
  hex: string
}

export const FRAME_COLORS: ColorOption[] = [
  { id: 'white', hex: '#f6f4ef' },
  { id: 'cream', hex: '#f0e8d2' },
  { id: 'black', hex: '#1c1a17' },
  { id: 'gray', hex: '#b4afa4' },
  { id: 'pink', hex: '#e6a6c1' },
  { id: 'blue', hex: '#a7cee6' },
  { id: 'violet', hex: '#b3a0d6' },
  { id: 'red', hex: '#b23a30' },
  { id: 'green', hex: '#7c9e68' },
  { id: 'brown', hex: '#75522f' },
  { id: 'gold', hex: '#c6a24c' },
  { id: 'navy', hex: '#37506e' },
]

export function colorHex(id: string): string {
  return FRAME_COLORS.find((c) => c.id === id)?.hex ?? '#f0e8d2'
}

export type SizeStep = 'small' | 'medium' | 'large'
export const MAT_WIDTHS: Record<SizeStep, number> = { small: 0.04, medium: 0.075, large: 0.12 }
export const FRAME_MULTIPLIERS: Record<SizeStep, number> = { small: 0.62, medium: 1, large: 1.55 }

function hx(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]
}
function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}
function relLum([r, g, b]: [number, number, number]): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
/** A shade of baseHex at the given target luminance (preserves hue). */
function tintTo(baseHex: string, targetLum: number): string {
  const [r, g, b] = hx(baseHex)
  const bl = relLum([r, g, b]) || 0.001
  if (targetLum >= bl) {
    const t = (targetLum - bl) / (1 - bl || 1)
    return toHex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t)
  }
  const t = targetLum / bl
  return toHex(r * t, g * t, b * t)
}

/**
 * Recolour a frame spec to shades of a single hue, preserving each band's
 * relative lightness (so the profile shading survives). Gilt/gold textures
 * become flat so the colour reads cleanly.
 */
export function recolorSpec(spec: FrameSpec, baseHex: string): FrameSpec {
  return {
    ...spec,
    bands: spec.bands.map((band) => ({
      ...band,
      color: tintTo(baseHex, relLum(hx(band.color))),
      texture: band.texture === 'gold' ? 'flat' : band.texture,
    })),
  }
}

// ---- presets ---------------------------------------------------------------

export const FRAME_PRESETS: FramePreset[] = [
  {
    id: 'gold-classic',
    nameKey: 'frame.p.goldClassic',
    spec: {
      scale: 0.085,
      bands: [
        { width: 0.18, color: '#8a6a2f', texture: 'gold', profile: 'flat' },
        { width: 0.5, color: '#c9a24b', texture: 'gold', profile: 'convex' },
        { width: 0.14, color: '#7a5c26', texture: 'gold', profile: 'concave' },
        { width: 0.18, color: '#d9b768', texture: 'gold', profile: 'convex' },
      ],
    },
  },
  {
    id: 'baroque',
    nameKey: 'frame.p.baroque',
    spec: {
      scale: 0.12,
      ornaments: true,
      bands: [
        { width: 0.14, color: '#6e5220', texture: 'gold', profile: 'flat' },
        { width: 0.42, color: '#c39b3e', texture: 'gold', profile: 'convex' },
        { width: 0.1, color: '#5c451d', texture: 'gold', profile: 'concave' },
        { width: 0.22, color: '#d4af5c', texture: 'gold', profile: 'convex' },
        { width: 0.12, color: '#8a6a2f', texture: 'gold', profile: 'concave' },
      ],
    },
  },
  {
    id: 'walnut',
    nameKey: 'frame.p.walnut',
    spec: {
      scale: 0.075,
      bands: [
        { width: 0.7, color: '#4a3222', texture: 'wood', profile: 'convex' },
        { width: 0.12, color: '#2e1f15', texture: 'flat', profile: 'concave' },
        { width: 0.18, color: '#c9a24b', texture: 'gold', profile: 'convex' },
      ],
    },
  },
  {
    id: 'oak',
    nameKey: 'frame.p.oak',
    spec: {
      scale: 0.08,
      bands: [
        { width: 0.15, color: '#7c5b38', texture: 'flat', profile: 'flat' },
        { width: 0.7, color: '#a0794c', texture: 'wood', profile: 'convex' },
        { width: 0.15, color: '#6b4d2e', texture: 'flat', profile: 'concave' },
      ],
    },
  },
  {
    id: 'gallery-white',
    nameKey: 'frame.p.galleryWhite',
    spec: {
      scale: 0.06,
      bands: [
        { width: 0.85, color: '#f2efe8', texture: 'flat', profile: 'flat' },
        { width: 0.15, color: '#d9d4c8', texture: 'flat', profile: 'concave' },
      ],
      mat: { width: 0.07, color: '#faf7f0' },
    },
  },
  {
    id: 'museum-black',
    nameKey: 'frame.p.museumBlack',
    spec: {
      scale: 0.07,
      bands: [
        { width: 0.75, color: '#211d1a', texture: 'flat', profile: 'convex' },
        { width: 0.1, color: '#0f0d0b', texture: 'flat', profile: 'concave' },
        { width: 0.15, color: '#b9964a', texture: 'gold', profile: 'convex' },
      ],
    },
  },
  {
    id: 'silver',
    nameKey: 'frame.p.silver',
    spec: {
      scale: 0.08,
      bands: [
        { width: 0.2, color: '#6f7276', texture: 'gold', profile: 'flat' },
        { width: 0.55, color: '#b9bcc0', texture: 'gold', profile: 'convex' },
        { width: 0.25, color: '#84878b', texture: 'gold', profile: 'concave' },
      ],
    },
  },
  // ---- modern gallery styles (thin moulding + mat, like framed prints) -----
  {
    id: 'black-mat',
    nameKey: 'frame.p.blackMat',
    spec: {
      scale: 0.04,
      bands: [
        { width: 0.85, color: '#211d1a', texture: 'flat', profile: 'convex' },
        { width: 0.15, color: '#0f0d0b', texture: 'flat', profile: 'concave' },
      ],
      mat: { width: 0.085, color: '#fbf9f4' },
    },
  },
  {
    id: 'gold-mat',
    nameKey: 'frame.p.goldMat',
    spec: {
      scale: 0.04,
      bands: [
        { width: 0.8, color: '#c9a24b', texture: 'gold', profile: 'convex' },
        { width: 0.2, color: '#8a6a2f', texture: 'flat', profile: 'concave' },
      ],
      mat: { width: 0.085, color: '#faf6ec' },
    },
  },
  {
    id: 'white-mat',
    nameKey: 'frame.p.whiteMat',
    spec: {
      scale: 0.04,
      bands: [
        { width: 0.85, color: '#f4f2ec', texture: 'flat', profile: 'convex' },
        { width: 0.15, color: '#d8d4ca', texture: 'flat', profile: 'concave' },
      ],
      mat: { width: 0.085, color: '#ffffff' },
    },
  },
  {
    id: 'walnut-mat',
    nameKey: 'frame.p.walnutMat',
    spec: {
      scale: 0.04,
      bands: [
        { width: 0.85, color: '#5a4030', texture: 'wood', profile: 'convex' },
        { width: 0.15, color: '#38291d', texture: 'flat', profile: 'concave' },
      ],
      mat: { width: 0.085, color: '#fbf8f0' },
    },
  },
  // ---- modern styles -------------------------------------------------------
  {
    id: 'float-oak',
    nameKey: 'frame.p.floatOak',
    spec: {
      scale: 0.05,
      bands: [
        { width: 0.62, color: '#b18a58', texture: 'wood', profile: 'flat' },
        { width: 0.38, color: '#14110e', texture: 'flat', profile: 'concave' },
      ],
    },
  },
  {
    id: 'metal-black',
    nameKey: 'frame.p.metalBlack',
    spec: {
      scale: 0.035,
      bands: [
        { width: 0.85, color: '#1b1917', texture: 'flat', profile: 'convex' },
        { width: 0.15, color: '#3d3a36', texture: 'flat', profile: 'concave' },
      ],
    },
  },
  {
    id: 'aluminum',
    nameKey: 'frame.p.aluminum',
    spec: {
      scale: 0.035,
      bands: [
        { width: 0.8, color: '#b4b7bb', texture: 'gold', profile: 'convex' },
        { width: 0.2, color: '#83868a', texture: 'flat', profile: 'concave' },
      ],
    },
  },
  {
    id: 'scandi-oak',
    nameKey: 'frame.p.scandiOak',
    spec: {
      scale: 0.055,
      bands: [{ width: 1, color: '#cfa87a', texture: 'wood', profile: 'flat' }],
      mat: { width: 0.07, color: '#fbf9f4' },
    },
  },
  {
    id: 'walnut-modern',
    nameKey: 'frame.p.walnutModern',
    spec: {
      scale: 0.05,
      bands: [
        { width: 0.88, color: '#5a4030', texture: 'wood', profile: 'flat' },
        { width: 0.12, color: '#38291d', texture: 'flat', profile: 'concave' },
      ],
    },
  },
  {
    id: 'linen-cream',
    nameKey: 'frame.p.linen',
    spec: {
      scale: 0.09,
      bands: [
        { width: 0.16, color: '#8a7654', texture: 'flat', profile: 'flat' },
        { width: 0.62, color: '#e4dcc8', texture: 'linen', profile: 'flat' },
        { width: 0.22, color: '#b39a5f', texture: 'gold', profile: 'convex' },
      ],
      mat: { width: 0.05, color: '#f6f2e7' },
    },
  },
]

// ---- random frames ---------------------------------------------------------

const RANDOM_PALETTES: { colors: string[]; texture: BandTexture }[] = [
  { colors: ['#8a6a2f', '#c9a24b', '#d9b768', '#7a5c26', '#b98e3a'], texture: 'gold' }, // golds
  { colors: ['#6f7276', '#b9bcc0', '#84878b', '#d5d8db', '#5c5f63'], texture: 'gold' }, // silvers
  { colors: ['#4a3222', '#6b4a2e', '#8a6440', '#3a2818', '#5c4028'], texture: 'wood' }, // dark woods
  { colors: ['#a0794c', '#b98f5e', '#8a6440', '#c6a274', '#7c5b38'], texture: 'wood' }, // light woods
  { colors: ['#211d1a', '#39332e', '#0f0d0b', '#4a443e', '#2b2620'], texture: 'flat' }, // blacks
  { colors: ['#f2efe8', '#e6e1d5', '#d9d4c8', '#faf7f0', '#cfc9ba'], texture: 'flat' }, // whites
  { colors: ['#5c1f1a', '#7a2a22', '#8f3a2c', '#4a1712', '#6e2820'], texture: 'flat' }, // red lacquer
  { colors: ['#1f3a34', '#2b4c44', '#16302a', '#3a5e54', '#254038'], texture: 'flat' }, // deep green
]

const MAT_COLORS = ['#faf7f0', '#f3ecdd', '#efe7d6', '#e8e4da', '#f0e8dc']

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

/** Roll a brand-new random frame spec from curated palettes. */
export function randomFrameSpec(): FrameSpec {
  const palette = pick(RANDOM_PALETTES)
  const bandCount = 2 + Math.floor(Math.random() * 3) // 2..4
  const profiles: FrameBand['profile'][] = ['convex', 'concave', 'flat']
  const bands: FrameBand[] = Array.from({ length: bandCount }, (_, i) => ({
    width: rand(0.15, i === Math.floor(bandCount / 2) ? 0.6 : 0.3),
    color: pick(palette.colors),
    texture: palette.texture === 'flat' && Math.random() < 0.25 ? 'linen' : palette.texture,
    profile: pick(profiles),
  }))
  // occasionally add a contrasting gilt inner lip
  if (palette.texture !== 'gold' && Math.random() < 0.5) {
    bands.push({ width: 0.15, color: '#c9a24b', texture: 'gold', profile: 'convex' })
  }
  const spec: FrameSpec = {
    scale: rand(0.06, 0.13),
    bands,
    ornaments: palette.texture === 'gold' && Math.random() < 0.35,
  }
  if (Math.random() < 0.45) {
    spec.mat = { width: rand(0.04, 0.09), color: pick(MAT_COLORS) }
  }
  return spec
}

// ---- rendering -------------------------------------------------------------

type Side = 'top' | 'right' | 'bottom' | 'left'
const SIDES: Side[] = ['top', 'right', 'bottom', 'left']

// classic frame lighting: light falls from the top-left
const SIDE_LIGHT: Record<Side, number> = { top: 1.16, left: 1.05, right: 0.94, bottom: 0.8 }

function shade(hex: string, factor: number): string {
  const r = Math.min(255, Math.round(parseInt(hex.slice(1, 3), 16) * factor))
  const g = Math.min(255, Math.round(parseInt(hex.slice(3, 5), 16) * factor))
  const b = Math.min(255, Math.round(parseInt(hex.slice(5, 7), 16) * factor))
  return `rgb(${r},${g},${b})`
}

/** Trapezoid path for one band on one side of the frame (mitred corners). */
function bandPath(
  ctx: CanvasRenderingContext2D,
  side: Side,
  W: number,
  H: number,
  a: number, // outer offset of the band
  b: number, // inner offset of the band
) {
  ctx.beginPath()
  if (side === 'top') {
    ctx.moveTo(a, a)
    ctx.lineTo(W - a, a)
    ctx.lineTo(W - b, b)
    ctx.lineTo(b, b)
  } else if (side === 'bottom') {
    ctx.moveTo(a, H - a)
    ctx.lineTo(W - a, H - a)
    ctx.lineTo(W - b, H - b)
    ctx.lineTo(b, H - b)
  } else if (side === 'left') {
    ctx.moveTo(a, a)
    ctx.lineTo(b, b)
    ctx.lineTo(b, H - b)
    ctx.lineTo(a, H - a)
  } else {
    ctx.moveTo(W - a, a)
    ctx.lineTo(W - b, b)
    ctx.lineTo(W - b, H - b)
    ctx.lineTo(W - a, H - a)
  }
  ctx.closePath()
}

/** Linear gradient across a band, perpendicular to its side. */
function bandGradient(
  ctx: CanvasRenderingContext2D,
  side: Side,
  W: number,
  H: number,
  a: number,
  b: number,
): CanvasGradient {
  if (side === 'top') return ctx.createLinearGradient(0, a, 0, b)
  if (side === 'bottom') return ctx.createLinearGradient(0, H - a, 0, H - b)
  if (side === 'left') return ctx.createLinearGradient(a, 0, b, 0)
  return ctx.createLinearGradient(W - a, 0, W - b, 0)
}

function profileStops(g: CanvasGradient, color: string, light: number, profile: FrameBand['profile']) {
  const base = shade(color, light)
  const hi = shade(color, light * 1.28)
  const lo = shade(color, light * 0.62)
  if (profile === 'convex') {
    g.addColorStop(0, lo)
    g.addColorStop(0.35, hi)
    g.addColorStop(0.65, base)
    g.addColorStop(1, lo)
  } else if (profile === 'concave') {
    g.addColorStop(0, hi)
    g.addColorStop(0.5, lo)
    g.addColorStop(1, hi)
  } else {
    g.addColorStop(0, shade(color, light * 1.08))
    g.addColorStop(1, shade(color, light * 0.85))
  }
}

function drawTexture(
  ctx: CanvasRenderingContext2D,
  texture: BandTexture,
  side: Side,
  W: number,
  H: number,
  a: number,
  b: number,
  color: string,
) {
  if (texture === 'flat') return
  ctx.save()
  bandPath(ctx, side, W, H, a, b)
  ctx.clip()
  const horizontal = side === 'top' || side === 'bottom'
  const len = horizontal ? W : H
  const thickness = Math.abs(b - a)

  if (texture === 'wood') {
    ctx.globalAlpha = 0.18
    ctx.lineWidth = Math.max(1, thickness * 0.05)
    const grains = 5
    for (let i = 0; i < grains; i++) {
      const offset = a + ((i + 0.5) / grains) * (b - a)
      ctx.strokeStyle = shade(color, i % 2 ? 0.55 : 1.35)
      ctx.beginPath()
      const wave = thickness * 0.06
      for (let p = 0; p <= len; p += 12) {
        const w = Math.sin(p * 0.02 + i * 2.1) * wave
        const pos = offset + w
        if (horizontal) {
          const y = side === 'top' ? pos : H - pos
          if (p === 0) ctx.moveTo(p, y)
          else ctx.lineTo(p, y)
        } else {
          const x = side === 'left' ? pos : W - pos
          if (p === 0) ctx.moveTo(x, p)
          else ctx.lineTo(x, p)
        }
      }
      ctx.stroke()
    }
  } else if (texture === 'gold') {
    // sparse speckle highlights + darker flecks — reads as burnished metal
    const count = Math.round((len * thickness) / 2600)
    for (let i = 0; i < count; i++) {
      const along = Math.random() * len
      const across = a + Math.random() * (b - a)
      const x = horizontal ? along : side === 'left' ? across : W - across
      const y = horizontal ? (side === 'top' ? across : H - across) : along
      ctx.globalAlpha = 0.1 + Math.random() * 0.18
      ctx.fillStyle = Math.random() < 0.55 ? '#fff6d8' : shade(color, 0.5)
      const r = 0.6 + Math.random() * Math.max(1.4, thickness * 0.035)
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  } else if (texture === 'linen') {
    ctx.globalAlpha = 0.08
    ctx.lineWidth = 1
    ctx.strokeStyle = shade(color, 0.6)
    const step = 4
    for (let p = 0; p <= len; p += step) {
      ctx.beginPath()
      if (horizontal) {
        const y0 = side === 'top' ? a : H - a
        const y1 = side === 'top' ? b : H - b
        ctx.moveTo(p, y0)
        ctx.lineTo(p, y1)
      } else {
        const x0 = side === 'left' ? a : W - a
        const x1 = side === 'left' ? b : W - b
        ctx.moveTo(x0, p)
        ctx.lineTo(x1, p)
      }
      ctx.stroke()
    }
  }
  ctx.restore()
}

function drawOrnament(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save()
  ctx.translate(cx, cy)
  // petals
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4)
    const g = ctx.createRadialGradient(0, -r * 0.55, 0, 0, -r * 0.55, r * 0.5)
    g.addColorStop(0, shade(color, 1.45))
    g.addColorStop(1, shade(color, 0.7))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.ellipse(0, -r * 0.55, r * 0.28, r * 0.5, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  // center boss
  const g = ctx.createRadialGradient(-r * 0.1, -r * 0.1, 0, 0, 0, r * 0.4)
  g.addColorStop(0, shade(color, 1.6))
  g.addColorStop(1, shade(color, 0.6))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, r * 0.34, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

/**
 * Render the framed artwork. Returns a canvas containing frame + optional mat
 * + image, at the source image's native resolution.
 */
export async function renderFramedImage(
  imageDataUrl: string,
  spec: FrameSpec,
): Promise<HTMLCanvasElement> {
  const img = await loadImage(imageDataUrl)
  const minDim = Math.min(img.width, img.height)
  const frameW = Math.max(24, Math.round(minDim * spec.scale))
  const matW = spec.mat ? Math.max(12, Math.round(minDim * spec.mat.width)) : 0

  const W = img.width + 2 * (frameW + matW)
  const H = img.height + 2 * (frameW + matW)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  // ---- mat ----------------------------------------------------------------
  if (spec.mat) {
    ctx.fillStyle = spec.mat.color
    ctx.fillRect(frameW, frameW, W - 2 * frameW, H - 2 * frameW)
    // inner bevel around the artwork opening
    const bx = frameW + matW
    const bevel = Math.max(3, Math.round(matW * 0.06))
    ctx.fillStyle = shade(spec.mat.color, 0.75)
    ctx.fillRect(bx - bevel, bx - bevel, img.width + 2 * bevel, img.height + 2 * bevel)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(bx - Math.ceil(bevel / 2), bx - Math.ceil(bevel / 2), img.width + bevel, img.height + bevel)
    // soft shadow cast by the frame onto the mat
    const sh = ctx.createLinearGradient(0, frameW, 0, frameW + matW * 0.5)
    sh.addColorStop(0, 'rgba(0,0,0,0.16)')
    sh.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = sh
    ctx.fillRect(frameW, frameW, W - 2 * frameW, matW * 0.5)
  }

  // ---- artwork --------------------------------------------------------------
  // white underlay so transparent PNGs don't turn black in the JPEG export
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(frameW + matW, frameW + matW, img.width, img.height)
  ctx.drawImage(img, frameW + matW, frameW + matW)
  if (!spec.mat) {
    // subtle inner shadow where the rabbet overlaps the canvas
    const inset = frameW
    const s = Math.max(6, frameW * 0.12)
    const grad = ctx.createLinearGradient(0, inset, 0, inset + s)
    grad.addColorStop(0, 'rgba(0,0,0,0.28)')
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = grad
    ctx.fillRect(inset, inset, W - 2 * inset, s)
  }

  // ---- moulding bands -------------------------------------------------------
  const totalShare = spec.bands.reduce((s, b) => s + b.width, 0)
  let offset = 0
  for (const band of spec.bands) {
    const bw = (band.width / totalShare) * frameW
    const a = offset
    const b = offset + bw
    for (const side of SIDES) {
      const g = bandGradient(ctx, side, W, H, a, b)
      profileStops(g, band.color, SIDE_LIGHT[side], band.profile ?? 'flat')
      bandPath(ctx, side, W, H, a, b)
      ctx.fillStyle = g
      ctx.fill()
      drawTexture(ctx, band.texture, side, W, H, a, b, band.color)
    }
    offset = b
  }

  // thin outer edge line grounds the frame
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'
  ctx.lineWidth = Math.max(1, frameW * 0.015)
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, W - ctx.lineWidth, H - ctx.lineWidth)

  // ---- corner ornaments -----------------------------------------------------
  if (spec.ornaments) {
    const main = spec.bands.reduce((a, b) => (b.width > a.width ? b : a), spec.bands[0])
    const r = frameW * 0.46
    const c = frameW / 2
    drawOrnament(ctx, c, c, r, main.color)
    drawOrnament(ctx, W - c, c, r, main.color)
    drawOrnament(ctx, c, H - c, r, main.color)
    drawOrnament(ctx, W - c, H - c, r, main.color)
  }

  return canvas
}

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/jpeg', 0.92)
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
