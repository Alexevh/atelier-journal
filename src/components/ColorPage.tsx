import { useEffect } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { setLang } from '@/lib/i18n'
import PigmentApp from './PigmentApp'
import { IconArrowLeft } from './Icons'

/**
 * Mounts the full Pigment Match suite (ported verbatim) inside Atelier.
 * Language is bridged both ways: Atelier's toggle drives the tool, and the
 * tool's own EN/ES toggle drives Atelier.
 */
export default function ColorPage({ onBack }: { onBack: () => void }) {
  const app = useI18n()

  // Atelier language → ported tool
  useEffect(() => {
    setLang(app.lang)
  }, [app.lang])

  return (
    <div className="pigment-scope fade-up">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '0.6rem' }}>
        <IconArrowLeft size={16} /> {app.t('editor.back')}
      </button>
      <PigmentApp onSetLang={(l) => app.setLang(l)} />
    </div>
  )
}
