import { useCallback, useRef, useState } from 'react'
import { isImageFile, processImageFile } from '../utils/image'
import { useI18n } from '../i18n/I18nContext'
import { StoredImage } from '../types'
import { IconImage } from './Icons'

interface Props {
  onImages: (images: StoredImage[]) => void
  multiple?: boolean
  label?: string
  hint?: string
  compact?: boolean
  /** processing options forwarded to the compressor (e.g. signatures use PNG). */
  maxDimension?: number
}

/**
 * Drag-and-drop (or click) image upload with in-browser compression.
 * Nothing leaves the device.
 */
export default function DropZone({
  onImages,
  multiple = false,
  label,
  hint,
  compact = false,
  maxDimension,
}: Props) {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  const [busy, setBusy] = useState(false)

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || !files.length) return
      const images = Array.from(files).filter(isImageFile)
      if (!images.length) return
      setBusy(true)
      try {
        const processed = await Promise.all(
          (multiple ? images : [images[0]]).map((f) =>
            processImageFile(f, maxDimension ? { maxDimension } : {}),
          ),
        )
        onImages(processed)
      } finally {
        setBusy(false)
      }
    },
    [multiple, onImages, maxDimension],
  )

  return (
    <div
      className={`dropzone ${over ? 'is-over' : ''} ${compact ? 'is-compact' : ''}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        handleFiles(e.dataTransfer.files)
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={multiple}
        hidden
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <span className="dropzone-icon">
        <IconImage size={compact ? 20 : 28} />
      </span>
      <span className="dropzone-label">
        {busy ? t('dropzone.processing') : label ?? t('dropzone.default')}
      </span>
      {!compact && <span className="dropzone-hint">{hint ?? t('dropzone.hint')}</span>}
    </div>
  )
}
