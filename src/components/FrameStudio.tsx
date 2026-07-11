import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CustomFrame, StoredImage } from '../types'
import { useApp } from '../context/AppContext'
import { useSettings } from '../context/SettingsContext'
import { useI18n } from '../i18n/I18nContext'
import { processImageFile } from '../utils/image'
import { analyzeFrameImage } from '../utils/frameAnalysis'
import { uid } from '../utils/id'
import {
  downloadCanvas,
  FRAME_PRESETS,
  FrameSpec,
  randomFrameSpec,
  renderFramedImage,
} from '../utils/frames'
import { PHOTO_FRAMES, PhotoFrame, renderPhotoFramedImage } from '../utils/photoFrames'
import { IconClose, IconDownload, IconImage, IconPlus, IconUpload } from './Icons'

const DEFAULT_MAT = { width: 0.06, color: '#f6f2e7' }

type Selection =
  | { kind: 'spec'; id: string; spec: FrameSpec }
  | { kind: 'photo'; frame: PhotoFrame }
  | { kind: 'custom'; id: string }

interface Props {
  image?: StoredImage
  title: string
  onClose: () => void
}

function fileSafe(s: string): string {
  return (s || 'artwork').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'artwork'
}

function customToPhotoFrame(c: CustomFrame): PhotoFrame {
  return { id: c.id, nameKey: '', dataUrl: c.dataUrl, insets: c.insets, scale: c.scale }
}

/**
 * The framing studio: photograph (or pick) the painting and dress it in a
 * procedurally rendered frame — curated presets, real museum frames, the
 * user's own imported frames, or a random roll.
 */
export default function FrameStudio({ image, title, onClose }: Props) {
  const { t } = useI18n()
  const { notify } = useApp()
  const { settings, updateSettings } = useSettings()
  const [photo, setPhoto] = useState<StoredImage | undefined>(image)
  const [selection, setSelection] = useState<Selection>({
    kind: 'spec',
    id: FRAME_PRESETS[0].id,
    spec: FRAME_PRESETS[0].spec,
  })
  const [matOn, setMatOn] = useState<boolean>(!!FRAME_PRESETS[0].spec.mat)
  const [busy, setBusy] = useState(false)
  const [tuneOpen, setTuneOpen] = useState(false)

  const customFrames = settings.customFrames

  // the mat toggle overrides whatever the preset/random roll came with;
  // custom selections resolve live from settings so slider tweaks re-render
  const effective = useMemo(() => {
    if (selection.kind === 'custom') {
      const c = customFrames.find((f) => f.id === selection.id)
      return c
        ? ({ kind: 'photo', frame: customToPhotoFrame(c) } as const)
        : ({ kind: 'spec', id: FRAME_PRESETS[0].id, spec: FRAME_PRESETS[0].spec } as const)
    }
    if (selection.kind === 'photo') return selection
    const base = selection.spec
    let spec = base
    if (matOn && !base.mat) spec = { ...base, mat: DEFAULT_MAT }
    else if (!matOn && base.mat) spec = { ...base, mat: undefined }
    return { ...selection, spec }
  }, [selection, matOn, customFrames])
  const holderRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
  const frameInputRef = useRef<HTMLInputElement>(null)
  const renderSeq = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // re-render the framed preview whenever photo or frame selection changes
  useEffect(() => {
    if (!photo) return
    const seq = ++renderSeq.current
    setBusy(true)
    const job =
      effective.kind === 'photo'
        ? renderPhotoFramedImage(photo.dataUrl, effective.frame, {
            mat: matOn ? DEFAULT_MAT : undefined,
          })
        : renderFramedImage(photo.dataUrl, effective.spec)
    job
      .then((canvas) => {
        if (seq !== renderSeq.current) return // superseded by a newer render
        canvasRef.current = canvas
        const holder = holderRef.current
        if (holder) {
          holder.innerHTML = ''
          canvas.className = 'framestudio-canvas'
          holder.appendChild(canvas)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (seq === renderSeq.current) setBusy(false)
      })
  }, [photo, effective, matOn])

  const pickFile = useCallback(async (file: File | undefined) => {
    if (!file) return
    setPhoto(await processImageFile(file))
  }, [])

  const applyPreset = (id: string) => {
    const preset = FRAME_PRESETS.find((p) => p.id === id)
    if (preset) {
      setSelection({ kind: 'spec', id, spec: preset.spec })
      setMatOn(!!preset.spec.mat)
      setTuneOpen(false)
    }
  }

  const applyPhotoFrame = (frame: PhotoFrame) => {
    setSelection({ kind: 'photo', frame })
    setMatOn(false)
    setTuneOpen(false)
  }

  const rollRandom = () => {
    const rolled = randomFrameSpec()
    setSelection({ kind: 'spec', id: '', spec: rolled })
    setMatOn(!!rolled.mat)
    setTuneOpen(false)
  }

  // ---- user-imported frames ------------------------------------------------
  const importFrame = useCallback(
    async (file: File | undefined) => {
      if (!file) return
      setBusy(true)
      try {
        const raw = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(String(reader.result))
          reader.onerror = () => reject(reader.error)
          reader.readAsDataURL(file)
        })
        const analysis = await analyzeFrameImage(raw)
        const frame: CustomFrame = {
          id: uid('cf_'),
          name: file.name.replace(/\.[^.]+$/, '').slice(0, 24) || t('frame.customDefault'),
          dataUrl: analysis.dataUrl,
          insets: analysis.insets,
          scale: 0.12,
        }
        updateSettings((s) => ({ ...s, customFrames: [...s.customFrames, frame] }))
        setSelection({ kind: 'custom', id: frame.id })
        setMatOn(false)
        setTuneOpen(!analysis.openingDetected)
        notify(
          analysis.openingDetected ? t('frame.customAdded') : t('frame.customAddedTune'),
          analysis.openingDetected ? 'success' : 'info',
        )
      } catch {
        notify(t('frame.customError'), 'error')
      } finally {
        setBusy(false)
      }
    },
    [updateSettings, notify, t],
  )

  const removeCustom = (id: string) => {
    if (!confirm(t('frame.customDeleteConfirm'))) return
    updateSettings((s) => ({ ...s, customFrames: s.customFrames.filter((f) => f.id !== id) }))
    if (selection.kind === 'custom' && selection.id === id) {
      setSelection({ kind: 'spec', id: FRAME_PRESETS[0].id, spec: FRAME_PRESETS[0].spec })
    }
  }

  const tuneCustom = (id: string, patch: Partial<CustomFrame> | { inset: keyof CustomFrame['insets']; value: number }) => {
    updateSettings((s) => ({
      ...s,
      customFrames: s.customFrames.map((f) => {
        if (f.id !== id) return f
        if ('inset' in patch) return { ...f, insets: { ...f.insets, [patch.inset]: patch.value } }
        return { ...f, ...patch }
      }),
    }))
  }

  const selectedCustom =
    selection.kind === 'custom' ? customFrames.find((f) => f.id === selection.id) : undefined

  return (
    <div className="study framestudio" role="dialog" aria-modal="true">
      <div className="study-toolbar" onClick={(e) => e.stopPropagation()}>
        <span className="framestudio-title">{t('frame.title')}</span>
        <span className="study-sep" />
        <button className="study-tool" onClick={() => cameraRef.current?.click()}>
          <IconImage size={15} /> {t('frame.takePhoto')}
        </button>
        <button className="study-tool" onClick={() => uploadRef.current?.click()}>
          <IconUpload size={15} /> {t('frame.uploadPhoto')}
        </button>
        <span className="study-sep" />
        <button
          className="study-tool"
          onClick={() => {
            if (canvasRef.current) downloadCanvas(canvasRef.current, `${fileSafe(title)}-framed.jpg`)
          }}
          disabled={!photo || busy}
        >
          <IconDownload size={15} /> {t('frame.download')}
        </button>
        <button className="study-tool" onClick={onClose} aria-label={t('carousel.close')}>
          <IconClose size={18} />
        </button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          pickFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <input
        ref={uploadRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          pickFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <input
        ref={frameInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          importFrame(e.target.files?.[0])
          e.target.value = ''
        }}
      />

      <div className="framestudio-stage">
        {photo ? (
          <div ref={holderRef} className={`framestudio-holder ${busy ? 'is-busy' : ''}`} />
        ) : (
          <div className="framestudio-empty">
            <IconImage size={40} />
            <p>{t('frame.empty')}</p>
            <div className="row">
              <button className="btn btn-primary btn-sm" onClick={() => cameraRef.current?.click()}>
                {t('frame.takePhoto')}
              </button>
              <button className="btn btn-sm" onClick={() => uploadRef.current?.click()}>
                {t('frame.uploadPhoto')}
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedCustom && tuneOpen && (
        <div className="frame-tune" onClick={(e) => e.stopPropagation()}>
          {(
            [
              ['l', t('frame.tuneLeft')],
              ['t', t('frame.tuneTop')],
              ['r', t('frame.tuneRight')],
              ['b', t('frame.tuneBottom')],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="frame-tune-row">
              <span>{label}</span>
              <input
                type="range"
                min={0.015}
                max={0.45}
                step={0.005}
                value={selectedCustom.insets[k]}
                onChange={(e) =>
                  tuneCustom(selectedCustom.id, { inset: k, value: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label className="frame-tune-row">
            <span>{t('frame.tuneScale')}</span>
            <input
              type="range"
              min={0.03}
              max={0.3}
              step={0.005}
              value={selectedCustom.scale}
              onChange={(e) => tuneCustom(selectedCustom.id, { scale: Number(e.target.value) })}
            />
          </label>
        </div>
      )}

      <div className="framestudio-presets" onClick={(e) => e.stopPropagation()}>
        <select
          className="frame-select"
          value={
            selection.kind === 'custom'
              ? `custom:${selection.id}`
              : selection.kind === 'photo'
                ? `real:${selection.frame.id}`
                : selection.id
                  ? `spec:${selection.id}`
                  : '__random'
          }
          onChange={(e) => {
            const v = e.target.value
            if (v === '__random') {
              rollRandom()
            } else if (v.startsWith('custom:')) {
              setSelection({ kind: 'custom', id: v.slice(7) })
              setMatOn(false)
              setTuneOpen(false)
            } else if (v.startsWith('real:')) {
              const f = PHOTO_FRAMES.find((x) => x.id === v.slice(5))
              if (f) applyPhotoFrame(f)
            } else if (v.startsWith('spec:')) {
              applyPreset(v.slice(5))
            }
          }}
          aria-label={t('frame.select')}
        >
          {selection.kind === 'spec' && !selection.id && (
            <option value="__random">🎲 {t('frame.random')}</option>
          )}
          {customFrames.length > 0 && (
            <optgroup label={t('frame.groupCustom')}>
              {customFrames.map((f) => (
                <option key={f.id} value={`custom:${f.id}`}>
                  {f.name}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={t('frame.groupReal')}>
            {PHOTO_FRAMES.map((f) => (
              <option key={f.id} value={`real:${f.id}`}>
                ★ {t(f.nameKey)}
              </option>
            ))}
          </optgroup>
          <optgroup label={t('frame.groupClassic')}>
            {FRAME_PRESETS.map((p) => (
              <option key={p.id} value={`spec:${p.id}`}>
                {t(p.nameKey)}
              </option>
            ))}
          </optgroup>
        </select>

        <button className="frame-chip frame-chip-random" onClick={rollRandom}>
          🎲 {t('frame.random')}
        </button>
        <button
          className={`frame-chip ${matOn ? 'active' : ''}`}
          onClick={() => setMatOn((v) => !v)}
          title={t('frame.matHint')}
        >
          {t('frame.mat')}
        </button>
        <button
          className="frame-chip frame-chip-random"
          onClick={() => frameInputRef.current?.click()}
          title={t('frame.customHint')}
          disabled={busy}
        >
          <IconPlus size={12} /> {t('frame.customAdd')}
        </button>
        {selectedCustom && (
          <>
            <button
              className={`frame-chip ${tuneOpen ? 'active' : ''}`}
              onClick={() => setTuneOpen((v) => !v)}
              title={t('frame.tune')}
            >
              ⚙ {t('frame.tune')}
            </button>
            <button
              className="frame-chip"
              onClick={() => removeCustom(selectedCustom.id)}
              title={t('common.delete')}
            >
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  )
}
