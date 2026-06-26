import { ReactNode, useId, useState } from 'react'
import { IconChevron } from './Icons'

interface Props {
  title: string
  subtitle?: string
  icon?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  actions?: ReactNode
  count?: number
}

/**
 * An elegant collapsible section. Keeps the journal uncluttered — certificate
 * and artist-card panels stay collapsed by default.
 */
export default function CollapsiblePanel({
  title,
  subtitle,
  icon,
  defaultOpen = true,
  children,
  actions,
  count,
}: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const id = useId()

  return (
    <section className={`panel ${open ? 'is-open' : ''}`}>
      <header className="panel-head">
        <button
          className="panel-toggle"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
        >
          <span className="panel-chevron" data-open={open}>
            <IconChevron size={20} />
          </span>
          {icon && <span className="panel-icon">{icon}</span>}
          <span className="panel-titles">
            <span className="panel-title">{title}</span>
            {subtitle && <span className="panel-subtitle">{subtitle}</span>}
          </span>
          {typeof count === 'number' && <span className="panel-count">{count}</span>}
        </button>
        {actions && <div className="panel-actions">{actions}</div>}
      </header>
      <div className="panel-body-wrap" data-open={open} id={id} role="region">
        <div className="panel-body">{children}</div>
      </div>
    </section>
  )
}
