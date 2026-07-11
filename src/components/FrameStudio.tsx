import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StoredImage } from '../types'
import { useI18n } from '../i18n/I18nContext'
import { processImageFile } from '../utils/image'
import {
  downloadCanvas,
  FRAME_PRESETS,
  FrameSpec,
  randomFrameSpec,
  renderFramedImage,
} from '../utils/frames'
import { PHOTO_FRAMES, PhotoFrame, renderPhotoFramedImage } from '../utils/photoFrames'
import { IconClose, IconDownload, IconImage, IconUpload } from './Icons'

const DEFAULT_MAT = { width: 0.06, color: '#f6f2e7' }

type Selection =
  | { kind: 'spec'; id: string; spec: FrameSpec }
  | { kind: 'photo'; frame: PhotoFrame }

interface Props {
  image?: StoredImage
  title: string
  onClose: () => void
}

function fileSafe(s: string): string {
  return (s || 'artwork').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'artwork'
}

/**
 * The framing studio: photograph (or pick) the painting and dress it in a
 * procedurally rendered frame — curated presets or a random roll.
 */
export default function FrameStudio({ image, title, onClose }: Props) {
  const { t } = useI18n()
  const [photo, setPhoto] = useState<StoredImage | undefined>(image)
  const [selection, setSelection] = useState<Selection>({
    kind: 'spec',
    id: FRAME_PRESETS[0].id,
    spec: FRAME_PRESETS[0].spec,
  })
  const [matOn, setMatOn] = useState<boolean>(!!FRAME_PRESETS[0].spec.mat)
  const [busy, setBusy] = useState(false)

  // the mat toggle overrides whatever the preset/random roll came with
  const effective = useMemo(() => {
    if (selection.kind === 'photo') return selection
    const base = selection.spec
    let spec = base
    if (matOn && !base.mat) spec = { ...base, mat: DEFAULT_MAT }
    else if (!matOn && base.mat) spec = { ...base, mat: undefined }
    return { ...selection, spec }
  }, [selection, matOn])
  const holderRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const uploadRef = useRef<HTMLInputElement>(null)
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

  const selectedId =
    effective.kind === 'photo' ? effective.frame.id : effective.id

  const applyPreset = (id: string) => {
    const preset = FRAME_PRESETS.find((p) => p.id === id)
    if (preset) {
      setSelection({ kind: 'spec', id, spec: preset.spec })
      setMatOn(!!preset.spec.mat)
    }
  }

  const applyPhotoFrame = (frame: PhotoFrame) => {
    setSelection({ kind: 'photo', frame })
    setMatOn(false)
  }

  const rollRandom = () => {
    const rolled = randomFrameSpec()
    setSelection({ kind: 'spec', id: '', spec: rolled })
    setMatOn(!!rolled.mat)
  }

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

      <div className="framestudio-presets" onClick={(e) => e.stopPropagation()}>
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
        <span className="frame-chip-sep" />
        {PHOTO_FRAMES.map((f) => (
          <button
            key={f.id}
            className={`frame-chip frame-chip-real ${selectedId === f.id ? 'active' : ''}`}
            onClick={() => applyPhotoFrame(f)}
            title={t('frame.realHint')}
          >
            ★ {t(f.nameKey)}
          </button>
        ))}
        {PHOTO_FRAMES.length > 0 && <span className="frame-chip-sep" />}
        {FRAME_PRESETS.map((p) => (
          <button
            key={p.id}
            className={`frame-chip ${selectedId === p.id ? 'active' : ''}`}
            onClick={() => applyPreset(p.id)}
          >
            {t(p.nameKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
