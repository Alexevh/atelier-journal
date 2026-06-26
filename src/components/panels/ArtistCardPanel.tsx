import { useState } from 'react'
import { ArtistCardData, Project } from '../../types'
import { useI18n } from '../../i18n/I18nContext'
import ImageField from '../ImageField'
import { IconCard, IconDownload } from '../Icons'

interface Props {
  project: Project
  update: (updater: (p: Project) => Project) => void
  notify: (m: string, tone?: 'info' | 'success' | 'error') => void
}

export default function ArtistCardPanel({ project, update, notify }: Props) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const card = project.artistCard

  const setCard = (patch: Partial<ArtistCardData>) =>
    update((p) => ({ ...p, artistCard: { ...p.artistCard, ...patch } }))

  const generate = async () => {
    setBusy(true)
    try {
      const { exportArtistCardPdf } = await import('../../utils/pdf')
      await exportArtistCardPdf(project)
      notify(t('notify.cardDone'), 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : t('notify.pdfError'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <p className="muted" style={{ fontStyle: 'italic', marginTop: 0 }}>
        {t('cardp.intro')}
      </p>

      <div className="field">
        <label>{t('cardp.statement')}</label>
        <textarea
          rows={6}
          value={card.statement}
          onChange={(e) => setCard({ statement: e.target.value })}
          placeholder={t('cardp.statementPh')}
        />
      </div>

      <ImageField
        label={t('cardp.signature')}
        image={card.signatureImage}
        onChange={(img) => setCard({ signatureImage: img })}
        dropLabel={t('cardp.signatureDrop')}
        signature
        maxDimension={800}
      />

      <button className="btn btn-primary" onClick={generate} disabled={busy} style={{ marginTop: '1rem' }}>
        <IconCard size={16} />
        {busy ? t('common.generating') : t('cardp.generate')}
        <IconDownload size={15} />
      </button>
    </div>
  )
}
