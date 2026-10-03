import { Component, ErrorInfo, ReactNode } from 'react'
import { t } from '../i18n'
import { formatReport, logError } from '../utils/diagnostics'
import { APP_VERSION } from '../version'

interface Props {
  children: ReactNode
  /** Short name of the area, shown in the message (e.g. "Color y Pigmentos"). */
  area?: string
  /** Compact inline panel (for a sub-area) instead of a full-page screen. */
  inline?: boolean
  /** Change this to reset the boundary (e.g. the route). */
  resetKey?: string
}

interface State {
  error: Error | null
  copied: boolean
}

/**
 * Catches render-time errors below it and shows a useful screen instead of a
 * blank page: what failed, where, the version, plus Reload / Copy details /
 * Back actions. Errors are also written to the diagnostics log.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, copied: false }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const where = this.props.area ? ` [${this.props.area}]` : ''
    const err = new Error(error.message + where)
    err.stack = (error.stack ?? '') + '\n' + (info.componentStack ?? '').split('\n').slice(0, 6).join('\n')
    logError('render', err)
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null, copied: false })
    }
  }

  private copy = async () => {
    const text = formatReport(`Render error${this.props.area ? ` in ${this.props.area}` : ''}: ${this.state.error?.message}`)
    try {
      await navigator.clipboard.writeText(text)
      this.setState({ copied: true })
    } catch {
      window.prompt(t('error.copyFallback'), text)
    }
  }

  render() {
    const { error, copied } = this.state
    if (!error) return this.props.children

    const body = (
      <div
        className="fade-up"
        style={{
          maxWidth: 560,
          margin: this.props.inline ? '1rem auto' : '10vh auto',
          padding: '1.5rem',
          border: '1px solid var(--line, #cdbfa8)',
          borderRadius: 12,
          background: 'var(--card, #fbf8f1)',
          color: 'var(--ink, #2b2620)',
        }}
        role="alert"
      >
        <h2 style={{ marginTop: 0 }}>{t('error.title')}</h2>
        <p style={{ opacity: 0.85 }}>
          {this.props.area ? t('error.areaBody', { area: this.props.area }) : t('error.body')}
        </p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: '0.8rem',
            background: 'rgba(0,0,0,0.05)',
            padding: '0.75rem',
            borderRadius: 8,
            maxHeight: 160,
            overflow: 'auto',
          }}
        >
          {error.message}
        </pre>
        <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>
          v{APP_VERSION} · {location.hash || '#/'}
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={() => location.reload()}>
            {t('error.reload')}
          </button>
          <button className="btn" onClick={this.copy}>
            {copied ? t('error.copied') : t('error.copy')}
          </button>
          {this.props.inline ? (
            <button className="btn btn-ghost" onClick={() => this.setState({ error: null, copied: false })}>
              {t('error.retry')}
            </button>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={() => {
                location.hash = ''
                this.setState({ error: null, copied: false })
              }}
            >
              {t('error.home')}
            </button>
          )}
        </div>
        <p style={{ fontSize: '0.75rem', opacity: 0.65, marginBottom: 0 }}>{t('error.safe')}</p>
      </div>
    )
    return body
  }
}
