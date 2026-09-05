import type { EstimateWarning } from '../i18n/messages'
import { herringboneModuleSize, layoutTiles } from './tileLayout'
import type { LayoutPattern } from './types'

const EPS = 1e-9
/** 余りを「ぴったり」とみなす許容（メートル ≈ 1mm） */
const FIT_EPS = 1e-3
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

export interface AutoFitSize {
  width: number
  height: number
  changed: boolean
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
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
  if (r <= FIT_EPS + 1e-9 || Math.abs(r - module) <= FIT_EPS + 1e-9) return 0
  return r
}

function suggestDelta(rem: number, module: number): number {
  if (rem <= EPS || module <= EPS) return 0
  return round3(module - rem)
}

export type AutoFitInput = {
  wallWidth: number
  wallHeight: number
  tileWidth: number
  tileHeight: number
  grout: number
  pattern: LayoutPattern
}

/**
 * タイル固定で壁を次のモジュール倍数へ切り上げる。
 */
export function suggestAutoFitWall(options: AutoFitInput): AutoFitSize {
  const {
    wallWidth,
    wallHeight,
    tileWidth,
    tileHeight,
    pattern,
  } = options
  const g = Math.max(0, options.grout)

  if (wallWidth <= 0 || wallHeight <= 0 || tileWidth <= 0 || tileHeight <= 0) {
    return { width: wallWidth, height: wallHeight, changed: false }
  }

  const { moduleW, moduleH } = patternModuleSize(
    pattern,
    tileWidth,
    tileHeight,
    g,
  )
  const remW = positiveRemainder(wallWidth, moduleW)
  const remH = positiveRemainder(wallHeight, moduleH)
  const width = round3(wallWidth + suggestDelta(remW, moduleW))
  const height = round3(wallHeight + suggestDelta(remH, moduleH))
  const changed =
    Math.abs(width - wallWidth) > EPS || Math.abs(height - wallHeight) > EPS
  return { width, height, changed }
}

/**
 * 壁固定でタイル寸法を調整し、壁が整数モジュールになるようにする。
 */
export function suggestAutoFitTile(options: AutoFitInput): AutoFitSize {
  const {
    wallWidth,
    wallHeight,
    tileWidth,
    tileHeight,
    pattern,
  } = options
  const g = Math.max(0, options.grout)

  if (wallWidth <= 0 || wallHeight <= 0 || tileWidth <= 0 || tileHeight <= 0) {
    return { width: tileWidth, height: tileHeight, changed: false }
  }

  const { moduleW, moduleH } = patternModuleSize(
    pattern,
    tileWidth,
    tileHeight,
    g,
  )
  if (moduleW <= EPS || moduleH <= EPS) {
    return { width: tileWidth, height: tileHeight, changed: false }
  }

  let nx = Math.max(1, Math.round(wallWidth / moduleW))
  let ny = Math.max(1, Math.round(wallHeight / moduleH))
  const landscape = tileWidth >= tileHeight
  const aspectShortOverLong =
    Math.min(tileWidth, tileHeight) / Math.max(tileWidth, tileHeight)

  for (let attempt = 0; attempt < 24; attempt++) {
    const targetMW = wallWidth / nx
    const targetMH = wallHeight / ny
    let tw = 0
    let th = 0

    switch (pattern) {
      case 'basketweave': {
        const target = Math.min(targetMW, targetMH)
        const s = (target - g) / 2
        if (s > EPS) {
          const long = s
          const short = long * aspectShortOverLong
          if (landscape) {
            tw = long
            th = short
          } else {
            tw = short
            th = long
          }
        }
        break
      }
      case 'herringbone': {
        const L = targetMW / Math.SQRT2 - g
        const W = targetMH / Math.SQRT2 - g
        if (L > EPS && W > EPS) {
          if (landscape) {
            tw = L
            th = W
          } else {
            tw = W
            th = L
          }
        }
        break
      }
      default: {
        tw = targetMW - g
        th = targetMH - g
        break
      }
    }

    if (tw > EPS && th > EPS) {
      tw = round3(tw)
      th = round3(th)
      const changed =
        Math.abs(tw - tileWidth) > EPS || Math.abs(th - tileHeight) > EPS
      return { width: tw, height: th, changed }
    }

    if (nx >= ny && nx > 1) nx -= 1
    else if (ny > 1) ny -= 1
    else if (nx > 1) nx -= 1
    else break
  }

  return { width: tileWidth, height: tileHeight, changed: false }
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
