import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { useI18n } from '../i18n/I18nContext'
import { daysSince, formatRelativeDays } from '../utils/date'
import {
  ensurePersistentStorage,
  formatBytes,
  getStorageInfo,
  StorageInfo,
} from '../utils/persistence'
import { exportLibrary, getLastExport } from '../utils/transfer'
import { IconDatabase, IconDownload, IconShield } from './Icons'

const REMIND_AFTER_DAYS = 14

/**
 * A quiet studio-footer panel: how much space the archive uses, whether the
 * browser is keeping it safe, and a gentle nudge to export a backup.
 */
export default function StorageStatus() {
  const { projects, notify } = useApp()
  const { t } = useI18n()
  const [info, setInfo] = useState<StorageInfo | null>(null)
  const [lastExport, setLastExport] = useState<number | null>(getLastExport())
  const [dismissed, setDismissed] = useState(false)

  const refresh = () => getStorageInfo().then(setInfo)

  useEffect(() => {
    // Ask for persistent storage once, then read the resulting state.
    ensurePersistentStorage().finally(refresh)
  }, [])

  // Re-read usage whenever the archive changes (debounced by React batching).
  useEffect(() => {
    refresh()
  }, [projects])

  const doBackup = () => {
    exportLibrary({ version: 1, projects })
    notify(t('notify.libraryExported'), 'success')
    setLastExport(getLastExport())
    setDismissed(true)
  }

  if (!projects.length) return null

  const overdue =
    !dismissed &&
    (lastExport === null || daysSince(lastExport) >= REMIND_AFTER_DAYS)

  return (
    <>
      {overdue && (
        <div className="backup-reminder" role="status">
          <span>
            {lastExport === null
              ? t('storage.reminderNever')
              : t('storage.reminder', { days: daysSince(lastExport) })}
          </span>
          <div className="row" style={{ flex: 'none' }}>
            <button className="btn btn-sm btn-primary" onClick={doBackup}>
              <IconDownload size={15} /> {t('storage.backupNow')}
            </button>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => setDismissed(true)}
              title={t('storage.dismiss')}
            >
              {t('storage.dismiss')}
            </button>
          </div>
        </div>
      )}

      <div className="storage-status">
        <span className="storage-col">
          <span className="storage-ico">
            <IconDatabase size={16} />
          </span>
          <span>
            <strong>{t('storage.heading')}</strong>
            <span className="storage-sub">{t('storage.localOnly')}</span>
          </span>
        </span>

        {info?.supported && (
          <span className="storage-col">
            <span>{t('storage.used', { size: formatBytes(info.usage) })}</span>
          </span>
        )}

        <span className="storage-col" title={info?.persisted ? t('storage.protectedHint') : t('storage.notProtectedHint')}>
          <span className={`storage-ico ${info?.persisted ? 'ok' : 'warn'}`}>
            <IconShield size={16} />
          </span>
          <span>{info?.persisted ? t('storage.protected') : t('storage.notProtected')}</span>
        </span>

        <span className="storage-col grow" style={{ justifyContent: 'flex-end' }}>
          <span className="storage-sub">
            {lastExport === null
              ? t('storage.neverBackup')
              : t('storage.lastBackup', { when: formatRelativeDays(lastExport) })}
          </span>
          <button className="btn btn-sm" onClick={doBackup}>
            <IconDownload size={14} /> {t('storage.backupNow')}
          </button>
        </span>
      </div>
    </>
  )
}
