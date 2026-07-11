import { Project } from '../types'

// A shareable 1080×1080 card: the artwork with a paper caption band beneath —
// designed to post the finished piece (or a process shot) to social media.

const S = 1080
const IMG_H = 720

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not load image'))
    img.src = src
  })
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
      if (lines.length === maxLines - 1) break
    } else {
      line = test
    }
  }
  if (line && lines.length < maxLines) lines.push(line)
  if (lines.length === maxLines) {
    const last = lines[maxLines - 1]
    if (ctx.measureText(last).width > maxWidth) {
      let trimmed = last
      while (trimmed && ctx.measureText(trimmed + '…').width > maxWidth) trimmed = trimmed.slice(0, -1)
      lines[maxLines - 1] = trimmed + '…'
    }
  }
  return lines
}

function fileSafe(s: string): string {
  return (s || 'artwork').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'artwork'
}

/** Build and download the social card. Uses the final image (or reference). */
export async function exportSocialCard(project: Project, artistName: string): Promise<void> {
  const source = project.finalImage || project.referenceImage
  if (!source) throw new Error('No image to share')

  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas not supported')

  // paper background
  ctx.fillStyle = '#f3ecdd'
  ctx.fillRect(0, 0, S, S)

  // artwork — cover-crop into the top band
  const img = await loadImage(source.dataUrl)
  const scale = Math.max(S / img.width, IMG_H / img.height)
  const w = img.width * scale
  const h = img.height * scale
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, S, IMG_H)
  ctx.clip()
  ctx.drawImage(img, (S - w) / 2, (IMG_H - h) / 2, w, h)
  ctx.restore()

  // caption band
  ctx.fillStyle = '#f3ecdd'
  ctx.fillRect(0, IMG_H, S, S - IMG_H)

  // gold rule
  ctx.strokeStyle = '#b0822f'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(80, IMG_H + 56)
  ctx.lineTo(200, IMG_H + 56)
  ctx.stroke()

  // title
  ctx.fillStyle = '#2c2620'
  ctx.textBaseline = 'alphabetic'
  ctx.font = '600 58px Georgia, "Times New Roman", serif'
  const titleLines = wrap(ctx, project.title || 'Untitled Work', S - 160, 2)
  let y = IMG_H + 128
  titleLines.forEach((l) => {
    ctx.fillText(l, 80, y)
    y += 66
  })

  // short description (italic)
  if (project.shortDescription) {
    ctx.fillStyle = '#5d5243'
    ctx.font = 'italic 30px Georgia, serif'
    const descLines = wrap(ctx, project.shortDescription, S - 160, 1)
    ctx.fillText(descLines[0], 80, y + 6)
    y += 40
  }

  // meta + artist
  ctx.fillStyle = '#968873'
  ctx.font = '26px Georgia, serif'
  const meta = [project.technique, project.dimensions, project.year].filter(Boolean).join('  ·  ')
  if (meta) ctx.fillText(meta, 80, S - 70)
  if (artistName) {
    ctx.fillStyle = '#b0822f'
    ctx.font = 'italic 30px Georgia, serif'
    ctx.textAlign = 'right'
    ctx.fillText(artistName, S - 80, S - 70)
    ctx.textAlign = 'left'
  }

  const url = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileSafe(project.title)}-card.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
