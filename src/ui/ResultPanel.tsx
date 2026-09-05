import { fromMeters } from '../model/units'
import type { LayoutPattern } from '../model/types'
import { useLocaleStore } from '../i18n/useLocaleStore'
import { useEstimateStore } from '../store/useEstimateStore'

function fmt(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  })
}

export function ResultPanel() {
  const t = useLocaleStore((s) => s.t)
  const tw = useLocaleStore((s) => s.tw)
  const locale = useLocaleStore((s) => s.locale)
  const result = useEstimateStore((s) => s.result)
  const estimating = useEstimateStore((s) => s.estimating)
  const error = useEstimateStore((s) => s.error)
  const tileUnit = useEstimateStore((s) => s.tileUnit)
  const wallUnit = useEstimateStore((s) => s.wallUnit)

  const groutDisplay =
    result == null ? null : fromMeters(result.usedGrout, tileUnit)

  return (
    <aside className="result-panel" key={locale}>
      <h2>{t('result.title')}</h2>
      <p className="muted unit-summary">
        {t('result.units', { wallUnit, tileUnit })}
      </p>
      {estimating && <p className="muted">{t('result.calculating')}</p>}
      {error && <p className="error">{error}</p>}
      {!result && !estimating && (
        <p className="muted">{t('result.empty')}</p>
      )}
      {result && (
        <dl>
          <div>
            <dt>{t('result.requiredTiles')}</dt>
            <dd className="emphasis">{result.requiredTiles}</dd>
          </div>
          <div>
            <dt>{t('result.theoretical')}</dt>
            <dd>{fmt(result.theoreticalCount, 4)}</dd>
          </div>
          <div>
            <dt>{t('result.effectiveArea')}</dt>
            <dd>{fmt(result.effectiveArea)} m²</dd>
          </div>
          <div>
            <dt>{t('result.tileArea')}</dt>
            <dd>{fmt(result.tileEffectiveArea)} m²</dd>
          </div>
          <div>
            <dt>{t('result.lossRate')}</dt>
            <dd>{(result.lossRate * 100).toFixed(1)}%</dd>
          </div>
          <div>
            <dt>{t('result.extraOverTier')}</dt>
            <dd className="emphasis">
              {t(`tier.${result.extraOverTier}`)}
            </dd>
          </div>
          <div>
            <dt>{t('result.baseLabor')}</dt>
            <dd>{fmt(result.baseLaborAmount)}</dd>
          </div>
          <div>
            <dt>{t('result.extraOver')}</dt>
            <dd className="emphasis">{fmt(result.extraOverAmount)}</dd>
          </div>
          <div>
            <dt>{t('result.grout')}</dt>
            <dd>
              {groutDisplay == null ? '—' : fmt(groutDisplay, 4)} {tileUnit}
            </dd>
          </div>
          <div>
            <dt>{t('result.pattern')}</dt>
            <dd>
              {t(`pattern.${result.pattern as LayoutPattern}`)}
            </dd>
          </div>
          <div>
            <dt>{t('result.layoutTiles')}</dt>
            <dd>{result.layoutTileCount}</dd>
          </div>
        </dl>
      )}
      {result && (
        <p className="muted layout-hint">{t('result.layoutTilesHint')}</p>
      )}
      {result && result.warnings.length > 0 && (
        <ul className="warnings">
          {result.warnings.map((w, i) => (
            <li key={`${w.id}-${i}`}>{tw(w)}</li>
          ))}
        </ul>
      )}
    </aside>
  )
}
