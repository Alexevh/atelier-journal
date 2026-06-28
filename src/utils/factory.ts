import {
  ArtistCardData,
  AppSettings,
  CertificateData,
  PdfOptions,
  Project,
  ProcessEntry,
} from '../types'
import { t } from '../i18n'
import { generateCertificateNumber, uid } from './id'

export function createSettings(): AppSettings {
  return {
    artistName: '',
    artistContact: '',
    defaultTechnique: t('default.technique'),
    defaultAuthenticityText: t('default.authenticity'),
    defaultMaterialsSummary: t('default.materialsSummary'),
    backupReminderDays: 14,
    sync: {
      enabled: false,
      provider: 'firebase',
      firebaseConfig: null,
    },
  }
}

/** Merge persisted (possibly partial) settings over fresh defaults. */
export function mergeSettings(partial: Partial<AppSettings> | null): AppSettings {
  const base = createSettings()
  if (!partial) return base
  return {
    ...base,
    ...partial,
    sync: { ...base.sync, ...(partial.sync ?? {}) },
  }
}

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

/** A new project pre-filled with the artist's saved defaults from Settings. */
export function newProjectWithDefaults(settings: AppSettings): Project {
  const p = createProject()
  if (settings.defaultTechnique) p.technique = settings.defaultTechnique
  p.certificate.artistName = settings.artistName
  p.certificate.artistContact = settings.artistContact
  if (settings.defaultAuthenticityText) p.certificate.authenticityText = settings.defaultAuthenticityText
  if (settings.defaultMaterialsSummary) p.certificate.materialsSummary = settings.defaultMaterialsSummary
  p.certificate.signatureImage = settings.artistSignature
  p.pdfOptions.artistName = settings.artistName
  p.pdfOptions.artistLogo = settings.artistLogo
  p.artistCard.signatureImage = settings.artistSignature
  return p
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
