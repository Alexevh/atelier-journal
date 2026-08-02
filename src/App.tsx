import { useEffect, useState } from 'react'
import { useApp } from './context/AppContext'
import { useI18n } from './i18n/I18nContext'
import { ensurePersistentStorage } from './utils/persistence'
import TopBar from './components/TopBar'
import Gallery from './components/Gallery'
import ProjectEditor from './components/ProjectEditor'
import Settings from './components/Settings'
import IdeasPage from './components/IdeasPage'
import IdeaEditor from './components/IdeaEditor'
import ColorPage from './components/ColorPage'
import HelpPage from './components/HelpPage'
import { IconClose } from './components/Icons'

type Route =
  | { kind: 'gallery' }
  | { kind: 'work'; id: string }
  | { kind: 'settings' }
  | { kind: 'ideas' }
  | { kind: 'idea'; id: string }
  | { kind: 'color' }
  | { kind: 'help' }

function parseHash(): Route {
  const h = window.location.hash
  const work = h.match(/^#\/work\/(.+)$/)
  if (work) return { kind: 'work', id: decodeURIComponent(work[1]) }
  const idea = h.match(/^#\/idea\/(.+)$/)
  if (idea) return { kind: 'idea', id: decodeURIComponent(idea[1]) }
  if (h === '#/settings') return { kind: 'settings' }
  if (h === '#/ideas') return { kind: 'ideas' }
  if (h === '#/color') return { kind: 'color' }
  if (h === '#/help') return { kind: 'help' }
  return { kind: 'gallery' }
}

export default function App() {
  const { ready, toasts, dismissToast, getProject } = useApp()
  const { t } = useI18n()
  const [route, setRoute] = useState<Route>(() => parseHash())

  // ask the browser to keep our local data safe from automatic eviction
  useEffect(() => {
    ensurePersistentStorage()
  }, [])

  // keep the URL hash in sync so reloads & back-button feel natural
  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const open = (id: string) => {
    window.location.hash = `#/work/${encodeURIComponent(id)}`
    window.scrollTo({ top: 0 })
  }
  const home = () => {
    window.location.hash = ''
  }
  const openSettings = () => {
    window.location.hash = '#/settings'
    window.scrollTo({ top: 0 })
  }
  const openIdeas = () => {
    window.location.hash = '#/ideas'
    window.scrollTo({ top: 0 })
  }
  const openIdea = (id: string) => {
    window.location.hash = `#/idea/${encodeURIComponent(id)}`
    window.scrollTo({ top: 0 })
  }
  const openColor = () => {
    window.location.hash = '#/color'
    window.scrollTo({ top: 0 })
  }
  const openHelp = () => {
    window.location.hash = '#/help'
    window.scrollTo({ top: 0 })
  }

  if (!ready) {
    return (
      <div className="loading-screen">
        <span className="pulse">{t('app.loading')}</span>
      </div>
    )
  }

  const activeProject = route.kind === 'work' ? getProject(route.id) : undefined

  return (
    <div className="app-shell">
      <TopBar onHome={home} onSettings={openSettings} onIdeas={openIdeas} onColor={openColor} onHelp={openHelp} />
      <main className="page">
        {route.kind === 'work' && activeProject ? (
          <ProjectEditor projectId={route.id} onBack={home} />
        ) : route.kind === 'settings' ? (
          <Settings onBack={home} />
        ) : route.kind === 'ideas' ? (
          <IdeasPage onBack={home} onOpenProject={open} onOpenIdea={openIdea} />
        ) : route.kind === 'idea' ? (
          <IdeaEditor ideaId={route.id} onBack={openIdeas} onOpenProject={open} />
        ) : route.kind === 'color' ? (
          <ColorPage onBack={home} />
        ) : route.kind === 'help' ? (
          <HelpPage onBack={home} />
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
