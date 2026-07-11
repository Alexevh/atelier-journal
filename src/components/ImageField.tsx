import { useState } from 'react'
import { StoredImage } from '../types'
import { processImageFile } from '../utils/image'
import { useI18n } from '../i18n/I18nContext'
import DropZone from './DropZone'
import StudyLightbox from './StudyLightbox'
import { IconSearch, IconTrash, IconUpload } from './Icons'

interface Props {
  label?: string
  image?: StoredImage
  onChange: (image: StoredImage | undefined) => void
  dropLabel?: string
  maxDimension?: number
  /** white card styling for signatures/logos with transparency */
  signature?: boolean
  /** show a "study" button opening the painter's image tools */
  study?: boolean
}

/** A single-image picker with preview, replace and remove. */
export default function ImageField({
  label,
  image,
  onChange,
  dropLabel,
  maxDimension,
  signature,
  study,
}: Props) {
  const { t } = useI18n()
  const [studyOpen, setStudyOpen] = useState(false)
  return (
    <div className={`image-slot ${signature ? 'sig-slot' : ''}`}>
      {label && <span className="label">{label}</span>}
      {image ? (
        <div className={signature ? 'sig-preview' : 'image-preview'}>
          <img
            src={image.dataUrl}
            alt={image.name || label || ''}
            onClick={() => study && setStudyOpen(true)}
            style={study ? { cursor: 'zoom-in' } : undefined}
          />
          <div className={signature ? 'row' : 'replace-bar'} style={signature ? { marginTop: 8, justifyContent: 'center' } : undefined}>
            {study && (
              <button className="btn btn-sm" onClick={() => setStudyOpen(true)}>
                <IconSearch size={14} /> {t('study.open')}
              </button>
            )}
            <label className="btn btn-sm">
              <IconUpload size={14} /> {t('common.replace')}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    onChange(await processImageFile(file, maxDimension ? { maxDimension } : {}))
                  }
                  e.target.value = ''
                }}
              />
            </label>
            <button className="btn btn-sm btn-danger" onClick={() => onChange(undefined)}>
              <IconTrash size={14} /> {t('common.remove')}
            </button>
          </div>
          {studyOpen && (
            <StudyLightbox images={[image]} onClose={() => setStudyOpen(false)} />
          )}
        </div>
      ) : (
        <DropZone
          onImages={(imgs) => onChange(imgs[0])}
          label={dropLabel || t('dropzone.dropImage')}
          maxDimension={maxDimension}
          compact={signature}
        />
      )}
    </div>
  )
}
