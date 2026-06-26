import {
  ArtistCardData,
  CertificateData,
  PdfOptions,
  Project,
  ProcessEntry,
} from '../types'
import { t } from '../i18n'
import { generateCertificateNumber, uid } from './id'

function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function createCertificate(): CertificateData {
  return {
    certificateNumber: generateCertificateNumber(),
    issueDate: todayISO(),
    authenticityText: t('default.authenticity'),
    artistName: '',
    artistContact: '',
    dedication: '',
    materialsSummary: t('default.materialsSummary'),
  }
}

export function createArtistCard(): ArtistCardData {
  return {
    statement: '',
  }
}

export function createPdfOptions(): PdfOptions {
  return {
    includeNotes: true,
    watermark: '',
    artistName: '',
  }
}

export function createProject(partial?: Partial<Project>): Project {
  const now = Date.now()
  return {
    id: uid('p_'),
    title: t('default.title'),
    shortDescription: '',
    detailedDescription: '',
    year: new Date().getFullYear().toString(),
    technique: t('default.technique'),
    dimensions: '',
    status: 'sketch',
    tags: [],
    materials: [],
    entries: [],
    certificate: createCertificate(),
    artistCard: createArtistCard(),
    pdfOptions: createPdfOptions(),
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export function createEntry(partial?: Partial<ProcessEntry>): ProcessEntry {
  return {
    id: uid('e_'),
    title: t('default.entryTitle'),
    date: todayISO(),
    description: '',
    images: [],
    notes: [],
    createdAt: Date.now(),
    ...partial,
  }
}
