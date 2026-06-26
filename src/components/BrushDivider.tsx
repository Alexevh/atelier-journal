interface Props {
  variant?: 'fine' | 'bold'
  className?: string
}

/** A hand-painted-feel horizontal separator rendered as an organic SVG stroke. */
export default function BrushDivider({ variant = 'fine', className }: Props) {
  return (
    <div className={`brush-divider ${className ?? ''}`} aria-hidden="true">
      <svg viewBox="0 0 1000 22" preserveAspectRatio="none">
        <defs>
          <linearGradient id="brushFade" x1="0" x2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0" />
            <stop offset="0.12" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="0.88" stopColor="currentColor" stopOpacity="0.9" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M2 12 C 120 6, 200 16, 340 11 S 560 5, 700 12 S 880 18, 998 10"
          fill="none"
          stroke="url(#brushFade)"
          strokeWidth={variant === 'bold' ? 3.4 : 1.6}
          strokeLinecap="round"
        />
        {variant === 'bold' && (
          <path
            d="M40 15 C 160 12, 260 18, 420 14 S 640 11, 760 15"
            fill="none"
            stroke="url(#brushFade)"
            strokeWidth={0.8}
            strokeLinecap="round"
            opacity="0.5"
          />
        )}
      </svg>
    </div>
  )
}
