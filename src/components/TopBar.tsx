import { useRef } from 'react'
import { useApp } from '../context/AppContext'
import { useSettings } from '../context/SettingsContext'
import { useSync } from '../context/SyncContext'
import { useTheme } from '../context/ThemeContext'
import { useI18n } from '../i18n/I18nContext'
import { LANGUAGES, Lang } from '../i18n'
import { applyColorSnapshot } from '../sync/colorData'
import { APP_VERSION } from '../version'
import { mergeSettings } from '../utils/factory'
import { exportLibrary, parseImport, readFileAsText } from '../utils/transfer'
import {
  IconCloud,
  IconDownload,
  IconDroplet,
  IconHelp,
  IconIdea,
  IconMoon,
  IconPalette,
  IconSettings,
  IconSun,
  IconUpload,
} from './Icons'

interface Props {
  onHome: () => void
  onSettings: () => void
  onIdeas: () => void
  onColor: () => void
  onHelp: () => void
}

export default function TopBar({ onHome, onSettings, onIdeas, onColor, onHelp }: Props) {
  const { theme, toggle } = useTheme()
  const { lang, setLang, t } = useI18n()
  const { projects, ideas, importProjects, importIdeas, notify } = useApp()
  const { settings, updateSettings } = useSettings()
  const sync = useSync()
  const importRef = useRef<HTMLInputElement>(null)

  const handleImport = async (file: File) => {
    try {
      const text = await readFileAsText(file)
      const parsed = parseImport(text)
      importProjects(parsed.projects)
      if (parsed.ideas.length) importIdeas(parsed.ideas)
      // full-backup extras: settings + colour tool snapshot, when present
      if (parsed.settings) {
        const restored = mergeSettings(parsed.settings)
        updateSettings(() => restored)
      }
      if (parsed.colorTool) {
        await applyColorSnapshot(parsed.colorTool)
      }
      notify(
        parsed.projects.length === 1
          ? t('notify.importedOne')
          : t('notify.importedMany', { count: parsed.projects.length }),
        'success',
      )
      if (parsed.settings || parsed.colorTool) notify(t('notify.fullRestore'), 'success')
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
          <span className="topbar-title">
            Atelier <span className="topbar-version">v{APP_VERSION}</span>
          </span>
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
        onClick={async () => {
          if (!projects.length && !ideas.length) {
            notify(t('notify.noExport'), 'info')
            return
          }
          await exportLibrary({ version: 2, projects, ideas }, settings)
          notify(t('notify.libraryExported'), 'success')
        }}
        title={t('topbar.exportTitle')}
      >
        <IconDownload size={16} /> <span className="hide-sm">{t('common.exportAll')}</span>
      </button>

      {sync.enabled && (
        <button
          className={`btn btn-icon sync-indicator sync-${sync.status}`}
          onClick={() => {
            if (sync.active) {
              sync.syncNow()
              notify(t('sync.status.syncing'), 'info')
            } else {
              onSettings()
            }
          }}
          title={`${t('sync.statusLabel')}: ${t(`sync.status.${sync.status}`)}${
            sync.active ? ' · ' + t('sync.now') : ''
          }`}
          aria-label={t('sync.statusLabel')}
        >
          <IconCloud size={18} />
          <span className="sync-indicator-dot" />
        </button>
      )}

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
        onClick={onColor}
        title={t('color.open')}
        aria-label={t('color.open')}
      >
        <IconDroplet size={18} />
      </button>
      <button
        className="btn btn-icon"
        onClick={onIdeas}
        title={t('ideas.open')}
        aria-label={t('ideas.open')}
      >
        <IconIdea size={18} />
        {ideas.filter((i) => i.status !== 'archived').length > 0 && (
          <span className="idea-badge">
            {ideas.filter((i) => i.status !== 'archived').length}
          </span>
        )}
      </button>
      <button
        className="btn btn-icon"
        onClick={toggle}
        title={theme === 'light' ? t('topbar.toDark') : t('topbar.toLight')}
        aria-label={theme === 'light' ? t('topbar.toDark') : t('topbar.toLight')}
      >
        {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
      </button>
      <button
        className="btn btn-icon"
        onClick={onSettings}
        title={t('settings.open')}
        aria-label={t('settings.open')}
      >
        <IconSettings size={18} />
      </button>
      <button className="btn btn-icon" onClick={onHelp} title={t('help.open')} aria-label={t('help.open')}>
        <IconHelp size={18} />
      </button>
    </header>
  )
}
