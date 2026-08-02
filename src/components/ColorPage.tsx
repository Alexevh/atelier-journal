import { useEffect } from 'react'
import { useI18n } from '../i18n/I18nContext'
import { setTargetColor, useTargetColor } from '@/hooks/useTargetColor'
import { usePalettes } from '@/hooks/usePalettes'
import { isEnabled } from '@/lib/pigments'
import { setLang, useT } from '@/lib/i18n'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ColorInput } from '@/components/ColorInput'
import { ResultPanel } from '@/components/ResultPanel'
import { IconArrowLeft } from './Icons'

/**
 * The Colour / pigment-matching tool — the Pigment Match "Match" tab ported in
 * verbatim (its own components + Tailwind surface), mounted inside Atelier.
 */
export default function ColorPage({ onBack }: { onBack: () => void }) {
  const app = useI18n()
  const { t } = useT()
  const target = useTargetColor()
  const api = usePalettes()
  const effectivePigments = (api.active?.pigments ?? []).filter(isEnabled)

  // Bridge Atelier's language to the ported tool's own i18n.
  useEffect(() => {
    setLang(app.lang)
  }, [app.lang])

  return (
    <div className="pigment-scope fade-up">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '1rem' }}>
        <IconArrowLeft size={16} /> {app.t('editor.back')}
      </button>
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>{t('match.targetColor')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ColorInput rgb={target} onChange={setTargetColor} />
          </CardContent>
        </Card>
        <ResultPanel
          rgb={target}
          pigments={effectivePigments}
          onPick={setTargetColor}
          palettes={api.palettes}
          activeId={api.activeId}
          onSelectPalette={api.setActiveId}
        />
      </div>
    </div>
  )
}
