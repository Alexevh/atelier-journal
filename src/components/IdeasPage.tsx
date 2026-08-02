import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { Idea, IdeaStatus, IDEA_STATUSES } from '../types'
import { formatLongDate } from '../utils/date'
import BrushDivider from './BrushDivider'
import {
  IconArrowLeft,
  IconIdea,
  IconImage,
  IconPlus,
  IconSearch,
  IconSprout,
  IconTrash,
} from './Icons'

interface Props {
  onBack: () => void
  onOpenProject: (id: string) => void
  onOpenIdea: (id: string) => void
}

type Filter = 'all' | IdeaStatus

export default function IdeasPage({ onBack, onOpenProject, onOpenIdea }: Props) {
  const { ideas, addIdea, deleteIdea, getProject } = useApp()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ideas
      .filter((i) => {
        if (filter !== 'all' && i.status !== filter) return false
        if (!q) return true
        return [i.title, i.note, ...i.tags, ...(i.entries ?? []).map((e) => e.text)]
          .join(' ')
          .toLowerCase()
          .includes(q)
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [ideas, query, filter])

  const handleNew = () => {
    const idea = addIdea()
    onOpenIdea(idea.id)
  }

  return (
    <div className="fade-up">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '1.2rem' }}>
        <IconArrowLeft size={16} /> {t('editor.back')}
      </button>

      <section className="hero" style={{ padding: '0 0 0.5rem' }}>
        <span className="eyebrow">{t('ideas.subtitle')}</span>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)' }}>{t('ideas.title')}</h1>
        <p>{t('ideas.intro')}</p>
      </section>

      <BrushDivider variant="bold" />

      <div className="gallery-toolbar">
        <div className="search-box">
          <span className="search-ico">
            <IconSearch size={17} />
          </span>
          <input
            type="search"
            placeholder={t('ideas.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="filter-pills">
          {(['all', ...IDEA_STATUSES] as Filter[]).map((f) => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? t('filter.all') : t(`idea.status.${f}`)}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={handleNew}>
          <IconPlus size={16} /> {t('ideas.new')}
        </button>
      </div>

      {ideas.length === 0 ? (
        <div className="empty-state">
          <h3>{t('ideas.emptyTitle')}</h3>
          <p className="muted">{t('ideas.emptyText')}</p>
          <button className="btn btn-primary" onClick={handleNew} style={{ marginTop: '1rem' }}>
            <IconPlus size={16} /> {t('ideas.new')}
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{t('gallery.noneTitle')}</h3>
          <p className="muted">{t('gallery.noneText')}</p>
        </div>
      ) : (
        <div className="ideas-grid">
          {filtered.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              projectTitle={
                idea.convertedProjectId ? getProject(idea.convertedProjectId)?.title : undefined
              }
              onOpen={() => onOpenIdea(idea.id)}
              onDelete={() => {
                if (confirm(t('ideas.deleteConfirm', { title: idea.title || t('ideas.untitled') }))) {
                  deleteIdea(idea.id)
                }
              }}
              onOpenProject={onOpenProject}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function IdeaCard({
  idea,
  projectTitle,
  onOpen,
  onDelete,
  onOpenProject,
}: {
  idea: Idea
  projectTitle?: string
  onOpen: () => void
  onDelete: () => void
  onOpenProject: (id: string) => void
}) {
  const { t } = useI18n()
  const cover = idea.images[0]
  const entryCount = (idea.entries ?? []).length

  return (
    <article className={`idea-card clickable status-border-${idea.status}`} onClick={onOpen}>
      <div className="idea-cover">
        {cover ? (
          <img src={cover.dataUrl} alt={idea.title} loading="lazy" />
        ) : (
          <span className="idea-cover-empty">
            <IconIdea size={26} />
          </span>
        )}
        {idea.images.length > 1 && (
          <span className="idea-cover-count">
            <IconImage size={12} /> {idea.images.length}
          </span>
        )}
        <div className="art-card-actions" onClick={(e) => e.stopPropagation()}>
          <button className="btn btn-icon btn-sm btn-danger" title={t('common.delete')} onClick={onDelete}>
            <IconTrash size={15} />
          </button>
        </div>
      </div>

      <div className="idea-body">
        <h3 className="idea-title">{idea.title || t('ideas.untitled')}</h3>
        <span className={`status-pip idea-status-${idea.status}`}>
          {t(`idea.status.${idea.status}`)}
        </span>
        {idea.note && <p className="idea-note clamp">{idea.note}</p>}

        {idea.tags.length > 0 && (
          <div className="tag-input-row" style={{ marginTop: '0.4rem' }}>
            {idea.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="chip">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="idea-foot">
          <span className="muted" style={{ fontSize: '0.74rem', fontStyle: 'italic' }}>
            {formatLongDate(new Date(idea.createdAt).toISOString().slice(0, 10))}
            {entryCount > 0 && ` · ${t('ideas.entryCount', { n: entryCount })}`}
          </span>
          {idea.convertedProjectId && (
            <button
              className="btn btn-sm btn-ghost"
              onClick={(e) => {
                e.stopPropagation()
                onOpenProject(idea.convertedProjectId!)
              }}
              title={t('ideas.openWork')}
            >
              <IconSprout size={14} /> {projectTitle || t('ideas.openWork')}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
