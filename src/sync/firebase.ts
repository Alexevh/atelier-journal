import type { FirebaseApp } from 'firebase/app'
import type { Auth, User } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { FirebaseConfig, Idea, Project, Tombstone } from '../types'
import {
  collectIdeaImages,
  collectProjectImages,
  stripIdeaImages,
  stripImages,
} from './images'

// All Firebase runtime modules are dynamically imported so the (large) SDK is
// only fetched when the user actually enables cloud sync. Type-only imports
// above are erased at build time and add nothing to the bundle.

type AppMod = typeof import('firebase/app')
type AuthMod = typeof import('firebase/auth')
type FsMod = typeof import('firebase/firestore')

let appMod: AppMod
let authMod: AuthMod
let fsMod: FsMod

let app: FirebaseApp | null = null
let auth: Auth | null = null
let db: Firestore | null = null
let configKey = ''

const CHUNK = 700_000 // chars per Firestore blob-chunk doc (limit is 1 MiB)

function cfgKey(c: FirebaseConfig): string {
  return `${c.projectId}|${c.apiKey}|${c.appId}`
}

/** Initialise (or re-initialise) Firebase from a BYO config. Idempotent. */
export async function initFirebase(config: FirebaseConfig): Promise<void> {
  const key = cfgKey(config)
  if (app && key === configKey) return
  ;[appMod, authMod, fsMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ])
  // Reuse an existing app instance if one matches; otherwise create a fresh one.
  const name = `atelier-${config.projectId}`
  const existing = appMod.getApps().find((a) => a.name === name)
  app = existing ?? appMod.initializeApp(config, name)
  auth = authMod.getAuth(app)
  db = fsMod.initializeFirestore(app, { ignoreUndefinedProperties: true })
  configKey = key
}

export function getUser(): User | null {
  return auth?.currentUser ?? null
}

export function onAuthChange(cb: (user: User | null) => void): () => void {
  if (!auth) return () => {}
  return authMod.onAuthStateChanged(auth, cb)
}

export async function signInWithGoogle(): Promise<User> {
  if (!auth) throw new Error('Firebase not initialised')
  const provider = new authMod.GoogleAuthProvider()
  const res = await authMod.signInWithPopup(auth, provider)
  return res.user
}

export async function signOutUser(): Promise<void> {
  if (auth) await authMod.signOut(auth)
}

// ---- Firestore references (scoped per user) ------------------------------

function uidOrThrow(): string {
  const u = getUser()
  if (!u) throw new Error('Not signed in')
  return u.uid
}

function projectsCol() {
  return fsMod.collection(db!, 'users', uidOrThrow(), 'projects')
}
function tombstonesCol() {
  return fsMod.collection(db!, 'users', uidOrThrow(), 'tombstones')
}
function ideasCol() {
  return fsMod.collection(db!, 'users', uidOrThrow(), 'ideas')
}
function ideaTombstonesCol() {
  return fsMod.collection(db!, 'users', uidOrThrow(), 'ideaTombstones')
}
function blobMetaRef(imageId: string) {
  return fsMod.doc(db!, 'users', uidOrThrow(), 'blobs', imageId)
}
function blobChunksCol(imageId: string) {
  return fsMod.collection(db!, 'users', uidOrThrow(), 'blobs', imageId, 'chunks')
}

// ---- Image blobs (chunked) ----------------------------------------------

async function uploadImageIfMissing(id: string, dataUrl: string): Promise<void> {
  if (!dataUrl) return
  const metaSnap = await fsMod.getDoc(blobMetaRef(id))
  if (metaSnap.exists()) return // image content is immutable per id
  const parts: string[] = []
  for (let i = 0; i < dataUrl.length; i += CHUNK) parts.push(dataUrl.slice(i, i + CHUNK))
  const batch = fsMod.writeBatch(db!)
  batch.set(blobMetaRef(id), { n: parts.length, updatedAt: Date.now() })
  parts.forEach((d, i) => {
    batch.set(fsMod.doc(blobChunksCol(id), String(i)), { i, d })
  })
  await batch.commit()
}

async function loadImage(id: string): Promise<string | null> {
  const metaSnap = await fsMod.getDoc(blobMetaRef(id))
  if (!metaSnap.exists()) return null
  const snap = await fsMod.getDocs(fsMod.query(blobChunksCol(id), fsMod.orderBy('i')))
  let out = ''
  snap.forEach((d) => {
    out += (d.data() as { d: string }).d
  })
  return out
}

/** Load data URLs for a set of image ids. Failures are skipped silently. */
export async function loadImages(ids: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  await Promise.all(
    ids.map(async (id) => {
      try {
        const data = await loadImage(id)
        if (data) map.set(id, data)
      } catch {
        /* skip individual image failures */
      }
    }),
  )
  return map
}

// ---- Projects + tombstones ----------------------------------------------

export interface RemoteState {
  projects: Project[] // image binaries stripped (dataUrl === '')
  tombstones: Tombstone[]
}

export async function pullAll(): Promise<RemoteState> {
  const [pSnap, tSnap] = await Promise.all([
    fsMod.getDocs(projectsCol()),
    fsMod.getDocs(tombstonesCol()),
  ])
  const projects: Project[] = []
  pSnap.forEach((d) => projects.push(d.data() as Project))
  const tombstones: Tombstone[] = []
  tSnap.forEach((d) => tombstones.push(d.data() as Tombstone))
  return { projects, tombstones }
}

/** Upload a project's images (if new) then write its (stripped) document. */
export async function pushProject(project: Project): Promise<void> {
  const images = collectProjectImages(project).filter((i) => i.dataUrl)
  for (const img of images) await uploadImageIfMissing(img.id, img.dataUrl)
  await fsMod.setDoc(fsMod.doc(projectsCol(), project.id), stripImages(project))
  // clear any prior tombstone for this id (project was re-created/restored)
  await fsMod.deleteDoc(fsMod.doc(tombstonesCol(), project.id)).catch(() => {})
}

export async function deleteProjectRemote(id: string): Promise<void> {
  await fsMod.setDoc(fsMod.doc(tombstonesCol(), id), { id, deletedAt: Date.now() })
  await fsMod.deleteDoc(fsMod.doc(projectsCol(), id)).catch(() => {})
}

// ---- Colour tool snapshot (single chunked payload, LWW) --------------------

function colorMetaRef() {
  return fsMod.doc(db!, 'users', uidOrThrow(), 'colorTool', 'meta')
}
function colorChunksCol() {
  return fsMod.collection(db!, 'users', uidOrThrow(), 'colorTool', 'meta', 'chunks')
}

export interface ColorRemoteMeta {
  updatedAt: number
  hash: string
  n: number
}

export async function pullColorMeta(): Promise<ColorRemoteMeta | null> {
  const snap = await fsMod.getDoc(colorMetaRef())
  return snap.exists() ? (snap.data() as ColorRemoteMeta) : null
}

export async function uploadColorData(
  payload: string,
  updatedAt: number,
  hash: string,
): Promise<void> {
  const parts: string[] = []
  for (let i = 0; i < payload.length; i += CHUNK) parts.push(payload.slice(i, i + CHUNK))
  // stale chunks beyond the new count would corrupt reads — remove them first
  const existing = await fsMod.getDocs(colorChunksCol())
  const batch = fsMod.writeBatch(db!)
  existing.forEach((d) => {
    if (Number(d.id) >= parts.length) batch.delete(d.ref)
  })
  parts.forEach((p, i) => {
    batch.set(fsMod.doc(colorChunksCol(), String(i)), { i, d: p })
  })
  batch.set(colorMetaRef(), { updatedAt, hash, n: parts.length })
  await batch.commit()
}

export async function downloadColorData(): Promise<{ payload: string; meta: ColorRemoteMeta } | null> {
  const metaSnap = await fsMod.getDoc(colorMetaRef())
  if (!metaSnap.exists()) return null
  const meta = metaSnap.data() as ColorRemoteMeta
  const snap = await fsMod.getDocs(fsMod.query(colorChunksCol(), fsMod.orderBy('i')))
  let out = ''
  snap.forEach((d) => {
    const data = d.data() as { i: number; d: string }
    if (data.i < meta.n) out += data.d
  })
  return { payload: out, meta }
}

/** Live listeners. Returns an unsubscribe that detaches both. */
export function watch(
  onProjects: (projects: Project[]) => void,
  onTombstones: (tombstones: Tombstone[]) => void,
  onError: (err: Error) => void,
): () => void {
  const unsubP = fsMod.onSnapshot(
    projectsCol(),
    (snap) => {
      const list: Project[] = []
      snap.forEach((d) => list.push(d.data() as Project))
      onProjects(list)
    },
    (err) => onError(err as Error),
  )
  const unsubT = fsMod.onSnapshot(
    tombstonesCol(),
    (snap) => {
      const list: Tombstone[] = []
      snap.forEach((d) => list.push(d.data() as Tombstone))
      onTombstones(list)
    },
    (err) => onError(err as Error),
  )
  return () => {
    unsubP()
    unsubT()
  }
}

// ---- Ideas backlog (same treatment as projects) --------------------------

export interface RemoteIdeas {
  ideas: Idea[]
  tombstones: Tombstone[]
}

export async function pullIdeas(): Promise<RemoteIdeas> {
  const [iSnap, tSnap] = await Promise.all([
    fsMod.getDocs(ideasCol()),
    fsMod.getDocs(ideaTombstonesCol()),
  ])
  const ideas: Idea[] = []
  iSnap.forEach((d) => ideas.push(d.data() as Idea))
  const tombstones: Tombstone[] = []
  tSnap.forEach((d) => tombstones.push(d.data() as Tombstone))
  return { ideas, tombstones }
}

export async function pushIdea(idea: Idea): Promise<void> {
  const images = collectIdeaImages(idea).filter((i) => i.dataUrl)
  for (const img of images) await uploadImageIfMissing(img.id, img.dataUrl)
  await fsMod.setDoc(fsMod.doc(ideasCol(), idea.id), stripIdeaImages(idea))
  await fsMod.deleteDoc(fsMod.doc(ideaTombstonesCol(), idea.id)).catch(() => {})
}

export async function deleteIdeaRemote(id: string): Promise<void> {
  await fsMod.setDoc(fsMod.doc(ideaTombstonesCol(), id), { id, deletedAt: Date.now() })
  await fsMod.deleteDoc(fsMod.doc(ideasCol(), id)).catch(() => {})
}

export function watchIdeas(
  onIdeas: (ideas: Idea[]) => void,
  onTombstones: (tombstones: Tombstone[]) => void,
  onError: (err: Error) => void,
): () => void {
  const unsubI = fsMod.onSnapshot(
    ideasCol(),
    (snap) => {
      const list: Idea[] = []
      snap.forEach((d) => list.push(d.data() as Idea))
      onIdeas(list)
    },
    (err) => onError(err as Error),
  )
  const unsubT = fsMod.onSnapshot(
    ideaTombstonesCol(),
    (snap) => {
      const list: Tombstone[] = []
      snap.forEach((d) => list.push(d.data() as Tombstone))
      onTombstones(list)
    },
    (err) => onError(err as Error),
  )
  return () => {
    unsubI()
    unsubT()
  }
}
