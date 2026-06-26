import { useState } from 'react'
import { Material, Project } from '../../types'
import { useI18n } from '../../i18n/I18nContext'
import { uid } from '../../utils/id'
import { IconGrip, IconPlus, IconTrash } from '../Icons'

interface Props {
  project: Project
  update: (updater: (p: Project) => Project) => void
}

export default function MaterialsPanel({ project, update }: Props) {
  const { t } = useI18n()
  const SUGGESTIONS = ['mat.s1', 'mat.s2', 'mat.s3', 'mat.s4', 'mat.s5', 'mat.s6'].map((k) =>
    t(k),
  )
  const [draft, setDraft] = useState('')
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  const setMaterials = (materials: Material[]) =>
    update((p) => ({ ...p, materials }))

  const add = (text: string) => {
    const t = text.trim()
    if (!t) return
    setMaterials([...project.materials, { id: uid('m_'), text: t }])
    setDraft('')
  }

  const edit = (id: string, text: string) =>
    setMaterials(project.materials.map((m) => (m.id === id ? { ...m, text } : m)))

  const remove = (id: string) =>
    setMaterials(project.materials.filter((m) => m.id !== id))

  const reorder = (from: string, to: string) => {
    if (from === to) return
    const list = [...project.materials]
    const fromIdx = list.findIndex((m) => m.id === from)
    const toIdx = list.findIndex((m) => m.id === to)
    if (fromIdx < 0 || toIdx < 0) return
    const [moved] = list.splice(fromIdx, 1)
    list.splice(toIdx, 0, moved)
    setMaterials(list)
  }

  return (
    <div>
      <div className="material-list">
        {project.materials.map((m) => (
          <div
            key={m.id}
            className={`material-row ${dragId === m.id ? 'dragging' : ''} ${
              overId === m.id ? 'drag-over' : ''
            }`}
            draggable
            onDragStart={() => setDragId(m.id)}
            onDragEnd={() => {
              setDragId(null)
              setOverId(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              setOverId(m.id)
            }}
            onDrop={() => {
              if (dragId) reorder(dragId, m.id)
              setOverId(null)
            }}
          >
            <span className="material-grip" title={t('materials.dragTitle')}>
              <IconGrip size={16} />
            </span>
            <span className="material-bullet" />
            <input
              value={m.text}
              onChange={(e) => edit(m.id, e.target.value)}
              aria-label={t('panel.materials.title')}
            />
            <button
              className="btn btn-icon btn-ghost btn-sm btn-danger"
              onClick={() => remove(m.id)}
              aria-label={t('materials.removeAria')}
            >
              <IconTrash size={15} />
            </button>
          </div>
        ))}
      </div>

      {project.materials.length === 0 && (
        <p className="muted" style={{ fontStyle: 'italic' }}>
          {t('materials.empty')}
        </p>
      )}

      <div className="row" style={{ marginTop: '0.6rem' }}>
        <input
          className="grow"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            }
          }}
          placeholder={t('materials.addPlaceholder')}
          list="material-suggestions"
        />
        <datalist id="material-suggestions">
          {SUGGESTIONS.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <button className="btn" onClick={() => add(draft)}>
          <IconPlus size={15} /> {t('common.add')}
        </button>
      </div>
    </div>
  )
}
