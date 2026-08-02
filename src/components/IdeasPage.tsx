import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useSettings } from '../context/SettingsContext'
import { useI18n } from '../i18n/I18nContext'
import { Idea, IdeaStatus, IDEA_STATUSES, StoredImage } from '../types'
import { createEntry, newProjectWithDefaults } from '../utils/factory'
import { processImageFile } from '../utils/image'
import { formatLongDate } from '../utils/date'
import BrushDivider from './BrushDivider'
import DropZone from './DropZone'
import ImageCarousel from './ImageCarousel'
import {
  IconArrowLeft,
  IconClose,
  IconEdit,
  IconIdea,
  IconPlus,
  IconSearch,
  IconSprout,
  IconTrash,
} from './Icons'

interface Props {
  onBack: () => void
  onOpenProject: (id: string) => void
}

type Filter = 'all' | IdeaStatus
const MAX_IMAGES = 6

export default function IdeasPage({ onBack, onOpenProject }: Props) {
  const { ideas, addIdea, updateIdea, deleteIdea, addProject, getProject, notify } = useApp()
  const { settings } = useSettings()
  const { t } = useI18n()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editingId, setEditingId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return ideas
      .filter((i) => {
        if (filter !== 'all' && i.status !== filter) return false
        if (!q) return true
        return [i.title, i.note, ...i.tags].join(' ').toLowerCase().includes(q)
      })
      .sort((a, b) => b.updatedAt - a.updatedAt)
  }, [ideas, query, filter])

  const handleNew = () => {
    const idea = addIdea()
    setEditingId(idea.id)
  }

  const convert = (idea: Idea) => {
    // build a new work seeded from the idea
    const base = newProjectWithDefaults(settings)
    const [first, ...rest] = idea.images
    const concept = createEntry({
      title: t('ideas.conceptEntry'),
      description: idea.note,
      images: rest,
    })
    const project = addProject({
      ...base,
      title: idea.title || base.title,
      detailedDescription: idea.note,
      referenceImage: first,
      entries: idea.note || rest.length ? [concept] : [],
      fromIdeaId: idea.id,
    })
    // archive the idea with a provenance link
    updateIdea(idea.id, (i) => ({ ...i, status: 'archived', convertedProjectId: project.id }))
    notify(t('ideas.converted'), 'success')
    onOpenProject(project.id)
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
              editing={editingId === idea.id}
              projectTitle={idea.convertedProjectId ? getProject(idea.convertedProjectId)?.title : undefined}
              onEdit={() => setEditingId(idea.id)}
              onDone={() => setEditingId(null)}
              onChange={(patch) => updateIdea(idea.id, (i) => ({ ...i, ...patch }))}
              onDelete={() => {
                if (confirm(t('ideas.deleteConfirm', { title: idea.title || t('ideas.untitled') }))) {
                  deleteIdea(idea.id)
                  if (editingId === idea.id) setEditingId(null)
                }
              }}
              onConvert={() => convert(idea)}
              onOpenProject={onOpenProject}
            />
          ))}
        </div>
      )}
    </div>
  )
}

async function imageFromPaste(e: React.ClipboardEvent): Promise<File | null> {
  const items = e.clipboardData?.items
  if (!items) return null
  for (const it of Array.from(items)) {
    if (it.type.startsWith('image/')) {
      const f = it.getAsFile()
      if (f) return f
    }
  }
  return null
}

function IdeaCard({
  idea,
  editing,
  projectTitle,
  onEdit,
  onDone,
  onChange,
  onDelete,
  onConvert,
  onOpenProject,
}: {
  idea: Idea
  editing: boolean
  projectTitle?: string
  onEdit: () => void
  onDone: () => void
  onChange: (patch: Partial<Idea>) => void
  onDelete: () => void
  onConvert: () => void
  onOpenProject: (id: string) => void
}) {
  const { t } = useI18n()
  const [tagDraft, setTagDraft] = useState('')

  const addImages = (imgs: StoredImage[]) => {
    const room = MAX_IMAGES - idea.images.length
    if (room <= 0) return
    onChange({ images: [...idea.images, ...imgs.slice(0, room)] })
  }
  const removeImage = (id: string) => onChange({ images: idea.images.filter((x) => x.id !== id) })
  const addTag = () => {
    const v = tagDraft.trim()
    if (v && !idea.tags.includes(v)) onChange({ tags: [...idea.tags, v] })
    setTagDraft('')
  }

  return (
    <article className={`idea-card status-border-${idea.status}`}>
      {editing ? (
        <div
          onPaste={async (e) => {
            const file = await imageFromPaste(e)
            if (file && idea.images.length < MAX_IMAGES) {
              e.preventDefault()
              addImages([await processImageFile(file)])
            }
          }}
        >
          <input
            className="idea-title-input"
            value={idea.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder={t('ideas.titlePlaceholder')}
            autoFocus
          />
          <textarea
            className="idea-note-input"
            value={idea.note}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder={t('ideas.notePlaceholder')}
            rows={4}
          />

          {idea.images.length > 0 && (
            <div className="thumb-strip">
              {idea.images.map((img) => (
                <div className="thumb" key={img.id}>
                  <img src={img.dataUrl} alt="" />
                  <button onClick={() => removeImage(img.id)} aria-label={t('entry.removePhoto')}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          {idea.images.length < MAX_IMAGES && (
            <DropZone multiple compact onImages={addImages} label={t('ideas.addImages')} hint={t('ideas.pasteHint')} />
          )}

          <div className="row wrap" style={{ marginTop: '0.6rem' }}>
            <div className="field" style={{ margin: 0, minWidth: 150 }}>
              <label>{t('ideas.statusLabel')}</label>
              <select
                value={idea.status}
                onChange={(e) => onChange({ status: e.target.value as IdeaStatus })}
              >
                {IDEA_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`idea.status.${s}`)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="tag-input-row" style={{ marginTop: '0.6rem' }}>
            {idea.tags.map((tag) => (
              <span key={tag} className="chip tag-chip">
                {tag}
                <button
                  aria-label={`${t('common.remove')} ${tag}`}
                  onClick={() => onChange({ tags: idea.tags.filter((x) => x !== tag) })}
                >
                  <IconClose size={12} />
                </button>
              </span>
            ))}
            <input
              style={{ width: 'auto', flex: 1, minWidth: 120 }}
              value={tagDraft}
              onChange={(e) => setTagDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault()
                  addTag()
                }
              }}
              placeholder={t('ph.tag')}
            />
          </div>

          <div className="row wrap" style={{ marginTop: '0.9rem' }}>
            <button className="btn btn-primary btn-sm" onClick={onDone}>
              {t('common.done')}
            </button>
            <button className="btn btn-ghost btn-sm btn-danger" onClick={onDelete}>
              <IconTrash size={15} /> {t('common.delete')}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="idea-head">
            <div>
              <h3 className="idea-title">{idea.title || t('ideas.untitled')}</h3>
              <span className={`status-pip idea-status-${idea.status}`}>
                {t(`idea.status.${idea.status}`)}
              </span>
            </div>
            <div className="entry-actions">
              <button className="btn btn-icon btn-ghost btn-sm" onClick={onEdit} title={t('common.edit') || 'Edit'}>
                <IconEdit size={15} />
              </button>
              <button className="btn btn-icon btn-ghost btn-sm btn-danger" onClick={onDelete} title={t('common.delete')}>
                <IconTrash size={15} />
              </button>
            </div>
          </div>

          {idea.images.length > 0 && <ImageCarousel images={idea.images} />}
          {idea.note && <p className="idea-note">{idea.note}</p>}

          {idea.tags.length > 0 && (
            <div className="tag-input-row" style={{ marginTop: '0.5rem' }}>
              {idea.tags.map((tag) => (
                <span key={tag} className="chip">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div className="idea-foot">
            <span className="muted" style={{ fontSize: '0.76rem', fontStyle: 'italic' }}>
              {formatLongDate(new Date(idea.createdAt).toISOString().slice(0, 10))}
            </span>
            {idea.convertedProjectId ? (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => onOpenProject(idea.convertedProjectId!)}
                title={t('ideas.openWork')}
              >
                {t('ideas.becameWork', { title: projectTitle || '' })}
              </button>
            ) : (
              <button className="btn btn-sm btn-primary" onClick={onConvert}>
                <IconSprout size={15} /> {t('ideas.convert')}
              </button>
            )}
          </div>
        </>
      )}
      {!editing && idea.images.length === 0 && !idea.note && (
        <span className="idea-empty-hint muted">
          <IconIdea size={15} /> {t('ideas.emptyCardHint')}
        </span>
      )}
    </article>
  )
}
