import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useSettings } from '../context/SettingsContext'
import { useI18n } from '../i18n/I18nContext'
import { Idea, IdeaEntry, IdeaStatus, IDEA_STATUSES, StoredImage } from '../types'
import { createEntry, createIdeaEntry, newProjectWithDefaults } from '../utils/factory'
import { processImageFile } from '../utils/image'
import { formatLongDate } from '../utils/date'
import BrushDivider from './BrushDivider'
import DropZone from './DropZone'
import ImageCarousel from './ImageCarousel'
import {
  IconArrowLeft,
  IconClose,
  IconPlus,
  IconSprout,
  IconTrash,
} from './Icons'

interface Props {
  ideaId: string
  onBack: () => void
  onOpenProject: (id: string) => void
}

const MAX_IMAGES = 6
const MAX_ENTRY_IMAGES = 4

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

/** Full-page editor for one idea: spark data + a dated development timeline. */
export default function IdeaEditor({ ideaId, onBack, onOpenProject }: Props) {
  const { ideas, updateIdea, deleteIdea, addProject, getProject, notify } = useApp()
  const { settings } = useSettings()
  const { t } = useI18n()
  const [tagDraft, setTagDraft] = useState('')

  const idea = ideas.find((i) => i.id === ideaId)
  if (!idea) {
    return (
      <div className="empty-state">
        <h3>{t('ideas.notFound')}</h3>
        <button className="btn" onClick={onBack} style={{ marginTop: '1rem' }}>
          <IconArrowLeft size={16} /> {t('ideas.backToIdeas')}
        </button>
      </div>
    )
  }

  const entries = idea.entries ?? []
  const update = (patch: Partial<Idea>) => updateIdea(idea.id, (i) => ({ ...i, ...patch }))

  const addImages = (imgs: StoredImage[]) => {
    const room = MAX_IMAGES - idea.images.length
    if (room <= 0) return
    update({ images: [...idea.images, ...imgs.slice(0, room)] })
  }
  const addTag = () => {
    const v = tagDraft.trim()
    if (v && !idea.tags.includes(v)) update({ tags: [...idea.tags, v] })
    setTagDraft('')
  }

  const updateEntry = (id: string, patch: Partial<IdeaEntry>) =>
    update({ entries: entries.map((e) => (e.id === id ? { ...e, ...patch } : e)) })
  const removeEntry = (id: string) =>
    update({ entries: entries.filter((e) => e.id !== id) })
  const addEntry = () => update({ entries: [...entries, createIdeaEntry()] })

  const convert = () => {
    const base = newProjectWithDefaults(settings)
    const [first, ...rest] = idea.images
    const concept = createEntry({
      title: t('ideas.conceptEntry'),
      description: idea.note,
      images: rest,
    })
    // the idea's dated development notes become process entries too
    const developments = [...entries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((e) => e.text.trim() || e.images.length)
      .map((e) =>
        createEntry({
          title: t('ideas.developmentEntry'),
          date: e.date,
          description: e.text,
          images: e.images.slice(0, 5),
        }),
      )
    const project = addProject({
      ...base,
      title: idea.title || base.title,
      detailedDescription: idea.note,
      referenceImage: first,
      entries: [...(idea.note || rest.length ? [concept] : []), ...developments],
      fromIdeaId: idea.id,
    })
    updateIdea(idea.id, (i) => ({ ...i, status: 'archived', convertedProjectId: project.id }))
    notify(t('ideas.converted'), 'success')
    onOpenProject(project.id)
  }

  const projectTitle = idea.convertedProjectId
    ? getProject(idea.convertedProjectId)?.title
    : undefined

  return (
    <div className="fade-up">
      <div className="row wrap" style={{ marginBottom: '1.2rem', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={onBack}>
          <IconArrowLeft size={16} /> {t('ideas.backToIdeas')}
        </button>
        <div className="row wrap">
          {idea.convertedProjectId ? (
            <button
              className="btn btn-sm"
              onClick={() => onOpenProject(idea.convertedProjectId!)}
            >
              {t('ideas.becameWork', { title: projectTitle || '' })}
            </button>
          ) : (
            <button className="btn btn-sm btn-primary" onClick={convert}>
              <IconSprout size={15} /> {t('ideas.convert')}
            </button>
          )}
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (confirm(t('ideas.deleteConfirm', { title: idea.title || t('ideas.untitled') }))) {
                deleteIdea(idea.id)
                onBack()
              }
            }}
          >
            <IconTrash size={15} /> {t('common.delete')}
          </button>
        </div>
      </div>

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
          className="editor-title-input"
          style={{ width: '100%' }}
          value={idea.title}
          onChange={(e) => update({ title: e.target.value })}
          placeholder={t('ideas.titlePlaceholder')}
        />
        <div className="editor-statusbar">
          <select
            value={idea.status}
            onChange={(e) => update({ status: e.target.value as IdeaStatus })}
            style={{ width: 'auto' }}
          >
            {IDEA_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`idea.status.${s}`)}
              </option>
            ))}
          </select>
          <span>
            {t('ideas.created', {
              date: formatLongDate(new Date(idea.createdAt).toISOString().slice(0, 10)),
            })}
          </span>
        </div>

        <BrushDivider variant="bold" />

        <div className="idea-editor-grid">
          <div>
            <div className="field">
              <label>{t('ideas.noteLabel')}</label>
              <textarea
                value={idea.note}
                onChange={(e) => update({ note: e.target.value })}
                placeholder={t('ideas.notePlaceholder')}
                rows={6}
              />
            </div>

            <div className="field">
              <label>{t('field.tags')}</label>
              <div className="tag-input-row">
                {idea.tags.map((tag) => (
                  <span key={tag} className="chip tag-chip">
                    {tag}
                    <button
                      aria-label={`${t('common.remove')} ${tag}`}
                      onClick={() => update({ tags: idea.tags.filter((x) => x !== tag) })}
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
            </div>
          </div>

          <div>
            <span className="label" style={{ display: 'block', marginBottom: '0.4rem' }}>
              {t('ideas.imagesLabel', { n: idea.images.length, max: MAX_IMAGES })}
            </span>
            {idea.images.length > 0 && <ImageCarousel images={idea.images} onRemove={(id) => update({ images: idea.images.filter((x) => x.id !== id) })} />}
            {idea.images.length < MAX_IMAGES && (
              <DropZone multiple compact onImages={addImages} label={t('ideas.addImages')} hint={t('ideas.pasteHint')} />
            )}
          </div>
        </div>
      </div>

      {/* ---- dated development timeline ---- */}
      <BrushDivider />
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3 style={{ fontSize: '1.4rem' }}>{t('ideas.timeline')}</h3>
        <button className="btn btn-sm btn-primary" onClick={addEntry}>
          <IconPlus size={15} /> {t('ideas.addEntry')}
        </button>
      </div>
      <p className="muted" style={{ fontStyle: 'italic', fontSize: '0.88rem' }}>
        {t('ideas.timelineHint')}
      </p>

      {entries.length === 0 ? (
        <p className="muted" style={{ fontStyle: 'italic' }}>{t('ideas.noEntries')}</p>
      ) : (
        <div className="timeline" style={{ marginTop: '0.8rem' }}>
          {entries.map((entry, idx) => (
            <IdeaEntryCard
              key={entry.id}
              index={idx + 1}
              entry={entry}
              onChange={(patch) => updateEntry(entry.id, patch)}
              onRemove={() => {
                if (confirm(t('ideas.deleteEntryConfirm'))) removeEntry(entry.id)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function IdeaEntryCard({
  index,
  entry,
  onChange,
  onRemove,
}: {
  index: number
  entry: IdeaEntry
  onChange: (patch: Partial<IdeaEntry>) => void
  onRemove: () => void
}) {
  const { t } = useI18n()
  const addImages = (imgs: StoredImage[]) => {
    const room = MAX_ENTRY_IMAGES - entry.images.length
    if (room <= 0) return
    onChange({ images: [...entry.images, ...imgs.slice(0, room)] })
  }
  return (
    <div className="entry-card">
      <span className="entry-node">{String(index).padStart(2, '0')}</span>
      <div
        className="entry-inner"
        onPaste={async (e) => {
          const file = await imageFromPaste(e)
          if (file && entry.images.length < MAX_ENTRY_IMAGES) {
            e.preventDefault()
            addImages([await processImageFile(file)])
          }
        }}
      >
        <div className="row wrap" style={{ justifyContent: 'space-between' }}>
          <input
            type="date"
            value={entry.date}
            onChange={(e) => onChange({ date: e.target.value })}
            style={{ width: 'auto' }}
          />
          <button className="btn btn-icon btn-ghost btn-sm btn-danger" onClick={onRemove} title={t('common.delete')}>
            <IconTrash size={15} />
          </button>
        </div>
        <textarea
          value={entry.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder={t('ideas.entryPlaceholder')}
          rows={3}
          style={{ marginTop: '0.5rem' }}
        />
        {entry.images.length > 0 && (
          <div className="thumb-strip">
            {entry.images.map((img) => (
              <div className="thumb" key={img.id}>
                <img src={img.dataUrl} alt="" />
                <button
                  onClick={() => onChange({ images: entry.images.filter((x) => x.id !== img.id) })}
                  aria-label={t('entry.removePhoto')}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        {entry.images.length < MAX_ENTRY_IMAGES && (
          <DropZone multiple compact onImages={addImages} label={t('ideas.addImages')} hint={t('ideas.pasteHint')} />
        )}
      </div>
    </div>
  )
}
