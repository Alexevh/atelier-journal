// Localized painter-language sentence for a color (Analysis panel).
// Ported from Pigment Match; adapted to Atelier's i18n.
import { analyzeColor, type RGB } from './color'
import { translate, type Lang } from '../i18n'

const SAT_KEY: Record<string, string> = {
  'Very low': 'analysis.veryLowSat',
  Low: 'analysis.lowSat',
  Medium: 'analysis.medSat',
  High: 'analysis.highSat',
}

export function analysisSentence(rgb: RGB, lang: Lang): string {
  const a = analyzeColor(rgb)
  const t = (k: string, p?: Record<string, string | number>) => translate(k, p, lang)

  const neutral = a.hue === 'Neutral'
  const valueWord =
    a.value === 'Light'
      ? t('analysis.light')
      : a.value === 'Dark'
        ? t('analysis.dark')
        : t('analysis.midValue')
  const hueWord = t(`analysis.${a.hue}`).toLowerCase()

  const noun = neutral
    ? a.value === 'Light'
      ? t('analysis.lightGrey')
      : a.value === 'Dark'
        ? t('analysis.deepGrey')
        : t('analysis.grey')
    : lang === 'es'
      ? `${hueWord} ${valueWord}`
      : `${valueWord} ${hueWord}`

  const temp =
    a.temperature === 'Neutral'
      ? t('analysis.neutralTemp')
      : `${t('analysis.slightly')} ${t(`analysis.${a.temperature}`).toLowerCase()}`

  const tendency = a.tendency
    ? ` ${t('analysis.tendency', { hue: t(`analysis.${a.tendency}`).toLowerCase() })}`
    : ''

  return t('analysis.sentence', { sat: t(SAT_KEY[a.saturation]), noun, temp, tendency })
}
