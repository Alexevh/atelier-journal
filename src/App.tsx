import { useEffect, useState } from 'react'
import { useApp } from './context/AppContext'
import { useI18n } from './i18n/I18nContext'
import TopBar from './components/TopBar'
import Gallery from './components/Gallery'
import ProjectEditor from './components/ProjectEditor'
import { IconClose } from './components/Icons'

export default function App() {
  const { ready, toasts, dismissToast, getProject } = useApp()
  const { t } = useI18n()
  const [activeId, setActiveId] = useState<string | null>(null)

  // keep the URL hash in sync so reloads & back-button feel natural
  useEffect(() => {
    const fromHash = () => {
      const m = window.location.hash.match(/^#\/work\/(.+)$/)
      setActiveId(m ? decodeURIComponent(m[1]) : null)
    }
    fromHash()
    window.addEventListener('hashchange', fromHash)
    return () => window.removeEventListener('hashchange', fromHash)
  }, [])

  const open = (id: string) => {
    window.location.hash = `#/work/${encodeURIComponent(id)}`
    setActiveId(id)
    window.scrollTo({ top: 0 })
  }
  const home = () => {
    window.location.hash = ''
    setActiveId(null)
  }

  if (!ready) {
    return (
      <div className="loading-screen">
        <span className="pulse">{t('app.loading')}</span>
      </div>
    )
  }

  const activeProject = activeId ? getProject(activeId) : undefined

  return (
    <div className="app-shell">
      <TopBar onHome={home} />
      <main className="page">
        {activeId && activeProject ? (
          <ProjectEditor projectId={activeId} onBack={home} />
        ) : (
          <Gallery onOpen={open} />
        )}
      </main>

      <div className="toast-stack">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tone}`} onClick={() => dismissToast(t.id)}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span>{t.message}</span>
              <IconClose size={14} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
