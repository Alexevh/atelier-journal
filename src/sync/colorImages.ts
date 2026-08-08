// Per-slot last-write-wins sync for the colour tool's active-image store
// (src/lib/imageStore.ts). Mirrors what the standalone Pigment Match did with
// its own cloud sync: a photo captured on one device appears on the others.
//
// Additive only — a slot cleared on one device is NOT deleted on the others.
// Given how easily "delete propagation" caused data loss elsewhere, active
// images only ever get added or updated across devices, never removed.

import { imageToDataURL, listImages, putImageFromDataURL } from '../lib/imageStore'

type Fb = typeof import('./firebase')

export async function syncColorImages(fb: Fb): Promise<void> {
  const [localList, remoteMeta] = await Promise.all([listImages(), fb.pullColorImageMeta()])
  const localTs = new Map(localList.map((i) => [i.slot, i.updatedAt]))
  const slots = new Set<string>([...localTs.keys(), ...Object.keys(remoteMeta)])

  const failures: string[] = []
  for (const slot of slots) {
    const lt = localTs.get(slot) ?? -1
    const rt = remoteMeta[slot] ?? -1
    try {
      if (lt > rt) {
        const dataURL = await imageToDataURL(slot)
        if (dataURL) await fb.uploadColorImage(slot, dataURL, lt)
      } else if (rt > lt) {
        const dl = await fb.downloadColorImage(slot)
        // putImageFromDataURL stamps the remote timestamp, so the next diff sees
        // the slots as equal and won't ping-pong.
        if (dl?.dataURL) await putImageFromDataURL(slot, dl.dataURL, dl.updatedAt)
      }
    } catch (e) {
      failures.push(`${slot}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  if (failures.length) throw new Error(failures.slice(0, 3).join(' · '))
}
