import { LENGTH_UNITS, UNIT_LABELS, type LengthUnit } from '../model/units'
import type { LayoutPattern, OpeningKind, TileKind } from '../model/types'
import { useLocaleStore } from '../i18n/useLocaleStore'
import { useEstimateStore } from '../store/useEstimateStore'

const PATTERNS: LayoutPattern[] = [
  'straight',
  'stack',
  'brick',
  'herringbone',
  'basketweave',
]

const KINDS: TileKind[] = ['standard', 'rectified', 'subway']

function UnitSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: LengthUnit
  onChange: (u: LengthUnit) => void
  ariaLabel: string
}) {
  return (
    <select
      className="unit-select"
      value={value}
      onChange={(e) => onChange(e.target.value as LengthUnit)}
      aria-label={ariaLabel}
    >
      {LENGTH_UNITS.map((u) => (
        <option key={u} value={u}>
          {UNIT_LABELS[u]}
        </option>
      ))}
    </select>
  )
}

export function DimensionForm() {
  const t = useLocaleStore((s) => s.t)
  const locale = useLocaleStore((s) => s.locale)
  const wallWidth = useEstimateStore((s) => s.wallWidth)
  const wallHeight = useEstimateStore((s) => s.wallHeight)
  const wallUnit = useEstimateStore((s) => s.wallUnit)
  const outerVertices = useEstimateStore((s) => s.outerVertices)
  const openings = useEstimateStore((s) => s.openings)
  const tileWidth = useEstimateStore((s) => s.tileWidth)
  const tileHeight = useEstimateStore((s) => s.tileHeight)
  const tileUnit = useEstimateStore((s) => s.tileUnit)
  const tileKind = useEstimateStore((s) => s.tileKind)
  const grout = useEstimateStore((s) => s.grout)
  const pattern = useEstimateStore((s) => s.pattern)
  const setWallSize = useEstimateStore((s) => s.setWallSize)
  const setWallUnit = useEstimateStore((s) => s.setWallUnit)
  const setTile = useEstimateStore((s) => s.setTile)
  const setTileUnit = useEstimateStore((s) => s.setTileUnit)
  const setPattern = useEstimateStore((s) => s.setPattern)
  const addOpening = useEstimateStore((s) => s.addOpening)
  const updateOpening = useEstimateStore((s) => s.updateOpening)
  const removeOpening = useEstimateStore((s) => s.removeOpening)
  const enableIrregularOutline = useEstimateStore(
    (s) => s.enableIrregularOutline,
  )
  const resetToRectangle = useEstimateStore((s) => s.resetToRectangle)
  const applyLShapeNotch = useEstimateStore((s) => s.applyLShapeNotch)
  const insertVertexOnEdge = useEstimateStore((s) => s.insertVertexOnEdge)
  const removeVertex = useEstimateStore((s) => s.removeVertex)

  const irregular = !!outerVertices
  const wu = UNIT_LABELS[wallUnit]
  const tu = UNIT_LABELS[tileUnit]

  return (
    <form
      className="dimension-form"
      onSubmit={(e) => e.preventDefault()}
      key={locale}
    >
      <fieldset>
        <legend>{t('wall.legend')}</legend>
        <label className="unit-field">
          {t('wall.unit')}
          <UnitSelect
            value={wallUnit}
            onChange={setWallUnit}
            ariaLabel={t('wall.unit')}
          />
        </label>
        <label>
          {t('wall.width', { unit: wu })}
          <input
            type="number"
            min={0}
            step="any"
            value={wallWidth}
            disabled={irregular}
            onChange={(e) =>
              setWallSize(Number(e.target.value), wallHeight)
            }
          />
        </label>
        <label>
          {t('wall.height', { unit: wu })}
          <input
            type="number"
            min={0}
            step="any"
            value={wallHeight}
            disabled={irregular}
            onChange={(e) =>
              setWallSize(wallWidth, Number(e.target.value))
            }
          />
        </label>
        <p className="field-hint">
          {irregular
            ? t('wall.hint.irregular', { unit: wu })
            : t('wall.hint.rect', { unit: wu })}
        </p>
        <div className="btn-row">
          {!irregular ? (
            <>
              <button
                type="button"
                className="btn"
                onClick={() => enableIrregularOutline()}
              >
                {t('wall.startIrregular')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => applyLShapeNotch()}
              >
                {t('wall.lShape')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn"
                onClick={() => insertVertexOnEdge(0)}
              >
                {t('wall.addVertex')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  if (outerVertices && outerVertices.length > 3) {
                    removeVertex(outerVertices.length - 1)
                  }
                }}
              >
                {t('wall.removeVertex')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => applyLShapeNotch()}
              >
                {t('wall.toLShape')}
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => resetToRectangle()}
              >
                {t('wall.resetRect')}
              </button>
            </>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend>{t('opening.legend', { unit: wu })}</legend>
        <button type="button" className="btn" onClick={() => addOpening()}>
          {t('opening.add')}
        </button>
        {openings.map((o) => (
          <div key={o.id} className="opening-row">
            <select
              value={o.kind}
              onChange={(e) =>
                updateOpening(o.id, { kind: e.target.value as OpeningKind })
              }
            >
              {(['window', 'door', 'other'] as OpeningKind[]).map((k) => (
                <option key={k} value={k}>
                  {t(`opening.${k}`)}
                </option>
              ))}
            </select>
            <label>
              {t('opening.width', { unit: wu })}
              <input
                type="number"
                step="any"
                value={o.width}
                onChange={(e) =>
                  updateOpening(o.id, { width: Number(e.target.value) })
                }
              />
            </label>
            <label>
              {t('opening.height', { unit: wu })}
              <input
                type="number"
                step="any"
                value={o.height}
                onChange={(e) =>
                  updateOpening(o.id, { height: Number(e.target.value) })
                }
              />
            </label>
            <label>
              {t('opening.x', { unit: wu })}
              <input
                type="number"
                step="any"
                value={o.x}
                onChange={(e) =>
                  updateOpening(o.id, { x: Number(e.target.value) })
                }
              />
            </label>
            <label>
              {t('opening.y', { unit: wu })}
              <input
                type="number"
                step="any"
                value={o.y}
                onChange={(e) =>
                  updateOpening(o.id, { y: Number(e.target.value) })
                }
              />
            </label>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => removeOpening(o.id)}
            >
              {t('opening.remove')}
            </button>
          </div>
        ))}
      </fieldset>

      <fieldset>
        <legend>{t('tile.legend')}</legend>
        <label className="unit-field">
          {t('tile.unit')}
          <UnitSelect
            value={tileUnit}
            onChange={setTileUnit}
            ariaLabel={t('tile.unit')}
          />
        </label>
        <label>
          {t('tile.width', { unit: tu })}
          <input
            type="number"
            min={0}
            step="any"
            value={tileWidth}
            onChange={(e) => setTile({ width: Number(e.target.value) })}
          />
        </label>
        <label>
          {t('tile.height', { unit: tu })}
          <input
            type="number"
            min={0}
            step="any"
            value={tileHeight}
            onChange={(e) => setTile({ height: Number(e.target.value) })}
          />
        </label>
        <label>
          {t('tile.kind')}
          <select
            value={tileKind}
            onChange={(e) => setTile({ kind: e.target.value as TileKind })}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`kind.${k}`)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('tile.grout', { unit: tu })}
          <input
            type="number"
            min={0}
            step="any"
            value={grout ?? ''}
            placeholder={t('tile.groutPlaceholder')}
            onChange={(e) => {
              const v = e.target.value
              setTile({ grout: v === '' ? null : Number(v) })
            }}
          />
        </label>
        <label>
          {t('tile.pattern')}
          <select
            value={pattern}
            onChange={(e) => setPattern(e.target.value as LayoutPattern)}
          >
            {PATTERNS.map((p) => (
              <option key={p} value={p}>
                {t(`pattern.${p}`)}
              </option>
            ))}
          </select>
        </label>
        <p className="field-hint">{t('tile.unitHint')}</p>
      </fieldset>
    </form>
  )
}
