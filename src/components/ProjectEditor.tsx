import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { Project } from '../types'
import { formatLongDate } from '../utils/date'
import { exportProject } from '../utils/transfer'
import BrushDivider from './BrushDivider'
import CollapsiblePanel from './CollapsiblePanel'
import {
  IconArrowLeft,
  IconCard,
  IconCertificate,
  IconCopy,
  IconDoc,
  IconDownload,
  IconImage,
  IconPalette,
  IconTrash,
} from './Icons'
import ArtworkInfoPanel from './panels/ArtworkInfoPanel'
import MaterialsPanel from './panels/MaterialsPanel'
import ProcessPanel from './panels/ProcessPanel'
import CertificatePanel from './panels/CertificatePanel'
import ArtistCardPanel from './panels/ArtistCardPanel'
import ExportPanel from './panels/ExportPanel'

interface Props {
  projectId: string
  onBack: () => void
}

export default function ProjectEditor({ projectId, onBack }: Props) {
  const { getProject, updateProject, duplicateProject, deleteProject, notify } = useApp()
  const { t } = useI18n()
  const project = getProject(projectId)

  if (!project) {
    return (
      <div className="empty-state">
        <h3>{t('editor.notFound')}</h3>
        <button className="btn" onClick={onBack} style={{ marginTop: '1rem' }}>
          <IconArrowLeft size={16} /> {t('editor.backToArchive')}
        </button>
      </div>
    )
  }

  const update = (updater: (p: Project) => Project) => updateProject(projectId, updater)

  return (
    <div className="fade-up">
      <div className="row wrap" style={{ marginBottom: '1.2rem', justifyContent: 'space-between' }}>
        <button className="btn btn-ghost" onClick={onBack}>
          <IconArrowLeft size={16} /> {t('editor.back')}
        </button>
        <div className="row wrap">
          <button
            className="btn btn-sm"
            onClick={() => {
              exportProject(project)
              notify(t('notify.projectExported'), 'success')
            }}
          >
            <IconDownload size={15} /> {t('common.export')}
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              const copy = duplicateProject(project.id)
              if (copy) {
                notify(t('notify.duplicated'), 'success')
                onBack()
              }
            }}
          >
            <IconCopy size={15} /> {t('common.duplicate')}
          </button>
          <button
            className="btn btn-sm btn-danger"
            onClick={() => {
              if (confirm(t('editor.confirmDelete', { title: project.title }))) {
                deleteProject(project.id)
                notify(t('notify.projectDeleted'), 'info')
                onBack()
              }
            }}
          >
            <IconTrash size={15} /> {t('common.delete')}
          </button>
        </div>
      </div>

      <div className="editor-top">
        <input
          className="editor-title-input grow"
          value={project.title}
          onChange={(e) => update((p) => ({ ...p, title: e.target.value }))}
          placeholder={t('editor.titlePlaceholder')}
          aria-label={t('editor.titleAria')}
        />
      </div>
      <div className="editor-statusbar">
        <span className={`status-pip status-${project.status}`}>
          {t(`status.${project.status}`)}
        </span>
        {project.year && <span>{project.year}</span>}
        {project.technique && <span>{project.technique}</span>}
        {project.dimensions && <span>{project.dimensions}</span>}
        <span>
          ·{' '}
          {t('editor.lastEdited', {
            date: formatLongDate(new Date(project.updatedAt).toISOString().slice(0, 10)),
          })}
        </span>
      </div>

      <BrushDivider variant="bold" />

      <CollapsiblePanel
        title={t('panel.info.title')}
        subtitle={t('panel.info.subtitle')}
        icon={<IconImage size={20} />}
        defaultOpen
      >
        <ArtworkInfoPanel project={project} update={update} />
      </CollapsiblePanel>

      <CollapsiblePanel
        title={t('panel.materials.title')}
        subtitle={t('panel.materials.subtitle')}
        icon={<IconPalette size={20} />}
        count={project.materials.length}
        defaultOpen={false}
      >
        <MaterialsPanel project={project} update={update} />
      </CollapsiblePanel>

      <CollapsiblePanel
        title={t('panel.process.title')}
        subtitle={t('panel.process.subtitle')}
        icon={<IconDoc size={20} />}
        count={project.entries.length}
        defaultOpen
      >
        <ProcessPanel project={project} update={update} />
      </CollapsiblePanel>

      <CollapsiblePanel
        title={t('panel.docs.title')}
        subtitle={t('panel.docs.subtitle')}
        icon={<IconDoc size={20} />}
        defaultOpen={false}
      >
        <ExportPanel project={project} update={update} notify={notify} />
      </CollapsiblePanel>

      <CollapsiblePanel
        title={t('panel.cert.title')}
        subtitle={t('panel.cert.subtitle')}
        icon={<IconCertificate size={20} />}
        defaultOpen={false}
      >
        <CertificatePanel project={project} update={update} notify={notify} />
      </CollapsiblePanel>

      <CollapsiblePanel
        title={t('panel.card.title')}
        subtitle={t('panel.card.subtitle')}
        icon={<IconCard size={20} />}
        defaultOpen={false}
      >
        <ArtistCardPanel project={project} update={update} notify={notify} />
      </CollapsiblePanel>

      <BrushDivider />
      <p className="center muted" style={{ fontStyle: 'italic', padding: '1rem 0 2rem' }}>
        {t('editor.footer')}
      </p>
    </div>
  )
}
