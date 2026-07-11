import { useRef, useState } from 'react'
import { StoredImage } from '../types'

interface Props {
  before: StoredImage
  after: StoredImage
  beforeLabel?: string
  afterLabel?: string
}

/**
 * A draggable before/after comparison. The "after" image sets the size; the
 * "before" image overlays it and is clipped up to the handle position, so
 * neither image ever distorts.
 */
export default function CompareSlider({ before, after, beforeLabel, afterLabel }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState(50)
  const [dragging, setDragging] = useState(false)

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
      <img className="compare-base" src={after.dataUrl} alt={afterLabel || ''} draggable={false} />
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
