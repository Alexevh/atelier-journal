import { useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useTheme } from '../context/ThemeContext'
import { useI18n } from '../i18n/I18nContext'
import { LANGUAGES, Lang } from '../i18n'
import { exportLibrary, parseImport, readFileAsText } from '../utils/transfer'
import {
  IconDownload,
  IconMoon,
  IconPalette,
  IconSun,
  IconUpload,
} from './Icons'

interface Props {
  onHome: () => void
}

export default function TopBar({ onHome }: Props) {
  const { theme, toggle } = useTheme()
  const { lang, setLang, t } = useI18n()
  const { projects, importProjects, notify } = useApp()
  const importRef = useRef<HTMLInputElement>(null)

  const handleImport = async (file: File) => {
    try {
      const text = await readFileAsText(file)
      const { projects: imported } = parseImport(text)
      importProjects(imported)
      notify(
        imported.length === 1
          ? t('notify.importedOne')
          : t('notify.importedMany', { count: imported.length }),
        'success',
      )
    } catch (err) {
      notify(err instanceof Error ? err.message : t('notify.importError'), 'error')
    }
  }

  return (
    <header className="topbar">
      <div className="topbar-brand" onClick={onHome} role="button" tabIndex={0}>
        <span className="topbar-mark">
          <IconPalette size={20} />
        </span>
        <span>
          <span className="topbar-title">Atelier</span>
          <span className="topbar-sub" style={{ display: 'block' }}>
            {t('app.brandSub')}
          </span>
        </span>
      </div>

      <div className="topbar-spacer" />

      <input
        ref={importRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) handleImport(f)
          e.target.value = ''
        }}
      />
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => importRef.current?.click()}
        title={t('topbar.importTitle')}
      >
        <IconUpload size={16} /> <span className="hide-sm">{t('common.import')}</span>
      </button>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => {
          if (!projects.length) {
            notify(t('notify.noExport'), 'info')
            return
          }
          exportLibrary({ version: 1, projects })
          notify(t('notify.libraryExported'), 'success')
        }}
        title={t('topbar.exportTitle')}
      >
        <IconDownload size={16} /> <span className="hide-sm">{t('common.exportAll')}</span>
      </button>

      <div className="lang-switch" role="group" aria-label={t('topbar.language')}>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            className={`lang-btn ${lang === l.code ? 'active' : ''}`}
            onClick={() => setLang(l.code as Lang)}
            aria-pressed={lang === l.code}
            title={l.label}
          >
            {l.code.toUpperCase()}
          </button>
        ))}
      </div>

      <button
        className="btn btn-icon"
        onClick={toggle}
        title={theme === 'light' ? t('topbar.toDark') : t('topbar.toLight')}
        aria-label={theme === 'light' ? t('topbar.toDark') : t('topbar.toLight')}
      >
        {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
      </button>
    </header>
  )
}
