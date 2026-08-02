import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
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
import { buildColorString } from '../color/strings'
import { analysisSentence } from '../color/describe'
import BrushDivider from './BrushDivider'
import { IconArrowLeft, IconClose, IconSearch } from './Icons'

interface Props {
  onBack: () => void
}

const FALLBACK: RGB = { r: 146, g: 112, b: 115 }

function dedupById(list: Pigment[]): Pigment[] {
  const seen = new Set<string>()
  return list.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)))
}

/** weight(0..1) × total → numeric string for the unit (no label). */
function formatBatchQty(weight: number, total: number, unit: string): string {
  const q = weight * total
  if (q <= 0) return ''
  if (unit === 'drops') {
    const r = Math.round(q)
    return r < 1 ? '<1' : `${r}`
  }
  if (q < 0.1) return '<0.1'
  const r = Math.round(q * 10) / 10
  return r % 1 === 0 ? r.toFixed(0) : r.toFixed(1)
}

export default function ColorPage({ onBack }: Props) {
  const { settings, updateSettings } = useSettings()
  const { notify } = useApp()
  const { t, lang } = useI18n()
  const ct = settings.colorTool
  const [helpOpen, setHelpOpen] = useState(false)
  const setCt = (patch: Partial<typeof ct>) =>
    updateSettings((s) => ({ ...s, colorTool: { ...s.colorTool, ...patch } }))

  const target = hexToRgb(ct.targetHex) ?? FALLBACK
  const palette = useMemo(
    () => PALETTE_PRESETS.find((p) => p.id === ct.paletteId)?.make() ?? makeDefaultPalette(),
    [ct.paletteId],
  )
  const pigments = useMemo(() => palette.pigments.filter(isEnabled), [palette])
  const requiredIds = ct.requiredIds.filter((id) => pigments.some((p) => p.id === id))

  const recipe = useMemo(
    () =>
      generateRecipe(target, pigments, ct.mode, ct.engine, {
        maxColors: ct.maxColors,
        valuePriority: ct.valuePriority,
        goldenRatio: ct.goldenRatio,
        requiredIds,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ct.targetHex, ct.mode, ct.engine, ct.maxColors, ct.valuePriority, ct.goldenRatio, ct.paletteId, requiredIds.join(',')],
  )
  const percents = useMemo(() => recipePercentages(recipe.items), [recipe])
  const analysis = analyzeColor(target)
  const sentence = analysisSentence(target, lang)
  const variations = useMemo(() => buildVariations(target), [ct.targetHex])
  const harmonies = useMemo(() => buildHarmonies(target), [ct.targetHex])
  const suggestion = useMemo(
    () =>
      recipe.match < 90
        ? suggestPigment(target, pigments, dedupById(libraryPigments().map((x) => x.pigment)), recipe.deltaE)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recipe, ct.paletteId],
  )

  const setTarget = (rgb: RGB) => setCt({ targetHex: rgbToHex(rgb) })
  const addableTubes = pigments.filter((p) => !requiredIds.includes(p.id))

  const amountText = (item: RecipeItem, idx: number): string => {
    if (ct.unit === 'percent') {
      const p = percents[idx]
      return p === -1 ? t('color.ltOne') : `${p}%`
    }
    if (item.parts != null) return `${item.parts} ${item.parts === 1 ? t('color.part') : t('color.parts')}`
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

      <div className="color-grid3">
        {/* ---- col 1: target input ---- */}
        <div className="panel" style={{ padding: '1.1rem 1.2rem' }}>
          <span className="label" style={{ display: 'block', marginBottom: '0.6rem' }}>
            {t('color.target')}
          </span>
          <ColorInput rgb={target} onChange={setTarget} />
        </div>

        {/* ---- col 2: swatch + analysis ---- */}
        <div>
          <div className="panel" style={{ padding: '1.1rem 1.2rem', marginBottom: '1.1rem' }}>
            <div className="color-swatch big" style={{ background: ct.targetHex, height: 120 }} />
            <div className="color-target-caption">
              <b>{t('color.targetSwatch')}</b>
              <span className="mono">
                {ct.targetHex} · rgb({target.r}, {target.g}, {target.b})
              </span>
            </div>
          </div>

          <div className="panel color-analysis">
            <span className="label" style={{ display: 'block' }}>{t('color.analysisTitle')}</span>
            <p className="analysis-sentence">“{sentence}”</p>
            <div className="analysis-rows">
              <div className="analysis-row">
                <span>{t('color.aValue')}</span>
                <span className="pill">{t(`color.v.${analysis.value}`)}</span>
              </div>
              <div className="analysis-row">
                <span>{t('color.aTemp')}</span>
                <span className="pill">{t(`color.t.${analysis.temperature}`)}</span>
              </div>
              <div className="analysis-row">
                <span>{t('color.aSat')}</span>
                <span className="pill">{t(`color.s.${analysis.saturation}`)}</span>
              </div>
              <div className="analysis-row">
                <span>{t('color.aHue')}</span>
                <span className="pill">{t(`color.h.${analysis.hue}`)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ---- col 3: recipe ---- */}
        <div className="panel color-recipe">
          <div className="recipe-header">
            <span className="label">{t('color.recipeTitle')}</span>
            <select value={ct.paletteId} onChange={(e) => setCt({ paletteId: e.target.value })} className="palette-select">
              {PALETTE_PRESETS.filter((p) => !p.libraryHidden).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* required tubes */}
          <div className="required-tubes">
            <span className="mini-label">{t('color.requiredTubes')}</span>
            <div className="row wrap" style={{ gap: '0.4rem' }}>
              {requiredIds.map((id) => {
                const p = pigments.find((x) => x.id === id)
                if (!p) return null
                return (
                  <span key={id} className="chip tag-chip">
                    <span className="color-swatch" style={{ width: 12, height: 12, background: rgbToHex(p.rgb) }} />
                    {p.name}
                    <button onClick={() => setCt({ requiredIds: requiredIds.filter((x) => x !== id) })} aria-label={t('common.remove')}>
                      <IconClose size={12} />
                    </button>
                  </span>
                )
              })}
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) setCt({ requiredIds: [...requiredIds, e.target.value] })
                }}
                style={{ width: 'auto' }}
              >
                <option value="">{t('color.addTube')}</option>
                {addableTubes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button className="link-btn" onClick={() => setHelpOpen((v) => !v)}>
            {t('color.optionsHelp')}
          </button>
          {helpOpen && <p className="options-help">{t('color.optionsHelpBody')}</p>}

          <div className="recipe-controls">
            <div className="seg">
              {(['classic', 'spectral', 'km2'] as const).map((e) => (
                <button key={e} className={`seg-btn ${ct.engine === e ? 'active' : ''}`} onClick={() => setCt({ engine: e })}>
                  {t(`color.${e === 'km2' ? 'km2' : e}`)}
                </button>
              ))}
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
          </div>
          <div className="recipe-controls">
            <select value={ct.maxColors ?? 'auto'} onChange={(e) => setCt({ maxColors: e.target.value === 'auto' ? null : Number(e.target.value) })} style={{ width: 'auto' }}>
              <option value="auto">{t('color.maxAuto')}</option>
              {[2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {t('color.maxN', { n })}
                </option>
              ))}
            </select>
            <button className={`toggle-chip ${ct.valuePriority ? 'active' : ''}`} onClick={() => setCt({ valuePriority: !ct.valuePriority })}>
              {t('color.valuePriority')}
            </button>
            <button className={`toggle-chip ${ct.goldenRatio ? 'active' : ''}`} onClick={() => setCt({ goldenRatio: !ct.goldenRatio })}>
              φ {t('color.golden')}
            </button>
          </div>

          <ul className="recipe-list">
            {recipe.items.map((item, idx) => {
              const qty = ct.batchAmount > 0 ? formatBatchQty(item.weight, ct.batchAmount, ct.batchUnit) : ''
              return (
                <li key={item.pigment.id}>
                  <span className="color-swatch" style={{ background: rgbToHex(item.pigment.rgb), borderRadius: '50%' }} />
                  <span className="recipe-amount strong">{amountText(item, idx)}</span>
                  <span className="grow">{item.pigment.name}</span>
                  {qty && <span className="recipe-qty">{qty} {ct.batchUnit}</span>}
                </li>
              )
            })}
          </ul>

          {/* batch */}
          <div className="row wrap" style={{ gap: '0.5rem', marginTop: '0.8rem', alignItems: 'center' }}>
            <span className="mini-label">{t('color.batch')}</span>
            <input
              type="number"
              min={0}
              value={ct.batchAmount || ''}
              onChange={(e) => setCt({ batchAmount: Math.max(0, Number(e.target.value) || 0) })}
              style={{ width: 80 }}
              placeholder="0"
            />
            <select value={ct.batchUnit} onChange={(e) => setCt({ batchUnit: e.target.value as 'ml' | 'g' | 'drops' })} style={{ width: 'auto' }}>
              <option value="ml">ml</option>
              <option value="g">g</option>
              <option value="drops">{t('color.drops')}</option>
            </select>
          </div>

          {/* scorecard */}
          <div className="recipe-scorecard">
            <span className="sc-mix">
              <span className="color-swatch" style={{ background: recipe.mixedHex }} />
              <span className="mono">{recipe.mixedHex}</span>
            </span>
            <span className="sc-score">
              <b>{Math.round(valueScore(recipe.deltaL))}%</b>
              <span>{t('color.value')} · ΔL {recipe.deltaL.toFixed(1)}</span>
            </span>
            <span className="sc-score">
              <b>{Math.round(recipe.match)}%</b>
              <span>{t('color.match')} · ΔE {recipe.deltaE.toFixed(1)}</span>
            </span>
          </div>

          {suggestion && (
            <p className="reach-warn">
              {t('color.reach', { name: suggestion.pigment.name, match: Math.round(suggestion.match) })}
            </p>
          )}

          <button className="btn btn-sm" style={{ marginTop: '0.8rem' }} onClick={() => notify(t('color.saveSoon'), 'info')}>
            {t('color.save')}
          </button>
        </div>
      </div>

      {/* value scale (color string) */}
      <ColorStringPanel target={target} pigments={pigments} mode={ct.mode} engine={ct.engine} />

      {/* variations + harmonies */}
      <div className="color-grid2" style={{ marginTop: '1.2rem' }}>
        <div className="panel">
          <span className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>{t('color.variations')}</span>
          <div className="swatch-grid">
            {variations.map((v) => (
              <button key={v.kind} className="swatch-tile" onClick={() => setTarget(v.rgb)}>
                <span className="color-swatch" style={{ background: v.hex }} />
                <span>{t(`color.var.${v.kind}`)}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="panel">
          <span className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>{t('color.harmonies')}</span>
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
  )
}

function ColorStringPanel({
  target,
  pigments,
  mode,
  engine,
}: {
  target: RGB
  pigments: Pigment[]
  mode: 'simple' | 'precise'
  engine: 'classic' | 'spectral' | 'km2'
}) {
  const { t } = useI18n()
  const [darkenerId, setDarkenerId] = useState('')
  const [sel, setSel] = useState<number | null>(null)
  const hex = rgbToHex(target)
  useEffect(() => {
    setDarkenerId('')
    setSel(null)
  }, [hex])
  const cs = useMemo(
    () => buildColorString(target, pigments, mode, engine, { darkenerId: darkenerId || undefined }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hex, mode, engine, darkenerId, pigments],
  )
  if (!cs || cs.steps.length < 2) return null
  const selected = sel != null ? cs.steps[sel] : null

  return (
    <div className="panel" style={{ marginTop: '1.2rem' }}>
      <span className="label" style={{ display: 'block' }}>{t('color.cs.title')}</span>
      <p className="muted" style={{ fontSize: '0.85rem', fontStyle: 'italic', margin: '0.4rem 0 0.7rem' }}>
        {t('color.cs.intro')}
      </p>
      {cs.dark && cs.darkChoices.length > 0 && (
        <label className="row" style={{ gap: '0.5rem', marginBottom: '0.7rem', fontSize: '0.82rem' }}>
          <span className="muted" style={{ fontStyle: 'italic' }}>{t('color.cs.darkenWith')}</span>
          <select value={cs.dark.id} onChange={(e) => setDarkenerId(e.target.value)} style={{ width: 'auto' }}>
            {cs.darkChoices.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>
      )}
      <div className="value-strip">
        {cs.steps.map((s, i) => (
          <button
            key={i}
            className={`value-step ${sel === i ? 'sel' : ''}`}
            style={{ background: s.hex, color: isLight(s.rgb) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.75)' }}
            onClick={() => setSel(sel === i ? null : i)}
            title={s.hex}
          >
            {Math.round(s.L)}
            {i === cs.baseIndex && <span className="value-base-dot" style={{ background: isLight(s.rgb) ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.85)' }} />}
          </button>
        ))}
      </div>
      {selected && (
        <div className="value-detail">
          <p style={{ margin: 0 }}>
            {selected.add
              ? t('color.cs.add', { percent: selected.add.percent, name: selected.add.pigment.name })
              : t('color.cs.base')}
          </p>
          <div className="row wrap" style={{ gap: '0.8rem', marginTop: '0.4rem', fontSize: '0.78rem' }}>
            {cs.pigments
              .map((p, i) => ({ p, w: selected.weights[i] ?? 0 }))
              .filter((x) => x.w > 0.005)
              .sort((a, b) => b.w - a.w)
              .map(({ p, w }) => (
                <span key={p.id} className="row" style={{ gap: '0.3rem' }}>
                  <span className="color-swatch" style={{ width: 12, height: 12, borderRadius: '50%', background: rgbToHex(p.rgb) }} />
                  {p.name} · {Math.round(w * 100)}%
                </span>
              ))}
          </div>
        </div>
      )}
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
      <div className="color-input-labels">
        <span>{t('color.selector')}</span>
        <span>HEX</span>
      </div>
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
        <input className="grow mono" value={hexText} onChange={(e) => commitHex(e.target.value)} onBlur={() => setHexText(hex)} spellCheck={false} />
        {'EyeDropper' in window && (
          <button className="btn btn-sm" onClick={eyedrop} title={t('color.eyedropper')}>
            <IconSearch size={14} /> {t('color.screen')}
          </button>
        )}
      </div>
      <div className="row" style={{ gap: '0.5rem', marginTop: '0.8rem' }}>
        {(['r', 'g', 'b'] as (keyof RGB)[]).map((k) => (
          <label key={k} className="rgb-field">
            <span>{k.toUpperCase()}</span>
            <input type="number" min={0} max={255} value={rgb[k]} onChange={(e) => setChan(k, Number(e.target.value))} />
          </label>
        ))}
      </div>
    </div>
  )
}
