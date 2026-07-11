import { useState } from 'react'
import { PdfOptions, Project } from '../../types'
import { useI18n } from '../../i18n/I18nContext'
import { exportProject } from '../../utils/transfer'
import { generateQrDataUrl } from '../../utils/qr'
import { exportSocialCard } from '../../utils/socialCard'
import FrameStudio from '../FrameStudio'
import ImageField from '../ImageField'
import { IconDoc, IconDownload, IconImage, IconQr } from '../Icons'

interface Props {
  project: Project
  update: (updater: (p: Project) => Project) => void
  notify: (m: string, tone?: 'info' | 'success' | 'error') => void
}

export default function ExportPanel({ project, update, notify }: Props) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [framing, setFraming] = useState(false)
  const opts = project.pdfOptions

  const setOpts = (patch: Partial<PdfOptions>) =>
    update((p) => ({ ...p, pdfOptions: { ...p.pdfOptions, ...patch } }))

  const monograph = async () => {
    setBusy(true)
    try {
      const { exportMonographPdf } = await import('../../utils/pdf')
      await exportMonographPdf(project)
      notify(t('notify.monographDone'), 'success')
    } catch (err) {
      notify(err instanceof Error ? err.message : t('notify.pdfError'), 'error')
    } finally {
      setBusy(false)
    }
  }

  const makeQr = async () => {
    try {
      const payload = JSON.stringify({
        type: 'atelier-project',
        version: 1,
        project,
      })
      setQr(await generateQrDataUrl(payload))
      notify(t('notify.qrDone'), 'success')
    } catch {
      notify(t('notify.qrError'), 'error')
    }
  }

  return (
    <div>
      <p className="muted" style={{ fontStyle: 'italic', marginTop: 0 }}>
        {t('export.intro')}
      </p>

      <div className="grid-2">
        <div className="field">
          <label>{t('export.artistName')}</label>
          <input
            value={opts.artistName}
            onChange={(e) => setOpts({ artistName: e.target.value })}
            placeholder={t('export.artistNamePh')}
          />
        </div>
        <div className="field">
          <label>{t('export.watermark')}</label>
          <input
            value={opts.watermark}
            onChange={(e) => setOpts({ watermark: e.target.value })}
            placeholder={t('export.watermarkPh')}
          />
        </div>
      </div>

      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={opts.includeNotes}
          onChange={(e) => setOpts({ includeNotes: e.target.checked })}
        />
        <span>{t('export.includeNotes')}</span>
      </label>

      <div style={{ maxWidth: 240, marginTop: '0.4rem' }}>
        <ImageField
          label={t('export.logo')}
          image={opts.artistLogo}
          onChange={(img) => setOpts({ artistLogo: img })}
          dropLabel={t('export.logoDrop')}
          signature
          maxDimension={800}
        />
      </div>

      <div className="export-grid">
        <div className="export-card">
          <span className="ico">
            <IconDoc size={28} />
          </span>
          <h4>{t('export.monographTitle')}</h4>
          <p>{t('export.monographText')}</p>
          <button className="btn btn-primary btn-sm" onClick={monograph} disabled={busy}>
            <IconDownload size={15} /> {busy ? t('common.working') : t('export.generatePdf')}
          </button>
        </div>

        <div className="export-card">
          <span className="ico">
            <IconDownload size={28} />
          </span>
          <h4>{t('export.backupTitle')}</h4>
          <p>{t('export.backupText')}</p>
          <button
            className="btn btn-sm"
            onClick={() => {
              exportProject(project)
              notify(t('notify.projectExported'), 'success')
            }}
          >
            <IconDownload size={15} /> {t('export.exportJson')}
          </button>
        </div>

        <div className="export-card">
          <span className="ico">
            <IconImage size={28} />
          </span>
          <h4>{t('export.socialTitle')}</h4>
          <p>{t('export.socialText')}</p>
          <button
            className="btn btn-sm"
            disabled={!project.finalImage && !project.referenceImage}
            onClick={async () => {
              try {
                await exportSocialCard(project, opts.artistName)
                notify(t('export.socialDone'), 'success')
              } catch {
                notify(t('notify.pdfError'), 'error')
              }
            }}
          >
            <IconDownload size={15} /> {t('export.socialBtn')}
          </button>
        </div>

        <div className="export-card">
          <span className="ico">
            <IconImage size={28} />
          </span>
          <h4>{t('frame.exportTitle')}</h4>
          <p>{t('frame.exportText')}</p>
          <button className="btn btn-sm" onClick={() => setFraming(true)}>
            <IconImage size={15} /> {t('frame.open')}
          </button>
        </div>

        <div className="export-card">
          <span className="ico">
            <IconQr size={28} />
          </span>
          <h4>{t('export.qrTitle')}</h4>
          <p>{t('export.qrText')}</p>
          {qr ? (
            <div className="qr-box">
              <img src={qr} alt="QR" />
              <a className="btn btn-sm" href={qr} download={`${project.title || 'project'}-qr.png`}>
                <IconDownload size={15} /> {t('common.save')}
              </a>
            </div>
          ) : (
            <button className="btn btn-sm" onClick={makeQr}>
              <IconQr size={15} /> {t('common.generate')}
            </button>
          )}
        </div>
      </div>

      {framing && (
        <FrameStudio
          image={project.finalImage || project.referenceImage}
          title={project.title}
          onClose={() => setFraming(false)}
        />
      )}
    </div>
  )
}
