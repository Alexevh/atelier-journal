import QRCode from 'qrcode'

/**
 * Generate a QR code as a PNG data URL. We encode the exported project JSON
 * itself when it is small enough; otherwise we fall back to a short notice so
 * the call never throws on a huge payload (QR has a hard capacity limit).
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  const MAX = 2000 // characters — safely under QR alphanumeric capacity
  const payload =
    text.length > MAX
      ? 'This Atelier project is too large to embed in a QR code. Use the JSON export instead.'
      : text
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 480,
    color: { dark: '#2b2620', light: '#f4efe4' },
  })
}
