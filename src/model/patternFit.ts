import type { EstimateWarning } from '../i18n/messages'
import { herringboneModuleSize, layoutTiles } from './tileLayout'
import type { LayoutPattern } from './types'

const EPS = 1e-9
/** 余りがモジュール最小辺のこの割合を超えたら「切りが必要」 */
const CUT_RATIO = 0.15
/** 余りがモジュールの 35–65% 付近なら相性が悪い（中途半端） */
const AWKWARD_MIN = 0.35
const AWKWARD_MAX = 0.65

export interface PatternModule {
  moduleW: number
  moduleH: number
}

export interface PatternFitResult {
  moduleW: number
  moduleH: number
  remW: number
  remH: number
  layoutTileCount: number
  warnings: EstimateWarning[]
}

export function patternModuleSize(
  pattern: LayoutPattern,
  tileWidth: number,
  tileHeight: number,
  grout: number,
): PatternModule {
  const g = Math.max(0, grout)
  const tw = tileWidth
  const th = tileHeight

  switch (pattern) {
    case 'straight':
    case 'stack':
      return { moduleW: tw + g, moduleH: th + g }
    case 'brick':
      return { moduleW: tw + g, moduleH: th + g }
    case 'basketweave': {
      const s = Math.max(tw, th)
      const cell = 2 * s + g
      return { moduleW: cell, moduleH: cell }
    }
    case 'herringbone': {
      const m = herringboneModuleSize(tw, th, g)
      return { moduleW: m.moduleW, moduleH: m.moduleH }
    }
    default:
      return { moduleW: tw + g, moduleH: th + g }
  }
}

function positiveRemainder(length: number, module: number): number {
  if (module <= EPS) return 0
  const r = length % module
  return r < EPS || Math.abs(r - module) < EPS ? 0 : r
}

function suggestDelta(rem: number, module: number): number {
  if (rem <= EPS || module <= EPS) return 0
  return Math.round((module - rem) * 1000) / 1000
}

/**
 * 壁寸法と並べ方モジュールの収まりを評価し、アドバイス警告と配置参考枚数を返す。
 */
export function analyzePatternFit(options: {
  wallWidth: number
  wallHeight: number
  tileWidth: number
  tileHeight: number
  grout: number
  pattern: LayoutPattern
}): PatternFitResult {
  const {
    wallWidth,
    wallHeight,
    tileWidth,
    tileHeight,
    pattern,
  } = options
  const g = Math.max(0, options.grout)
  const warnings: EstimateWarning[] = []

  if (wallWidth <= 0 || wallHeight <= 0 || tileWidth <= 0 || tileHeight <= 0) {
    return {
      moduleW: 0,
      moduleH: 0,
      remW: 0,
      remH: 0,
      layoutTileCount: 0,
      warnings,
    }
  }

  const { moduleW, moduleH } = patternModuleSize(
    pattern,
    tileWidth,
    tileHeight,
    g,
  )
  const remW = positiveRemainder(wallWidth, moduleW)
  const remH = positiveRemainder(wallHeight, moduleH)
  const minMod = Math.min(moduleW, moduleH)

  if (pattern === 'herringbone') {
    const m = herringboneModuleSize(tileWidth, tileHeight, g)
    const minSpan = (m.long + m.short) / Math.SQRT2
    if (wallWidth + EPS < minSpan || wallHeight + EPS < minSpan) {
      warnings.push({
        id: 'pattern_narrow_for_herringbone',
        values: {
          need: Math.round(minSpan * 1000) / 1000,
        },
      })
    }
  }

  const cutW = remW > minMod * CUT_RATIO
  const cutH = remH > minMod * CUT_RATIO
  if (cutW || cutH) {
    warnings.push({
      id: 'pattern_edge_cuts',
      values: {
        remW: Math.round(remW * 1000) / 1000,
        remH: Math.round(remH * 1000) / 1000,
      },
    })
  }

  const fracW = moduleW > EPS ? remW / moduleW : 0
  const fracH = moduleH > EPS ? remH / moduleH : 0
  const awkward =
    (fracW >= AWKWARD_MIN && fracW <= AWKWARD_MAX) ||
    (fracH >= AWKWARD_MIN && fracH <= AWKWARD_MAX)
  if (awkward) {
    warnings.push({ id: 'pattern_fit_awkward' })
  }

  const addW = suggestDelta(remW, moduleW)
  const addH = suggestDelta(remH, moduleH)
  if ((cutW || cutH || awkward) && (addW > EPS || addH > EPS)) {
    warnings.push({
      id: 'pattern_advice_adjust',
      values: {
        addW: addW > EPS ? addW : 0,
        addH: addH > EPS ? addH : 0,
      },
    })
  }

  const placed = layoutTiles({
    wallWidth,
    wallHeight,
    tileWidth,
    tileHeight,
    grout: g,
    pattern,
  })

  return {
    moduleW,
    moduleH,
    remW,
    remH,
    layoutTileCount: placed.length,
    warnings,
  }
}
