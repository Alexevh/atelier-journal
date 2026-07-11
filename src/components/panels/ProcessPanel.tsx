import { useState } from 'react'
import {
  ArtisticNote,
  ProcessEntry,
  Project,
  StoredImage,
} from '../../types'
import { useI18n } from '../../i18n/I18nContext'
import { createEntry } from '../../utils/factory'
import { formatDuration, formatLongDate } from '../../utils/date'
import BrushDivider from '../BrushDivider'
import DropZone from '../DropZone'
import ImageCarousel from '../ImageCarousel'
import { IconEdit, IconPlus, IconTrash } from '../Icons'
import NotesEditor from './NotesEditor'

interface Props {
  project: Project
  update: (updater: (p: Project) => Project) => void
}

const MAX_IMAGES = 5

const TEMPLATE_KEYS = [
  'tpl.sketch',
  'tpl.blockin',
  'tpl.colorStudy',
  'tpl.firstPass',
  'tpl.glazing',
  'tpl.finalDetails',
]

export default function ProcessPanel({ project, update }: Props) {
  const { t } = useI18n()
  const setEntries = (entries: ProcessEntry[]) =>
    update((p) => ({ ...p, entries }))

  const addEntry = (title?: string) => {
    const entry = createEntry(title ? { title } : undefined)
    setEntries([...project.entries, entry])
    setEditingId(entry.id)
  }

  const updateEntry = (id: string, patch: Partial<ProcessEntry>) =>
    setEntries(project.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const removeEntry = (id: string) =>
    setEntries(project.entries.filter((e) => e.id !== id))

  const [editingId, setEditingId] = useState<string | null>(null)

  const totalMinutes = project.entries.reduce((sum, e) => sum + (e.minutes ?? 0), 0)

  return (
    <div>
      {totalMinutes > 0 && (
        <p className="muted" style={{ fontStyle: 'italic', marginTop: 0 }}>
          {t('time.total', { time: formatDuration(totalMinutes) })}
        </p>
      )}

      {project.entries.length === 0 ? (
        <p className="muted" style={{ fontStyle: 'italic' }}>
          {t('process.empty')}
        </p>
      ) : (
        <div className="timeline">
          {project.entries.map((entry, idx) => (
            <EntryCard
              key={entry.id}
              index={idx + 1}
              entry={entry}
              editing={editingId === entry.id}
              onEdit={() => setEditingId(entry.id)}
              onDone={() => setEditingId(null)}
              onChange={(patch) => updateEntry(entry.id, patch)}
              onRemove={() => {
                if (confirm(t('entry.confirmDelete', { title: entry.title }))) {
                  removeEntry(entry.id)
                  if (editingId === entry.id) setEditingId(null)
                }
              }}
            />
          ))}
        </div>
      )}

      <div className="template-row">
        <span className="template-label">{t('process.quickAdd')}</span>
        {TEMPLATE_KEYS.map((k) => (
          <button key={k} className="template-chip" onClick={() => addEntry(t(k))}>
            <IconPlus size={12} /> {t(k)}
          </button>
        ))}
      </div>

      <button className="btn btn-primary" onClick={() => addEntry()} style={{ marginTop: '0.6rem' }}>
        <IconPlus size={16} /> {t('process.addEntry')}
      </button>
    </div>
  )
}

function EntryCard({
  index,
  entry,
  editing,
  onEdit,
  onDone,
  onChange,
  onRemove,
}: {
  index: number
  entry: ProcessEntry
  editing: boolean
  onEdit: () => void
  onDone: () => void
  onChange: (patch: Partial<ProcessEntry>) => void
  onRemove: () => void
}) {
  const { t } = useI18n()
  const addImages = (imgs: StoredImage[]) => {
    const room = MAX_IMAGES - entry.images.length
    if (room <= 0) return
    onChange({ images: [...entry.images, ...imgs.slice(0, room)] })
  }
  const removeImage = (id: string) =>
    onChange({ images: entry.images.filter((i) => i.id !== id) })
  const setNotes = (notes: ArtisticNote[]) => onChange({ notes })

  return (
    <div className="entry-card">
      <span className="entry-node">{String(index).padStart(2, '0')}</span>
      <div className="entry-inner">
        {editing ? (
          <>
            <div className="grid-2">
              <div className="field">
                <label>{t('entry.title')}</label>
                <input
                  value={entry.title}
                  onChange={(e) => onChange({ title: e.target.value })}
                  placeholder={t('entry.titlePlaceholder')}
                />
              </div>
              <div className="field">
                <label>{t('entry.date')}</label>
                <input
                  type="date"
                  value={entry.date}
                  onChange={(e) => onChange({ date: e.target.value })}
                />
              </div>
              <div className="field">
                <label>{t('entry.minutes')}</label>
                <input
                  type="number"
                  min={0}
                  step={5}
                  value={entry.minutes ?? ''}
                  onChange={(e) =>
                    onChange({ minutes: e.target.value ? Math.max(0, Number(e.target.value)) : undefined })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div className="field">
              <label>{t('entry.description')}</label>
              <textarea
                value={entry.description}
                onChange={(e) => onChange({ description: e.target.value })}
                rows={4}
                placeholder={t('entry.descPlaceholder')}
              />
            </div>

            <span className="label">
              {t('entry.photos', { n: entry.images.length, max: MAX_IMAGES })}
            </span>
            {entry.images.length > 0 && (
              <div className="thumb-strip">
                {entry.images.map((img) => (
                  <div className="thumb" key={img.id}>
                    <img src={img.dataUrl} alt={img.name || ''} />
                    <button onClick={() => removeImage(img.id)} aria-label={t('entry.removePhoto')}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            {entry.images.length < MAX_IMAGES && (
              <DropZone
                multiple
                onImages={addImages}
                label={t('entry.addPhotos')}
                hint={t('entry.photosHint', { n: MAX_IMAGES - entry.images.length })}
                compact
              />
            )}

            <NotesEditor notes={entry.notes} onChange={setNotes} />

            <div className="row" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" onClick={onDone}>
                {t('common.done')}
              </button>
              <button className="btn btn-ghost btn-danger" onClick={onRemove}>
                <IconTrash size={15} /> {t('entry.deleteEntry')}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="entry-head">
              <div>
                <h3 className="entry-title">{entry.title}</h3>
                <span className="entry-date">
                  {[entry.date && formatLongDate(entry.date), formatDuration(entry.minutes ?? 0)]
                    .filter(Boolean)
                    .join('  ·  ')}
                </span>
              </div>
              <div className="entry-actions">
                <button
                  className="btn btn-icon btn-ghost btn-sm"
                  onClick={onEdit}
                  title={t('entry.editTitle')}
                >
                  <IconEdit size={15} />
                </button>
                <button
                  className="btn btn-icon btn-ghost btn-sm btn-danger"
                  onClick={onRemove}
                  title={t('entry.deleteTitle')}
                >
                  <IconTrash size={15} />
                </button>
              </div>
            </div>

            {entry.images.length > 0 && (
              <ImageCarousel images={entry.images} />
            )}

            {entry.description && <p className="entry-desc">{entry.description}</p>}

            {entry.notes.length > 0 && (
              <div className="notes-block">
                <div className="notes-heading">{t('notes.heading')}</div>
                {entry.notes.map((n) => (
                  <div className="note-card" key={n.id}>
                    {n.category && (
                      <span className="note-category">{t(`note.${n.category}`)}</span>
                    )}
                    <div className="note-text">{n.text}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <BrushDivider />
    </div>
  )
}
