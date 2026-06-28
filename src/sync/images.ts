import { Project, StoredImage } from '../types'

type ImgMapper = (img: StoredImage) => StoredImage

/**
 * Return a copy of the project with every StoredImage passed through `fn`.
 * Covers all image locations: reference, final, entry photos, signatures and
 * logo. Used to strip image data before saving to Firestore and to rehydrate
 * it when reading back.
 */
export function mapProjectImages(p: Project, fn: ImgMapper): Project {
  const m = (img?: StoredImage) => (img ? fn(img) : img)
  return {
    ...p,
    referenceImage: m(p.referenceImage),
    finalImage: m(p.finalImage),
    entries: p.entries.map((e) => ({ ...e, images: e.images.map(fn) })),
    certificate: {
      ...p.certificate,
      signatureImage: m(p.certificate.signatureImage),
      secondSignatureImage: m(p.certificate.secondSignatureImage),
    },
    artistCard: { ...p.artistCard, signatureImage: m(p.artistCard.signatureImage) },
    pdfOptions: { ...p.pdfOptions, artistLogo: m(p.pdfOptions.artistLogo) },
  }
}

/** Flat list of every image referenced by a project (in any slot). */
export function collectProjectImages(p: Project): StoredImage[] {
  const out: StoredImage[] = []
  mapProjectImages(p, (img) => {
    out.push(img)
    return img
  })
  return out
}

/** A project with image binaries removed — small enough for a Firestore doc. */
export function stripImages(p: Project): Project {
  return mapProjectImages(p, (img) => ({
    id: img.id,
    dataUrl: '',
    name: img.name,
    width: img.width,
    height: img.height,
  }))
}

/**
 * Rebuild a project's images from a loader keyed by image id. Missing images
 * resolve to an empty data URL so the project stays structurally valid.
 */
export function rehydrateImages(p: Project, dataUrls: Map<string, string>): Project {
  return mapProjectImages(p, (img) => ({
    ...img,
    dataUrl: dataUrls.get(img.id) ?? img.dataUrl ?? '',
  }))
}
