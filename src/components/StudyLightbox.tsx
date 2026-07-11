import { useEffect, useState } from 'react'
import { StoredImage } from '../types'
import { useI18n } from '../i18n/I18nContext'
import { IconChevron, IconClose } from './Icons'

interface Props {
  images: StoredImage[]
  startIndex?: number
  onClose: () => void
}

/**
 * A fullscreen image viewer with the tools a painter reaches for when studying
 * a reference: grayscale (values), a composition grid, horizontal mirror and
 * zoom. Everything is CSS/transform based — no image processing needed.
 */
export default function StudyLightbox({ images, startIndex = 0, onClose }: Props) {
  const { t } = useI18n()
  const [index, setIndex] = useState(startIndex)
  const [gray, setGray] = useState(false)
  const [grid, setGrid] = useState(false)
  const [mirror, setMirror] = useState(false)
  const [zoom, setZoom] = useState(1)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length)
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, onClose])

  if (!images.length) return null
  const current = images[Math.min(index, images.length - 1)]

  return (
    <div className="study" role="dialog" aria-modal="true">
      <div className="study-toolbar" onClick={(e) => e.stopPropagation()}>
        <button
          className={`study-tool ${gray ? 'active' : ''}`}
          onClick={() => setGray((v) => !v)}
        >
          {t('study.values')}
        </button>
        <button
          className={`study-tool ${grid ? 'active' : ''}`}
          onClick={() => setGrid((v) => !v)}
        >
          {t('study.grid')}
        </button>
        <button
          className={`study-tool ${mirror ? 'active' : ''}`}
          onClick={() => setMirror((v) => !v)}
        >
          {t('study.mirror')}
        </button>
        <span className="study-sep" />
        <button className="study-tool" onClick={() => setZoom((z) => Math.max(1, z - 0.25))}>
          −
        </button>
        <span className="study-zoom">{Math.round(zoom * 100)}%</span>
        <button className="study-tool" onClick={() => setZoom((z) => Math.min(4, z + 0.25))}>
          +
        </button>
        <span className="study-sep" />
        <button className="study-tool" onClick={onClose} aria-label={t('carousel.close')}>
          <IconClose size={18} />
        </button>
      </div>

      <div className="study-stage" onClick={onClose}>
        <div
          className="study-frame"
          onClick={(e) => e.stopPropagation()}
          style={{
            transform: `scale(${zoom}) scaleX(${mirror ? -1 : 1})`,
          }}
        >
          <img
            src={current.dataUrl}
            alt={current.name || ''}
            style={{ filter: gray ? 'grayscale(1) contrast(1.05)' : 'none' }}
            draggable={false}
          />
          {grid && (
            <div className="study-grid">
              <span style={{ left: '33.333%' }} />
              <span style={{ left: '66.666%' }} />
              <span className="h" style={{ top: '33.333%' }} />
              <span className="h" style={{ top: '66.666%' }} />
            </div>
          )}
        </div>

        {images.length > 1 && (
          <>
            <button
              className="carousel-nav prev"
              onClick={(e) => {
                e.stopPropagation()
                setIndex((i) => (i - 1 + images.length) % images.length)
              }}
              aria-label={t('carousel.prev')}
            >
              <span style={{ transform: 'rotate(90deg)', display: 'inline-flex' }}>
                <IconChevron />
              </span>
            </button>
            <button
              className="carousel-nav next"
              onClick={(e) => {
                e.stopPropagation()
                setIndex((i) => (i + 1) % images.length)
              }}
              aria-label={t('carousel.next')}
            >
              <span style={{ transform: 'rotate(-90deg)', display: 'inline-flex' }}>
                <IconChevron />
              </span>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
