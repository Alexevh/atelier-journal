import { useEffect, useState } from 'react'
import { StoredImage } from '../types'
import { useI18n } from '../i18n/I18nContext'
import StudyLightbox from './StudyLightbox'
import { IconChevron, IconTrash } from './Icons'

interface Props {
  images: StoredImage[]
  onRemove?: (id: string) => void
  /** show a fullscreen lightbox on click */
  lightbox?: boolean
}

/** A gentle, photography-first carousel used inside process entries. */
export default function ImageCarousel({ images, onRemove, lightbox = true }: Props) {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState(false)

  useEffect(() => {
    if (index > images.length - 1) setIndex(Math.max(0, images.length - 1))
  }, [images.length, index])

  if (!images.length) return null
  const current = images[Math.min(index, images.length - 1)]
  const go = (d: number) =>
    setIndex((i) => (i + d + images.length) % images.length)

  return (
    <div className="carousel">
      <div className="carousel-stage">
        <img
          src={current.dataUrl}
          alt={current.name || `Image ${index + 1}`}
          className="carousel-img"
          onClick={() => lightbox && setZoom(true)}
        />
        {images.length > 1 && (
          <>
            <button className="carousel-nav prev" onClick={() => go(-1)} aria-label={t('carousel.prev')}>
              <span style={{ transform: 'rotate(90deg)', display: 'inline-flex' }}>
                <IconChevron />
              </span>
            </button>
            <button className="carousel-nav next" onClick={() => go(1)} aria-label={t('carousel.next')}>
              <span style={{ transform: 'rotate(-90deg)', display: 'inline-flex' }}>
                <IconChevron />
              </span>
            </button>
          </>
        )}
        {onRemove && (
          <button
            className="carousel-remove"
            onClick={() => onRemove(current.id)}
            aria-label={t('carousel.remove')}
            title={t('carousel.remove')}
          >
            <IconTrash size={16} />
          </button>
        )}
        {images.length > 1 && (
          <span className="carousel-counter">
            {index + 1} / {images.length}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <div className="carousel-dots">
          {images.map((img, i) => (
            <button
              key={img.id}
              className={`carousel-dot ${i === index ? 'active' : ''}`}
              onClick={() => setIndex(i)}
              aria-label={t('carousel.goto', { n: i + 1 })}
            />
          ))}
        </div>
      )}

      {zoom && (
        <StudyLightbox images={images} startIndex={index} onClose={() => setZoom(false)} />
      )}
    </div>
  )
}
