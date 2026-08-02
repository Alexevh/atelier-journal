import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { getManual } from '../utils/manual'
import BrushDivider from './BrushDivider'
import CollapsiblePanel from './CollapsiblePanel'
import { IconArrowLeft, IconDoc, IconDownload } from './Icons'

/** The in-app user manual for the whole suite, with a paper-styled PDF. */
export default function HelpPage({ onBack }: { onBack: () => void }) {
  const { t, lang } = useI18n()
  const { notify } = useApp()
  const [busy, setBusy] = useState(false)
  const sections = getManual(lang)

  const downloadPdf = async () => {
    setBusy(true)
    try {
      const { exportManualPdf } = await import('../utils/pdf/manualPdf')
      await exportManualPdf(lang)
      notify(t('help.pdfDone'), 'success')
    } catch {
      notify(t('notify.pdfError'), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fade-up">
      <div className="row wrap" style={{ justifyContent: 'space-between', marginBottom: '1.2rem' }}>
        <button className="btn btn-ghost" onClick={onBack}>
          <IconArrowLeft size={16} /> {t('editor.back')}
        </button>
        <button className="btn btn-primary btn-sm" onClick={downloadPdf} disabled={busy}>
          <IconDoc size={15} /> {busy ? t('common.generating') : t('help.download')}
          <IconDownload size={14} />
        </button>
      </div>

      <section className="hero" style={{ padding: '0 0 0.5rem' }}>
        <span className="eyebrow">{t('help.subtitle')}</span>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)' }}>{t('help.title')}</h1>
      </section>

      <BrushDivider variant="bold" />

      {sections.map((s, i) => (
        <CollapsiblePanel key={s.title} title={`${String(i + 1).padStart(2, '0')} · ${s.title}`} defaultOpen={i === 0}>
          {s.body.map((p, j) => (
            <p key={j} style={{ color: 'var(--ink-soft)' }}>
              {p}
            </p>
          ))}
        </CollapsiblePanel>
      ))}
    </div>
  )
}
