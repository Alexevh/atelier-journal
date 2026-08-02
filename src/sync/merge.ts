import { Tombstone } from '../types'

/** Any synced entity: a project or an idea. */
export interface Syncable {
  id: string
  updatedAt: number
  createdAt: number
}

export interface MergeResult<T> {
  /** Final merged set (remote-won entries still need image rehydration). */
  resultMap: Map<string, T>
  /** Ids whose remote version won — caller must rehydrate their images. */
  remoteWonIds: Set<string>
}

/**
 * Last-write-wins merge by id across local, remote and tombstones.
 * Pure and deterministic; the engine handles the IO around it.
 */
export function computeMerge<T extends Syncable>(
  local: T[],
  remote: T[],
  tombstones: Tombstone[],
): MergeResult<T> {
  const lmap = new Map(local.map((p) => [p.id, p]))
  const rmap = new Map(remote.map((p) => [p.id, p]))
  const tmap = new Map(tombstones.map((t) => [t.id, t]))

  const resultMap = new Map<string, T>()
  const remoteWonIds = new Set<string>()

  const ids = new Set<string>([...lmap.keys(), ...rmap.keys()])
  ids.forEach((id) => {
    const l = lmap.get(id)
    const r = rmap.get(id)
    const tomb = tmap.get(id)
    const lt = l?.updatedAt ?? -1
    const rt = r?.updatedAt ?? -1
    const dt = tomb?.deletedAt ?? -1

    // A deletion wins only if it is at least as recent as both sides.
    if (dt > -1 && dt >= lt && dt >= rt) return

    if (r && rt >= lt) {
      resultMap.set(id, r)
      remoteWonIds.add(id)
    } else if (l) {
      resultMap.set(id, l)
    } else if (r) {
      resultMap.set(id, r)
      remoteWonIds.add(id)
    }
  })

  return { resultMap, remoteWonIds }
}

/** Shallow equality by id + updatedAt — used to skip redundant state updates. */
export function sameEntities<T extends Syncable>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false
  const bm = new Map(b.map((p) => [p.id, p.updatedAt]))
  return a.every((p) => bm.get(p.id) === p.updatedAt)
}
