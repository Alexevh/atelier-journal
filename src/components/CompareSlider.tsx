import { useRef, useState } from 'react'
import { StoredImage } from '../types'

interface Props {
  before: StoredImage
  after: StoredImage
  beforeLabel?: string
  afterLabel?: string
}

/**
 * A draggable before/after comparison. Both photos are fitted into the SAME
 * frame (shaped like the final artwork) and scaled to fit — whole, centred,
 * never stretched — so a reference with different proportions or resolution
 * lines up with the painting instead of looking cropped or deformed.
 */
export default function CompareSlider({ before, after, beforeLabel, afterLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)
  // frame shape: the final artwork's proportions (stored size, else measured)
  const [measured, setMeasured] = useState<string | null>(null)
  const ratio = after.width && after.height ? `${after.width} / ${after.height}` : measured

  const moveTo = (clientX: number) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const p = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.max(0, Math.min(100, p)))
  }

  return (
    <div
      ref={ref}
      className="compare"
      style={ratio ? { aspectRatio: ratio } : undefined}
      onPointerDown={(e) => {
        setDragging(true)
        e.currentTarget.setPointerCapture(e.pointerId)
        moveTo(e.clientX)
      }}
      onPointerMove={(e) => dragging && moveTo(e.clientX)}
      onPointerUp={(e) => {
        setDragging(false)
        e.currentTarget.releasePointerCapture(e.pointerId)
      }}
    >
      <img
        className="compare-base"
        src={after.dataUrl}
        alt={afterLabel || ''}
        draggable={false}
        onLoad={(e) => {
          const im = e.currentTarget
          if (im.naturalWidth && im.naturalHeight) setMeasured(`${im.naturalWidth} / ${im.naturalHeight}`)
        }}
      />
      <img
        className="compare-overlay"
        src={before.dataUrl}
        alt={beforeLabel || ''}
        draggable={false}
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      />
      {beforeLabel && <span className="compare-tag left">{beforeLabel}</span>}
      {afterLabel && <span className="compare-tag right">{afterLabel}</span>}
      <div className="compare-handle" style={{ left: `${pos}%` }}>
        <span className="compare-knob" />
      </div>
    </div>
  )
}
