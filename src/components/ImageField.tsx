import { StoredImage } from '../types'
import { processImageFile } from '../utils/image'
import { useI18n } from '../i18n/I18nContext'
import DropZone from './DropZone'
import { IconTrash, IconUpload } from './Icons'

interface Props {
  label?: string
  image?: StoredImage
  onChange: (image: StoredImage | undefined) => void
  dropLabel?: string
  maxDimension?: number
  /** white card styling for signatures/logos with transparency */
  signature?: boolean
}

/** A single-image picker with preview, replace and remove. */
export default function ImageField({
  label,
  image,
  onChange,
  dropLabel,
  maxDimension,
  signature,
}: Props) {
  const { t } = useI18n()
  return (
    <div className={`image-slot ${signature ? 'sig-slot' : ''}`}>
      {label && <span className="label">{label}</span>}
      {image ? (
        <div className={signature ? 'sig-preview' : 'image-preview'}>
          <img src={image.dataUrl} alt={image.name || label || ''} />
          <div className={signature ? 'row' : 'replace-bar'} style={signature ? { marginTop: 8, justifyContent: 'center' } : undefined}>
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
