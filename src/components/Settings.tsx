import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { useSettings } from '../context/SettingsContext'
import { useSync } from '../context/SyncContext'
import { useTheme } from '../context/ThemeContext'
import { useI18n } from '../i18n/I18nContext'
import { LANGUAGES, Lang } from '../i18n'
import { FirebaseConfig } from '../types'
import BrushDivider from './BrushDivider'
import CollapsiblePanel from './CollapsiblePanel'
import ImageField from './ImageField'
import {
  IconArrowLeft,
  IconCloud,
  IconDownload,
  IconImage,
  IconPalette,
  IconShield,
  IconTrash,
} from './Icons'

interface Props {
  onBack: () => void
}

const EMPTY_CONFIG: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

const CONFIG_FIELDS: (keyof FirebaseConfig)[] = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
]

const FIRESTORE_RULES = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId;
    }
  }
}`

/** Lenient parser: pulls the six known keys out of a pasted JS/JSON config. */
function parseConfig(text: string): Partial<FirebaseConfig> {
  const out: Partial<FirebaseConfig> = {}
  CONFIG_FIELDS.forEach((k) => {
    const m = text.match(new RegExp(`${k}\\s*[:=]\\s*["'\`]([^"'\`]+)["'\`]`))
    if (m) out[k] = m[1]
  })
  return out
}

export default function Settings({ onBack }: Props) {
  const { t } = useI18n()
  const { settings, updateSettings } = useSettings()
  const { theme, toggle } = useTheme()
  const { lang, setLang } = useI18n()
  const { clearAllProjects, notify } = useApp()
  const sync = useSync()
  const [pasteText, setPasteText] = useState('')

  const cfg = settings.sync.firebaseConfig ?? EMPTY_CONFIG

  const setConfig = (field: keyof FirebaseConfig, value: string) =>
    updateSettings((s) => ({
      ...s,
      sync: {
        ...s.sync,
        firebaseConfig: { ...(s.sync.firebaseConfig ?? EMPTY_CONFIG), [field]: value },
      },
    }))

  const applyPaste = () => {
    const parsed = parseConfig(pasteText)
    if (!parsed.apiKey && !parsed.projectId) {
      notify(t('sync.pasteErr'), 'error')
      return
    }
    updateSettings((s) => ({
      ...s,
      sync: { ...s.sync, firebaseConfig: { ...EMPTY_CONFIG, ...parsed } },
    }))
    setPasteText('')
    notify(t('sync.pasteOk'), 'success')
  }

  return (
    <div className="fade-up">
      <button className="btn btn-ghost" onClick={onBack} style={{ marginBottom: '1.2rem' }}>
        <IconArrowLeft size={16} /> {t('editor.back')}
      </button>

      <div className="hero" style={{ padding: '0 0 0.5rem' }}>
        <span className="eyebrow">{t('settings.subtitle')}</span>
        <h1 style={{ fontSize: 'clamp(2rem,5vw,3rem)' }}>{t('settings.title')}</h1>
      </div>

      <BrushDivider variant="bold" />

      {/* Artist identity */}
      <CollapsiblePanel
        title={t('settings.artistSection')}
        subtitle={t('settings.artistIntro')}
        icon={<IconImage size={20} />}
        defaultOpen
      >
        <div className="grid-2">
          <div className="field">
            <label>{t('settings.artistName')}</label>
            <input
              value={settings.artistName}
              onChange={(e) => updateSettings((s) => ({ ...s, artistName: e.target.value }))}
              placeholder={t('cert.artistNamePh')}
            />
          </div>
          <div className="field">
            <label>{t('settings.artistContact')}</label>
            <input
              value={settings.artistContact}
              onChange={(e) => updateSettings((s) => ({ ...s, artistContact: e.target.value }))}
              placeholder={t('cert.artistContactPh')}
            />
          </div>
        </div>
        <div className="image-slots">
          <ImageField
            label={t('settings.artistLogo')}
            image={settings.artistLogo}
            onChange={(img) => updateSettings((s) => ({ ...s, artistLogo: img }))}
            dropLabel={t('export.logoDrop')}
            signature
            maxDimension={800}
          />
          <ImageField
            label={t('settings.artistSignature')}
            image={settings.artistSignature}
            onChange={(img) => updateSettings((s) => ({ ...s, artistSignature: img }))}
            dropLabel={t('cert.signatureDrop')}
            signature
            maxDimension={800}
          />
        </div>
      </CollapsiblePanel>

      {/* Defaults for new works */}
      <CollapsiblePanel
        title={t('settings.defaultsSection')}
        icon={<IconPalette size={20} />}
        defaultOpen={false}
      >
        <div className="field">
          <label>{t('settings.defaultTechnique')}</label>
          <input
            value={settings.defaultTechnique}
            onChange={(e) => updateSettings((s) => ({ ...s, defaultTechnique: e.target.value }))}
          />
        </div>
        <div className="field">
          <label>{t('settings.defaultAuthenticity')}</label>
          <textarea
            rows={3}
            value={settings.defaultAuthenticityText}
            onChange={(e) =>
              updateSettings((s) => ({ ...s, defaultAuthenticityText: e.target.value }))
            }
          />
        </div>
        <div className="field">
          <label>{t('settings.defaultMaterials')}</label>
          <textarea
            rows={2}
            value={settings.defaultMaterialsSummary}
            onChange={(e) =>
              updateSettings((s) => ({ ...s, defaultMaterialsSummary: e.target.value }))
            }
          />
        </div>
      </CollapsiblePanel>

      {/* Appearance & language */}
      <CollapsiblePanel
        title={t('settings.appearanceSection')}
        icon={<IconPalette size={20} />}
        defaultOpen={false}
      >
        <div className="grid-2">
          <div className="field">
            <label>{t('settings.theme')}</label>
            <div className="seg">
              <button
                className={`seg-btn ${theme === 'light' ? 'active' : ''}`}
                onClick={() => theme !== 'light' && toggle()}
              >
                {t('settings.themeLight')}
              </button>
              <button
                className={`seg-btn ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => theme !== 'dark' && toggle()}
              >
                {t('settings.themeDark')}
              </button>
            </div>
          </div>
          <div className="field">
            <label>{t('settings.language')}</label>
            <div className="seg">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`seg-btn ${lang === l.code ? 'active' : ''}`}
                  onClick={() => setLang(l.code as Lang)}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </CollapsiblePanel>

      {/* Backups */}
      <CollapsiblePanel
        title={t('settings.backupSection')}
        icon={<IconDownload size={20} />}
        defaultOpen={false}
      >
        <div className="field" style={{ maxWidth: 260 }}>
          <label>{t('settings.backupDays')}</label>
          <input
            type="number"
            min={1}
            max={365}
            value={settings.backupReminderDays}
            onChange={(e) =>
              updateSettings((s) => ({
                ...s,
                backupReminderDays: Math.max(1, Number(e.target.value) || 14),
              }))
            }
          />
        </div>
        <p className="muted" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
          {t('settings.backupHint')}
        </p>
      </CollapsiblePanel>

      {/* Cloud sync */}
      <CollapsiblePanel
        title={t('sync.section')}
        subtitle={`${t('sync.statusLabel')}: ${t(`sync.status.${sync.status}`)}`}
        icon={<IconCloud size={20} />}
        defaultOpen={false}
      >
        <p className="muted" style={{ fontStyle: 'italic', marginTop: 0 }}>
          {t('sync.intro')}
        </p>

        <label className="checkbox-row">
          <input
            type="checkbox"
            checked={settings.sync.enabled}
            onChange={(e) =>
              updateSettings((s) => ({ ...s, sync: { ...s.sync, enabled: e.target.checked } }))
            }
          />
          <span>{t('sync.enable')}</span>
        </label>

        {settings.sync.enabled && (
          <>
            <div className={`sync-status sync-${sync.status}`}>
              <span className="sync-dot" />
              <span>{t(`sync.status.${sync.status}`)}</span>
              {sync.error && <span className="sync-err">· {sync.error}</span>}
            </div>

            <h4 style={{ marginTop: '1rem' }}>{t('sync.configTitle')}</h4>
            <p className="muted" style={{ fontStyle: 'italic', fontSize: '0.85rem' }}>
              {t('sync.configHint')}
            </p>

            <div className="field">
              <textarea
                rows={3}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={'{ apiKey: "…", authDomain: "…", projectId: "…", … }'}
              />
              <button className="btn btn-sm" onClick={applyPaste} style={{ alignSelf: 'flex-start' }}>
                {t('sync.pasteJson')}
              </button>
            </div>

            <div className="grid-2">
              {CONFIG_FIELDS.map((f) => (
                <div className="field" key={f}>
                  <label>{t(`sync.field${f[0].toUpperCase()}${f.slice(1)}`)}</label>
                  <input
                    value={cfg[f]}
                    onChange={(e) => setConfig(f, e.target.value)}
                    spellCheck={false}
                    autoComplete="off"
                  />
                </div>
              ))}
            </div>

            <div className="row wrap" style={{ marginTop: '0.5rem' }}>
              {sync.email ? (
                <>
                  <span className="chip">
                    <IconShield size={14} /> {t('sync.signedInAs', { email: sync.email })}
                  </span>
                  <button className="btn btn-sm" onClick={() => sync.signOut()}>
                    {t('sync.signOut')}
                  </button>
                </>
              ) : (
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => sync.signIn()}
                  disabled={!sync.configured}
                >
                  <IconCloud size={15} /> {t('sync.signIn')}
                </button>
              )}
            </div>

            <CollapsiblePanel title={t('sync.setupTitle')} defaultOpen={false}>
              <ol className="setup-steps">
                <li>{t('sync.setup1')}</li>
                <li>{t('sync.setup2')}</li>
                <li>{t('sync.setup3')}</li>
                <li>{t('sync.setup4')}</li>
                <li>{t('sync.setup5')}</li>
              </ol>
              <h4>{t('sync.rulesTitle')}</h4>
              <pre className="code-block">{FIRESTORE_RULES}</pre>
              <p className="muted" style={{ fontStyle: 'italic', fontSize: '0.82rem' }}>
                {t('sync.note')}
              </p>
            </CollapsiblePanel>
          </>
        )}
      </CollapsiblePanel>

      {/* Danger zone */}
      <CollapsiblePanel
        title={t('settings.dangerSection')}
        icon={<IconTrash size={20} />}
        defaultOpen={false}
      >
        <p className="muted" style={{ fontStyle: 'italic', marginTop: 0 }}>
          {t('settings.clearHint')}
        </p>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm(t('settings.clearConfirm'))) {
              clearAllProjects()
              notify(t('notify.dataCleared'), 'info')
            }
          }}
        >
          <IconTrash size={16} /> {t('settings.clearData')}
        </button>
      </CollapsiblePanel>

      <BrushDivider />
      <p className="center muted" style={{ fontStyle: 'italic', padding: '1rem 0 2rem' }}>
        {t('storage.localOnly')}
      </p>
    </div>
  )
}
