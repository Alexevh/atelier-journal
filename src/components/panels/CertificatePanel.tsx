import { useState } from 'react'
import { CertificateData, Project } from '../../types'
import { useI18n } from '../../i18n/I18nContext'
import { generateCertificateNumber } from '../../utils/id'
import ImageField from '../ImageField'
import { IconCertificate, IconDownload } from '../Icons'

interface Props {
  project: Project
  update: (updater: (p: Project) => Project) => void
  notify: (m: string, tone?: 'info' | 'success' | 'error') => void
}

export default function CertificatePanel({ project, update, notify }: Props) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const c = project.certificate

  const setCert = (patch: Partial<CertificateData>) =>
    update((p) => ({ ...p, certificate: { ...p.certificate, ...patch } }))

  const generate = async () => {
    setBusy(true)
    try {
      const { exportCertificatePdf } = await import('../../utils/pdf')
      await exportCertificatePdf(project)
      notify(t('notify.certificateDone'), 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : t('notify.pdfError'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="muted" style={{ fontStyle: 'italic', marginTop: 0 }}>
        {t('cert.intro')}
      </p>

      <div className="grid-2">
        <div className="field">
          <label>{t('cert.number')}</label>
          <div className="row">
            <input
              className="grow"
              value={c.certificateNumber}
              onChange={(e) => setCert({ certificateNumber: e.target.value })}
            />
            <button
              className="btn btn-sm"
              onClick={() => setCert({ certificateNumber: generateCertificateNumber(project.year) })}
              title={t('cert.numberTitle')}
            >
              {t('common.auto')}
            </button>
          </div>
        </div>
        <div className="field">
          <label>{t('cert.issueDate')}</label>
          <input
            type="date"
            value={c.issueDate}
            onChange={(e) => setCert({ issueDate: e.target.value })}
          />
        </div>
        <div className="field">
          <label>{t('cert.artistName')}</label>
          <input
            value={c.artistName}
            onChange={(e) => setCert({ artistName: e.target.value })}
            placeholder={t('cert.artistNamePh')}
          />
        </div>
        <div className="field">
          <label>{t('cert.artistContact')}</label>
          <input
            value={c.artistContact}
            onChange={(e) => setCert({ artistContact: e.target.value })}
            placeholder={t('cert.artistContactPh')}
          />
        </div>
      </div>

      <div className="field">
        <label>{t('cert.materialsSummary')}</label>
        <textarea
          rows={2}
          value={c.materialsSummary}
          onChange={(e) => setCert({ materialsSummary: e.target.value })}
        />
      </div>

      <div className="field">
        <label>{t('cert.authenticity')}</label>
        <textarea
          rows={3}
          value={c.authenticityText}
          onChange={(e) => setCert({ authenticityText: e.target.value })}
        />
      </div>

      <div className="field">
        <label>{t('cert.dedication')}</label>
        <textarea
          rows={2}
          value={c.dedication}
          onChange={(e) => setCert({ dedication: e.target.value })}
          placeholder={t('cert.dedicationPh')}
        />
      </div>

      <div className="image-slots">
        <ImageField
          label={t('cert.signature')}
          image={c.signatureImage}
          onChange={(img) => setCert({ signatureImage: img })}
          dropLabel={t('cert.signatureDrop')}
          signature
          maxDimension={800}
        />
        <ImageField
          label={t('cert.secondSignature')}
          image={c.secondSignatureImage}
          onChange={(img) => setCert({ secondSignatureImage: img })}
          dropLabel={t('cert.secondSignatureDrop')}
          signature
          maxDimension={800}
        />
      </div>

      <button className="btn btn-primary" onClick={generate} disabled={busy} style={{ marginTop: '1rem' }}>
        <IconCertificate size={16} />
        {busy ? t('common.generating') : t('cert.generate')}
        <IconDownload size={15} />
      </button>
    </div>
  )
}
