import { useEffect } from 'react'
import { EditCanvas } from './canvas/EditCanvas'
import { PreviewCanvas } from './canvas/PreviewCanvas'
import { LOCALES, type Locale } from './i18n/messages'
import { LOCALE_LABELS, useLocaleStore } from './i18n/useLocaleStore'
import { useEstimateStore } from './store/useEstimateStore'
import { DimensionForm } from './ui/DimensionForm'
import { ResultPanel } from './ui/ResultPanel'
import './App.css'

export default function App() {
  const scheduleEstimate = useEstimateStore((s) => s.scheduleEstimate)
  const t = useLocaleStore((s) => s.t)
  const locale = useLocaleStore((s) => s.locale)
  const setLocale = useLocaleStore((s) => s.setLocale)

  useEffect(() => {
    scheduleEstimate()
  }, [scheduleEstimate])

  useEffect(() => {
    document.documentElement.lang = locale === 'ja' ? 'ja' : 'en'
  }, [locale])

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-row">
          <div>
            <h1>{t('app.title')}</h1>
            <p>{t('app.subtitle')}</p>
          </div>
          <label className="lang-switch">
            <span>{t('lang.label')}</span>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
              aria-label={t('lang.label')}
            >
              {LOCALES.map((l) => (
                <option key={l} value={l}>
                  {LOCALE_LABELS[l]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>
      <div className="app-body">
        <DimensionForm />
        <div className="canvas-column">
          <EditCanvas />
          <PreviewCanvas />
        </div>
        <ResultPanel />
      </div>
    </div>
  )
}
