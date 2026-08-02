import { useMemo, useState } from 'react'
import { useSettings } from '../context/SettingsContext'
import { useI18n } from '../i18n/I18nContext'
import {
  analyzeColor,
  buildHarmonies,
  buildVariations,
  clamp255,
  hexToRgb,
  isLight,
  rgbToHex,
  valueScore,
  type RGB,
} from '../color/color'
import {
  generateRecipe,
  recipePercentages,
  suggestPigment,
  type RecipeItem,
} from '../color/mixer'
import {
  isEnabled,
  libraryPigments,
  makeDefaultPalette,
  PALETTE_PRESETS,
  type Pigment,
} from '../color/pigments'
import { analysisSentence } from '../color/describe'
import BrushDivider from './BrushDivider'
import { IconArrowLeft, IconSearch } from './Icons'

interface Props {
  onBack: () => void
}

const FALLBACK: RGB = { r: 146, g: 112, b: 115 }

function dedupById(list: Pigment[]): Pigment[] {
  const seen = new Set<string>()
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
}

export default function ColorPage({ onBack }: Props) {
  const { settings, updateSettings } = useSettings()
  const { t, lang } = useI18n()
  const ct = settings.colorTool
  const setCt = (patch: Partial<typeof ct>) =>
    updateSettings((s) => ({ ...s, colorTool: { ...s.colorTool, ...patch } }))

  const target = hexToRgb(ct.targetHex) ?? FALLBACK
  const palette = useMemo(
    () => PALETTE_PRESETS.find((p) => p.id === ct.paletteId)?.make() ?? makeDefaultPalette(),
    [ct.paletteId],
  )
  const pigments = useMemo(() => palette.pigments.filter(isEnabled), [palette])

  const recipe = useMemo(
    () => generateRecipe(target, pigments, ct.mode, ct.engine, { maxColors: ct.maxColors }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ct.targetHex, ct.mode, ct.engine, ct.maxColors, ct.paletteId],
  )
  const percents = useMemo(() => recipePercentages(recipe.items), [recipe])
  const analysis = analyzeColor(target)
  const sentence = analysisSentence(target, lang)
  const variations = useMemo(() => buildVariations(target), [ct.targetHex])
  const harmonies = useMemo(() => buildHarmonies(target), [ct.targetHex])
  const suggestion = useMemo(
    () =>
      recipe.match < 90
        ? suggestPigment(
            target,
            pigments,
            dedupById(libraryPigments().map((x) => x.pigment)),
            recipe.deltaE,
          )
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipe, ct.paletteId],
  )

  const setTarget = (rgb: RGB) => setCt({ targetHex: rgbToHex(rgb) })

  const amountText = (item: RecipeItem, idx: number): string => {
    if (ct.unit === 'percent') {
      const p = percents[idx]
      return p === -1 ? t('color.ltOne') : `${p}%`
    }
    if (item.parts != null) {
      return `${item.parts} ${item.parts === 1 ? t('color.part') : t('color.parts')}`
    }
    const map: Record<string, string> = {
      'small touch': 'color.touchSmall',
      'tiny touch': 'color.touchTiny',
      'microscopic touch': 'color.touchMicro',
    }
    return t(map[item.amount] ?? 'color.touchSmall')
  }

  return (
    <div className="fade-up">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '1.2rem' }}>
        <IconArrowLeft size={16} /> {t('editor.back')}
      </button>

      <section className="hero" style={{ padding: '0 0 0.5rem' }}>
        <span className="eyebrow">{t('color.subtitle')}</span>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)' }}>{t('color.title')}</h1>
        <p>{t('color.intro')}</p>
      </section>

      <BrushDivider variant="bold" />

      <div className="color-layout">
        {/* ---- input column ---- */}
        <div className="panel" style={{ padding: '1.1rem 1.2rem' }}>
          <span className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            {t('color.target')}
          </span>
          <ColorInput rgb={target} onChange={setTarget} />

          <span className="label" style={{ display: 'block', margin: '1rem 0 0.4rem' }}>
            {t('color.palette')}
          </span>
          <select value={ct.paletteId} onChange={(e) => setCt({ paletteId: e.target.value })}>
            {PALETTE_PRESETS.filter((p) => !p.libraryHidden).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="muted" style={{ fontSize: '0.8rem', fontStyle: 'italic', marginTop: '0.5rem' }}>
            {t('color.pigmentsCount', { n: pigments.length })}
          </p>
        </div>

        {/* ---- result column ---- */}
        <div>
          <div className="color-swatch-row">
            <div>
              <span className="mini-label">{t('color.targetSwatch')}</span>
              <div className="color-swatch big" style={{ background: ct.targetHex }} />
              <span className="mono">{ct.targetHex}</span>
            </div>
            <div>
              <span className="mini-label">{t('color.mixSwatch')}</span>
              <div className="color-swatch big" style={{ background: recipe.mixedHex }} />
              <span className="mono">{recipe.mixedHex}</span>
            </div>
            <div className="color-scores">
              <div className="score">
                <b>{Math.round(recipe.match)}%</b>
                <span>{t('color.match')}</span>
              </div>
              <div className="score">
                <b>{Math.round(valueScore(recipe.deltaL))}%</b>
                <span>{t('color.value')}</span>
              </div>
            </div>
          </div>

          {/* analysis */}
          <div className="panel color-analysis">
            <div className="analysis-badges">
              <span className="chip">{t('color.aValue')}: {t(`color.v.${analysis.value}`)}</span>
              <span className="chip">{t('color.aTemp')}: {t(`color.t.${analysis.temperature}`)}</span>
              <span className="chip">{t('color.aSat')}: {t(`color.s.${analysis.saturation}`)}</span>
              <span className="chip">{t('color.aHue')}: {t(`color.h.${analysis.hue}`)}</span>
            </div>
            <p className="analysis-sentence">“{sentence}”</p>
          </div>

          {/* recipe */}
          <div className="panel">
            <div className="recipe-controls">
              <div className="seg">
                <button className={`seg-btn ${ct.engine === 'classic' ? 'active' : ''}`} onClick={() => setCt({ engine: 'classic' })}>
                  {t('color.classic')}
                </button>
                <button className={`seg-btn ${ct.engine === 'spectral' ? 'active' : ''}`} onClick={() => setCt({ engine: 'spectral' })}>
                  {t('color.spectral')}
                </button>
              </div>
              <div className="seg">
                <button className={`seg-btn ${ct.mode === 'simple' ? 'active' : ''}`} onClick={() => setCt({ mode: 'simple' })}>
                  {t('color.simple')}
                </button>
                <button className={`seg-btn ${ct.mode === 'precise' ? 'active' : ''}`} onClick={() => setCt({ mode: 'precise' })}>
                  {t('color.precise')}
                </button>
              </div>
              <div className="seg">
                <button className={`seg-btn ${ct.unit === 'parts' ? 'active' : ''}`} onClick={() => setCt({ unit: 'parts' })}>
                  {t('color.partsUnit')}
                </button>
                <button className={`seg-btn ${ct.unit === 'percent' ? 'active' : ''}`} onClick={() => setCt({ unit: 'percent' })}>
                  %
                </button>
              </div>
              <select
                value={ct.maxColors ?? 'auto'}
                onChange={(e) => setCt({ maxColors: e.target.value === 'auto' ? null : Number(e.target.value) })}
                style={{ width: 'auto' }}
              >
                <option value="auto">{t('color.maxAuto')}</option>
                {[2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {t('color.maxN', { n })}
                  </option>
                ))}
              </select>
            </div>

            <ul className="recipe-list">
              {recipe.items.map((item, idx) => (
                <li key={item.pigment.id}>
                  <span className="color-swatch" style={{ background: rgbToHex(item.pigment.rgb) }} />
                  <span className="grow">{item.pigment.name}</span>
                  <span className="recipe-amount">{amountText(item, idx)}</span>
                </li>
              ))}
            </ul>

            {suggestion && (
              <p className="reach-warn">
                {t('color.reach', {
                  name: suggestion.pigment.name,
                  match: Math.round(suggestion.match),
                })}
              </p>
            )}
          </div>

          {/* variations */}
          <div className="panel">
            <span className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('color.variations')}
            </span>
            <div className="swatch-grid">
              {variations.map((v) => (
                <button key={v.kind} className="swatch-tile" onClick={() => setTarget(v.rgb)}>
                  <span className="color-swatch" style={{ background: v.hex, color: isLight(v.rgb) ? '#1a1714' : '#f3ecdd' }} />
                  <span>{t(`color.var.${v.kind}`)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* harmonies */}
          <div className="panel">
            <span className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>
              {t('color.harmonies')}
            </span>
            <div className="swatch-grid">
              {harmonies.map((h) => (
                <button key={h.kind} className="swatch-tile" onClick={() => setTarget(h.rgb)}>
                  <span className="color-swatch" style={{ background: h.hex }} />
                  <span>{t(`color.harm.${h.kind}`)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ColorInput({ rgb, onChange }: { rgb: RGB; onChange: (rgb: RGB) => void }) {
  const { t } = useI18n()
  const [hexText, setHexText] = useState(rgbToHex(rgb))
  const hex = rgbToHex(rgb)
  const commitHex = (v: string) => {
    setHexText(v)
    const parsed = hexToRgb(v)
    if (parsed) onChange(parsed)
  }
  const setChan = (k: keyof RGB, v: number) => onChange({ ...rgb, [k]: clamp255(v) })

  const eyedrop = async () => {
    const ED = (window as unknown as { EyeDropper?: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper
    if (!ED) return
    try {
      const res = await new ED().open()
      const parsed = hexToRgb(res.sRGBHex)
      if (parsed) {
        onChange(parsed)
        setHexText(rgbToHex(parsed))
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <div>
      <div className="row" style={{ gap: '0.6rem' }}>
        <input
          type="color"
          className="color-picker"
          value={hex}
          onChange={(e) => {
            const parsed = hexToRgb(e.target.value)
            if (parsed) {
              onChange(parsed)
              setHexText(e.target.value.toUpperCase())
            }
          }}
        />
        <input
          className="grow mono"
          value={hexText}
          onChange={(e) => commitHex(e.target.value)}
          onBlur={() => setHexText(hex)}
          spellCheck={false}
        />
        {'EyeDropper' in window && (
          <button className="btn btn-icon btn-sm" onClick={eyedrop} title={t('color.eyedropper')}>
            <IconSearch size={15} />
          </button>
        )}
      </div>
      <div className="row" style={{ gap: '0.5rem', marginTop: '0.6rem' }}>
        {(['r', 'g', 'b'] as (keyof RGB)[]).map((k) => (
          <label key={k} className="rgb-field">
            <span>{k.toUpperCase()}</span>
            <input
              type="number"
              min={0}
              max={255}
              value={rgb[k]}
              onChange={(e) => setChan(k, Number(e.target.value))}
            />
          </label>
        ))}
      </div>
    </div>
  )
}
