import { useState } from 'react'
import { Project, ProjectStatus, STATUS_LABELS } from '../../types'
import { useI18n } from '../../i18n/I18nContext'
import CompareSlider from '../CompareSlider'
import FrameStudio from '../FrameStudio'
import ImageField from '../ImageField'
import { IconClose, IconImage } from '../Icons'

interface Props {
  project: Project
  update: (updater: (p: Project) => Project) => void
}

export default function ArtworkInfoPanel({ project, update }: Props) {
  const { t } = useI18n()
  const [tagDraft, setTagDraft] = useState('')
  const [framing, setFraming] = useState(false)

  const set = <K extends keyof Project>(key: K, value: Project[K]) =>
    update((p) => ({ ...p, [key]: value }))

  const addTag = () => {
    const t = tagDraft.trim()
    if (!t) return
    if (!project.tags.includes(t)) update((p) => ({ ...p, tags: [...p.tags, t] }))
    setTagDraft('')
  }

  return (
    <div>
      <div className="grid-2">
        <div className="field">
          <label>{t('field.year')}</label>
          <input
            value={project.year}
            onChange={(e) => set('year', e.target.value)}
            placeholder={t('ph.year')}
          />
        </div>
        <div className="field">
          <label>{t('field.status')}</label>
          <select
            value={project.status}
            onChange={(e) => set('status', e.target.value as ProjectStatus)}
          >
            {(Object.keys(STATUS_LABELS) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>{t('field.technique')}</label>
          <input
            value={project.technique}
            onChange={(e) => set('technique', e.target.value)}
            placeholder={t('ph.technique')}
          />
        </div>
        <div className="field">
          <label>{t('field.dimensions')}</label>
          <input
            value={project.dimensions}
            onChange={(e) => set('dimensions', e.target.value)}
            placeholder={t('ph.dimensions')}
          />
        </div>
      </div>

      <div className="field">
        <label>{t('field.shortDesc')}</label>
        <input
          value={project.shortDescription}
          onChange={(e) => set('shortDescription', e.target.value)}
          placeholder={t('ph.shortDesc')}
        />
      </div>

      <div className="field">
        <label>{t('field.detailedDesc')}</label>
        <textarea
          value={project.detailedDescription}
          onChange={(e) => set('detailedDescription', e.target.value)}
          placeholder={t('ph.detailedDesc')}
          rows={5}
        />
      </div>

      <div className="field">
        <label>{t('field.tags')}</label>
        <div className="tag-input-row">
          {project.tags.map((tag) => (
            <span key={tag} className="chip tag-chip">
              {tag}
              <button
                aria-label={`${t('common.remove')} ${tag}`}
                onClick={() =>
                  update((p) => ({ ...p, tags: p.tags.filter((x) => x !== tag) }))
                }
              >
                <IconClose size={12} />
              </button>
            </span>
          ))}
          <input
            style={{ width: 'auto', flex: 1, minWidth: 140 }}
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

      <span className="label" style={{ display: 'block', margin: '0.6rem 0 0.8rem' }}>
        {t('field.images')}
      </span>
      <div className="image-slots">
        <ImageField
          label={t('info.refImage')}
          image={project.referenceImage}
          onChange={(img) => set('referenceImage', img)}
          dropLabel={t('info.refDrop')}
          study
        />
        <ImageField
          label={t('info.finalImage')}
          image={project.finalImage}
          onChange={(img) => set('finalImage', img)}
          dropLabel={t('info.finalDrop')}
          study
        />
      </div>
      <p className="muted" style={{ fontSize: '0.82rem', fontStyle: 'italic', marginTop: '0.6rem' }}>
        {t('info.imagesNote')}
      </p>

      <button className="btn" style={{ marginTop: '0.3rem' }} onClick={() => setFraming(true)}>
        <IconImage size={16} /> {t('frame.open')}
      </button>
      {framing && (
        <FrameStudio
          image={project.finalImage || project.referenceImage}
          title={project.title}
          onClose={() => setFraming(false)}
        />
      )}

      {project.referenceImage && project.finalImage && (
        <div style={{ marginTop: '1.2rem' }}>
          <span className="label" style={{ display: 'block', marginBottom: '0.5rem' }}>
            {t('compare.title')}
          </span>
          <CompareSlider
            before={project.referenceImage}
            after={project.finalImage}
            beforeLabel={t('pdf.reference')}
            afterLabel={t('pdf.finalArtwork')}
          />
        </div>
      )}
    </div>
  )
}
