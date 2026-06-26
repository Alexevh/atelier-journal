import { StoredImage } from '../types'
import { uid } from './id'

const MAX_DIMENSION = 1800 // px — generous for big process photos, still light
const JPEG_QUALITY = 0.82

interface ProcessOptions {
  maxDimension?: number
  quality?: number
}

/**
 * Compress an image file in the browser using a canvas. Downscales to a
 * sensible maximum dimension and re-encodes as JPEG (or keeps PNG transparency
 * for signatures/logos). Everything stays local — nothing is uploaded.
 */
export function processImageFile(
  file: File,
  opts: ProcessOptions = {},
): Promise<StoredImage> {
  const maxDimension = opts.maxDimension ?? MAX_DIMENSION
  const quality = opts.quality ?? JPEG_QUALITY
  const keepAlpha = file.type === 'image/png'

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      let { width, height } = img
      const scale = Math.min(1, maxDimension / Math.max(width, height))
      width = Math.round(width * scale)
      height = Math.round(height * scale)

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('Canvas not supported'))
        return
      }
      if (!keepAlpha) {
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, width, height)
      }
      ctx.drawImage(img, 0, 0, width, height)

      const mime = keepAlpha ? 'image/png' : 'image/jpeg'
      const dataUrl = canvas.toDataURL(mime, quality)
      resolve({
        id: uid('img_'),
        dataUrl,
        name: file.name,
        width,
        height,
      })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not load image'))
    }
    img.src = url
  })
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

/** Get the natural pixel size of a data URL (used for PDF layout). */
export function getImageSize(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Could not measure image'))
    img.src = dataUrl
  })
}
