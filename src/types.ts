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
