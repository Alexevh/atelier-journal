// Domain model for the Atelier painting process journal.
// Everything lives client-side; images are stored as compressed data URLs
// so a project serialises cleanly to a single self-contained JSON file.

export type ProjectStatus = 'sketch' | 'in_progress' | 'finished' | 'sold'

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  sketch: 'Sketch',
  in_progress: 'In Progress',
  finished: 'Finished',
  sold: 'Sold',
}

export type NoteCategory =
  | 'decision'
  | 'experiment'
  | 'discovery'
  | 'problem'
  | 'solution'
  | 'lesson'

export const NOTE_CATEGORY_LABELS: Record<NoteCategory, string> = {
  decision: 'Artistic Decision',
  experiment: 'Experiment',
  discovery: 'Discovery',
  problem: 'Problem Encountered',
  solution: 'Solution Applied',
  lesson: 'Lesson Learned',
}

/** A stored image: a compressed data URL plus a little metadata. */
export interface StoredImage {
  id: string
  dataUrl: string
  name?: string
  width?: number
  height?: number
}

export interface Material {
  id: string
  text: string
}

export interface ArtisticNote {
  id: string
  category?: NoteCategory
  text: string
}

export interface ProcessEntry {
  id: string
  title: string
  date: string // ISO yyyy-mm-dd
  description: string
  images: StoredImage[] // 1..5
  notes: ArtisticNote[]
  /** Minutes worked in this session (optional). */
  minutes?: number
  createdAt: number
}

export interface CertificateData {
  certificateNumber: string
  issueDate: string
  authenticityText: string
  artistName: string
  artistContact: string
  signatureImage?: StoredImage
  secondSignatureImage?: StoredImage
  dedication: string
  materialsSummary: string
}

export interface ArtistCardData {
  statement: string // poem / reflection / artist statement
  signatureImage?: StoredImage
}

export interface PdfOptions {
  includeNotes: boolean
  watermark: string
  artistName: string
  artistLogo?: StoredImage
}

export interface Project {
  id: string
  title: string
  shortDescription: string
  detailedDescription: string
  year: string
  technique: string
  dimensions: string
  status: ProjectStatus
  tags: string[]
  referenceImage?: StoredImage
  finalImage?: StoredImage
  materials: Material[]
  entries: ProcessEntry[]
  certificate: CertificateData
  artistCard: ArtistCardData
  pdfOptions: PdfOptions
  createdAt: number
  updatedAt: number
}

export interface AppData {
  version: number
  projects: Project[]
}

export const APP_DATA_VERSION = 1

// ---- Settings & optional cloud sync --------------------------------------

/** Public Firebase web config — pasted by the user (BYO project). Not secret. */
export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export interface SyncSettings {
  /** Master switch. When false, the app is 100% local and Firebase never loads. */
  enabled: boolean
  provider: 'firebase'
  firebaseConfig: FirebaseConfig | null
}

/** A user-imported picture frame for the Frame Studio (stored on-device). */
export interface CustomFrame {
  id: string
  name: string
  /** Cropped frame photograph as a data URL. */
  dataUrl: string
  /** 9-slice opening insets as fractions of the image size. */
  insets: { l: number; t: number; r: number; b: number }
  /** Moulding width relative to the artwork's smaller dimension. */
  scale: number
}

export interface AppSettings {
  // Artist identity — used to prefill new projects, certificates and PDFs.
  artistName: string
  artistContact: string
  artistLogo?: StoredImage
  artistSignature?: StoredImage
  // Default texts applied to new works.
  defaultTechnique: string
  defaultAuthenticityText: string
  defaultMaterialsSummary: string
  // Backup reminder cadence, in days.
  backupReminderDays: number
  // User-imported frames for the Frame Studio.
  customFrames: CustomFrame[]
  // Optional cloud sync.
  sync: SyncSettings
}

export const SETTINGS_VERSION = 1

/**
 * Sync lifecycle states surfaced to the UI. Local-first always holds: none of
 * these ever block reading/writing the local store.
 */
export type SyncStatus =
  | 'disabled' // sync turned off
  | 'unconfigured' // enabled but no Firebase config yet
  | 'signed_out' // configured, waiting for Google sign-in
  | 'connecting' // initialising firebase / signing in
  | 'syncing' // a reconcile/transfer is in progress
  | 'synced' // up to date and listening
  | 'offline' // no network; will resume on reconnect
  | 'error' // misconfiguration or failure (details in message)

/** A deletion marker so removing a work on one device propagates to others. */
export interface Tombstone {
  id: string
  deletedAt: number
}
