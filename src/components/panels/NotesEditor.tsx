import { useState } from 'react'
import { ArtisticNote, NoteCategory, NOTE_CATEGORY_LABELS } from '../../types'
import { useI18n } from '../../i18n/I18nContext'
import { uid } from '../../utils/id'
import { IconPlus, IconTrash } from '../Icons'

interface Props {
  notes: ArtisticNote[]
  onChange: (notes: ArtisticNote[]) => void
}

const CATEGORIES = Object.keys(NOTE_CATEGORY_LABELS) as NoteCategory[]

/**
 * Editor for "Artistic Decisions and Discoveries" — the atelier-notebook layer
 * that records not just what was done, but why.
 */
export default function NotesEditor({ notes, onChange }: Props) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [category, setCategory] = useState<NoteCategory | ''>('')

  const add = () => {
    const t = text.trim()
    if (!t) return
    onChange([
      ...notes,
      { id: uid('n_'), text: t, category: category || undefined },
    ])
    setText('')
    setCategory('')
  }

  const update = (id: string, patch: Partial<ArtisticNote>) =>
    onChange(notes.map((n) => (n.id === id ? { ...n, ...patch } : n)))

  const remove = (id: string) => onChange(notes.filter((n) => n.id !== id))

  return (
    <div className="notes-block">
      <div className="notes-heading">{t('notes.heading')}</div>

      {notes.map((n) => (
        <div key={n.id} className="note-edit">
          <select
            value={n.category || ''}
            onChange={(e) =>
              update(n.id, { category: (e.target.value || undefined) as NoteCategory | undefined })
            }
          >
            <option value="">{t('notes.noCategory')}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`note.${c}`)}
              </option>
            ))}
          </select>
          <textarea
            className="grow"
            rows={2}
            value={n.text}
            onChange={(e) => update(n.id, { text: e.target.value })}
            placeholder={t('notes.existingPlaceholder')}
          />
          <button
            className="btn btn-icon btn-ghost btn-danger"
            onClick={() => remove(n.id)}
            aria-label={t('notes.removeAria')}
          >
            <IconTrash size={15} />
          </button>
        </div>
      ))}

      <div className="note-edit">
        <select value={category} onChange={(e) => setCategory(e.target.value as NoteCategory | '')}>
          <option value="">{t('notes.category')}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t(`note.${c}`)}
            </option>
          ))}
        </select>
        <textarea
          className="grow"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('notes.newPlaceholder')}
        />
        <button className="btn" onClick={add} aria-label={t('notes.addAria')}>
          <IconPlus size={15} />
        </button>
      </div>
    </div>
  )
}
