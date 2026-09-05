import type { ExtraOverTier, LayoutPattern, TileKind } from '../model/types'

/** Provisional loss rates (plan defaults). Replace with field data later. */
export const LOSS_RATE_BY_TIER: Record<ExtraOverTier, number> = {
  Std: 0.05,
  R: 0.08,
  S: 0.1,
  H: 0.15,
  B: 0.15,
}

/**
 * Extra-over labor rate per unit area (provisional).
 * Amount = effectiveArea × rate. Std has no uplift.
 */
export const EXTRA_OVER_RATE_PER_AREA: Record<ExtraOverTier, number> = {
  Std: 0,
  R: 10,
  S: 20,
  H: 35,
  B: 35,
}

/** Base labor per unit area before extra-over uplift (provisional). */
export const BASE_LABOR_PER_AREA = 50

/** 目地の既定値（ミリメートル）。計算時はメートルに換算する。 */
export const DEFAULT_GROUT_MM = 2
export const DEFAULT_GROUT_METERS = DEFAULT_GROUT_MM * 0.001

/** @deprecated 互換用。新規は DEFAULT_GROUT_METERS を使う */
export const DEFAULT_GROUT = DEFAULT_GROUT_METERS

const TIER_RANK: Record<ExtraOverTier, number> = {
  Std: 0,
  R: 1,
  S: 2,
  H: 3,
  B: 3,
}

/** Higher of H/B > S > R > Std; take a single tier (no double-count). */
export function resolveExtraOverTier(
  pattern: LayoutPattern,
  tileKind: TileKind,
): ExtraOverTier {
  const candidates: ExtraOverTier[] = ['Std']

  if (pattern === 'herringbone') candidates.push('H')
  if (pattern === 'basketweave') candidates.push('B')
  if (pattern === 'brick' || tileKind === 'subway') candidates.push('S')
  if (tileKind === 'rectified') candidates.push('R')

  return candidates.reduce((best, t) =>
    TIER_RANK[t] > TIER_RANK[best] ? t : best,
  )
}

export function lossRateForTier(tier: ExtraOverTier): number {
  return LOSS_RATE_BY_TIER[tier]
}

export function extraOverRateForTier(tier: ExtraOverTier): number {
  return EXTRA_OVER_RATE_PER_AREA[tier]
}
