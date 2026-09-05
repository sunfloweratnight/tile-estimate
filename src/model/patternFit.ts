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

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6
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

/** 壁辺をモジュールの整数倍へ切り上げ（表示は 3 桁）。 */
function ceilToModule(length: number, module: number): number {
  if (module <= EPS) return round3(length)
  if (positiveRemainder(length, module) === 0) return round3(length)
  const n = Math.max(1, Math.ceil((length - FIT_EPS) / module))
  return round3(n * module)
}

function remOk(
  wallWidth: number,
  wallHeight: number,
  tileWidth: number,
  tileHeight: number,
  grout: number,
  pattern: LayoutPattern,
): boolean {
  const { moduleW, moduleH } = patternModuleSize(
    pattern,
    tileWidth,
    tileHeight,
    grout,
  )
  return (
    positiveRemainder(wallWidth, moduleW) === 0 &&
    positiveRemainder(wallHeight, moduleH) === 0
  )
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
  const width = ceilToModule(wallWidth, moduleW)
  const height = ceilToModule(wallHeight, moduleH)
  const changed =
    Math.abs(width - wallWidth) > EPS || Math.abs(height - wallHeight) > EPS
  return { width, height, changed }
}

/**
 * 壁固定でタイル寸法を調整し、壁が整数モジュールになるようにする。
 * 丸め後も rem≈0 になるまで nx/ny を下げて再試行する。
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
        // 正方形セルが幅・高さの両方を割り切る組み合わせを探す
        let found = false
        for (let cx = nx; cx >= 1 && !found; cx--) {
          const cell = wallWidth / cx
          if (cell <= g + EPS) continue
          if (positiveRemainder(wallHeight, cell) !== 0) continue
          const s = (cell - g) / 2
          if (s <= EPS) continue
          const long = s
          const short = Math.max(long * aspectShortOverLong, EPS)
          if (landscape) {
            tw = long
            th = short
          } else {
            tw = short
            th = long
          }
          found = true
        }
        break
      }
      case 'herringbone': {
        // (L+g)·√2 = wallW/nx が成り立つよう逆算（丸め前）
        const L = wallWidth / (nx * Math.SQRT2) - g
        const W = wallHeight / (ny * Math.SQRT2) - g
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
        tw = wallWidth / nx - g
        th = wallHeight / ny - g
        break
      }
    }

    if (tw > EPS && th > EPS) {
      // √2 増幅に耐えるため 6 桁。それでも rem 非0なら桁を保ったまま再検証
      let rw = round6(tw)
      let rh = round6(th)
      if (!remOk(wallWidth, wallHeight, rw, rh, g, pattern)) {
        // 丸めで崩れた場合、逆算値をそのまま 6 桁に張り直し（herringbone は wall/(n√2)-g）
        if (pattern === 'herringbone') {
          const L = wallWidth / (nx * Math.SQRT2) - g
          const W = wallHeight / (ny * Math.SQRT2) - g
          if (landscape) {
            rw = round6(L)
            rh = round6(W)
          } else {
            rw = round6(W)
            rh = round6(L)
          }
        } else if (pattern === 'basketweave') {
          // セルを壁幅・高さの両方で割り切れる最大に近づけるのは難しいので
          // 両辺 rem が消えるまで ny/nx を下げる側に任せる
        } else {
          rw = round6(wallWidth / nx - g)
          rh = round6(wallHeight / ny - g)
        }
      }

      if (
        rw > EPS &&
        rh > EPS &&
        remOk(wallWidth, wallHeight, rw, rh, g, pattern)
      ) {
        const changed =
          Math.abs(rw - tileWidth) > FIT_EPS ||
          Math.abs(rh - tileHeight) > FIT_EPS
        return { width: rw, height: rh, changed }
      }
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
