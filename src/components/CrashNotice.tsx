import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import {
  dismissPreviousCrash,
  ErrorEntry,
  formatReport,
  getPreviousCrash,
  SessionCrumbs,
} from '../utils/diagnostics'
import { IconClose } from './Icons'

/**
 * Surfaces diagnostics to the user:
 *  • a banner when the previous session ended unexpectedly (e.g. Chrome killed
 *    the tab for lack of memory) — with where it was and how much memory it used;
 *  • a toast for every caught error and for high-memory warnings.
 */
export default function CrashNotice() {
  const { notify } = useApp()
  const { t } = useI18n()
  const [crash, setCrash] = useState<SessionCrumbs | null>(() => getPreviousCrash())
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onErr = (ev: Event) => {
      const e = (ev as CustomEvent<ErrorEntry>).detail
      if (!e) return
      if (e.kind === 'memory') notify(t('crash.memory'), 'error')
      else notify(t('crash.toast', { msg: e.message.slice(0, 120) }), 'error')
    }
    window.addEventListener('atelier-error', onErr)
    return () => window.removeEventListener('atelier-error', onErr)
  }, [notify, t])

  if (!crash) return null

  const close = () => {
    dismissPreviousCrash()
    setCrash(null)
  }
  const mem =
    crash.heapUsedMB != null && crash.heapLimitMB
      ? t('crash.memLine', { used: crash.heapUsedMB, limit: crash.heapLimitMB })
      : ''
  const copy = async () => {
    const text = formatReport(
      `Previous session ended unexpectedly. Last screen: ${crash.where}. Last heartbeat: ${new Date(
        crash.lastBeat,
      ).toISOString()}. ${crash.heapUsedMB != null ? `Heap: ${crash.heapUsedMB}/${crash.heapLimitMB} MB.` : ''} Version: ${crash.version}`,
    )
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
    } catch {
      window.prompt(t('error.copyFallback'), text)
    }
  }

  return (
    <div className="crash-banner" role="status">
      <div style={{ flex: 1 }}>
        <strong>{t('crash.title')}</strong>
        <div style={{ fontSize: '0.85rem', opacity: 0.85 }}>
          {t('crash.body', { where: crash.where || '#/', version: crash.version })} {mem}
        </div>
      </div>
      <button className="btn btn-sm" onClick={copy}>
        {copied ? t('error.copied') : t('error.copy')}
      </button>
      <button className="btn btn-icon btn-ghost btn-sm" onClick={close} aria-label={t('common.cancel')}>
        <IconClose size={14} />
      </button>
    </div>
  )
}
