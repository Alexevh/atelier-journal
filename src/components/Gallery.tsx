import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { Project, ProjectStatus } from '../types'
import BrushDivider from './BrushDivider'
import StorageStatus from './StorageStatus'
import {
  IconCopy,
  IconImage,
  IconPlus,
  IconSearch,
  IconTrash,
} from './Icons'

interface Props {
  onOpen: (id: string) => void
}

type Filter = 'all' | ProjectStatus

export default function Gallery({ onOpen }: Props) {
  const { projects, addProject, duplicateProject, deleteProject, notify } = useApp()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return projects.filter((p) => {
      if (filter !== 'all' && p.status !== filter) return false
      if (!q) return true
      const haystack = [
        p.title,
        p.shortDescription,
        p.detailedDescription,
        p.technique,
        p.year,
        ...p.tags,
        ...p.materials.map((m) => m.text),
        ...p.entries.flatMap((e) => [e.title, e.description]),
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [projects, query, filter])

  const handleNew = () => {
    const p = addProject()
    onOpen(p.id)
  }

  return (
    <div className="fade-up">
      <section className="hero">
        <span className="eyebrow">{t('gallery.eyebrow')}</span>
        <h1>{t('gallery.heroTitle')}</h1>
        <p>{t('gallery.heroText')}</p>
      </section>

      <BrushDivider variant="bold" />

      <div className="gallery-toolbar">
        <div className="search-box">
          <span className="search-ico">
            <IconSearch size={17} />
          </span>
          <input
            type="search"
            placeholder={t('gallery.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label={t('gallery.searchAria')}
          />
        </div>
        <div className="filter-pills">
          {(['all', 'sketch', 'in_progress', 'finished', 'sold'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? t('filter.all') : t(`status.${f}`)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <IconPlus size={16} /> {t('gallery.newWork')}
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <h3>{t('gallery.emptyTitle')}</h3>
          <p className="muted">{t('gallery.emptyText')}</p>
          <button className="btn btn-primary" onClick={handleNew} style={{ marginTop: '1rem' }}>
            <IconPlus size={16} /> {t('gallery.beginNew')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{t('gallery.noneTitle')}</h3>
          <p className="muted">{t('gallery.noneText')}</p>
        </div>
      ) : (
        <div className="gallery-grid">
          {filtered.map((p) => (
            <ArtCard
              key={p.id}
              project={p}
              onOpen={() => onOpen(p.id)}
              onDuplicate={() => {
                duplicateProject(p.id)
                notify(t('notify.projectDuplicated'), 'success')
              }}
              onDelete={() => {
                if (confirm(t('gallery.confirmDelete', { title: p.title }))) {
                  deleteProject(p.id)
                  notify(t('notify.projectDeleted'), 'info')
                }
              }}
            />
          ))}
        </div>
      )}

      <StorageStatus />
    </div>
  )
}

function ArtCard({
  project,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  project: Project
  onOpen: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const cover = project.finalImage || project.referenceImage
  return (
    <article className="art-card" onClick={onOpen}>
      <div className="art-card-frame">
        {cover ? (
          <img src={cover.dataUrl} alt={project.title} loading="lazy" />
        ) : (
          <span className="art-card-empty">
            <IconImage size={30} />
            {t('gallery.untitledCanvas')}
          </span>
        )}
        <div className="art-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-icon btn-sm" title={t('common.duplicate')} onClick={onDuplicate}>
            <IconCopy size={15} />
          </button>
          <button className="btn btn-icon btn-sm btn-danger" title={t('common.delete')} onClick={onDelete}>
            <IconTrash size={15} />
          </button>
        </div>
      </div>
      <div className="art-card-body">
        <h3 className="art-card-title">{project.title || t('card.untitledWork')}</h3>
        <span className="art-card-meta">
          {[project.technique, project.year].filter(Boolean).join(' · ')}
        </span>
        {project.shortDescription && (
          <p className="art-card-meta" style={{ fontStyle: 'normal' }}>
            {project.shortDescription.slice(0, 80)}
            {project.shortDescription.length > 80 ? '…' : ''}
          </p>
        )}
        <div className="art-card-foot">
          <span className={`status-pip status-${project.status}`}>
            {t(`status.${project.status}`)}
          </span>
          <span className="muted" style={{ fontSize: '0.78rem' }}>
            {project.entries.length}{' '}
            {project.entries.length === 1 ? t('card.entrySingular') : t('card.entryPlural')}
          </span>
        </div>
      </div>
    </article>
  )
}
