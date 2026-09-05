import {
  DEFAULT_GROUT_METERS,
  DEFAULT_GROUT_MM,
  BASE_LABOR_PER_AREA,
  extraOverRateForTier,
  lossRateForTier,
  resolveExtraOverTier,
} from '../masters/rates'
import type { EstimateWarning } from '../i18n/messages'
import { computeEffectiveRegion } from '../model/geometry'
import type { EstimateInput, EstimateResult } from '../model/types'

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/**
 * Pure estimate pipeline (area + loss). Safe to run in a Web Worker or tests.
 *
 * Constraint: tiles do not overlap each other (coverage abuts at grout only).
 * v1 count ≈ area / tileArea × (1 + loss).
 */
export function estimateWall(input: EstimateInput): EstimateResult {
  const warnings: EstimateWarning[] = []
  const { wall, tile, layout, labor } = input

  const region = computeEffectiveRegion(wall)
  warnings.push(...region.warnings)

  let usedGrout = tile.grout
  if (usedGrout === null || usedGrout === undefined || Number.isNaN(usedGrout)) {
    usedGrout = DEFAULT_GROUT_METERS
    warnings.push({
      id: 'grout_default',
      values: { mm: DEFAULT_GROUT_MM },
    })
  }
  if (usedGrout < 0) {
    usedGrout = 0
    warnings.push({ id: 'grout_negative' })
  }

  const pitchW = tile.width + usedGrout
  const pitchH = tile.height + usedGrout
  if (tile.width <= 0 || tile.height <= 0) {
    warnings.push({ id: 'tile_size_invalid' })
    return emptyResult(input, warnings, usedGrout)
  }

  const tileEffectiveArea = tile.width * tile.height
  if (pitchW > wall.width || pitchH > wall.height) {
    warnings.push({ id: 'tile_large' })
  }

  const tier = resolveExtraOverTier(layout.pattern, tile.kind)
  const lossRate =
    tile.lossRateOverride !== null && tile.lossRateOverride !== undefined
      ? tile.lossRateOverride
      : lossRateForTier(tier)

  const effectiveArea = region.effectiveArea
  const theoreticalCount =
    tileEffectiveArea > 0 ? effectiveArea / tileEffectiveArea : 0
  const requiredTiles = Math.ceil(theoreticalCount * (1 + lossRate))

  const extraOverRate = extraOverRateForTier(tier)
  const basePerArea = labor.baseLaborPerArea ?? BASE_LABOR_PER_AREA
  const baseLaborAmount = roundMoney(effectiveArea * basePerArea)
  const extraOverAmount = roundMoney(effectiveArea * extraOverRate)

  return {
    effectiveArea,
    tileEffectiveArea,
    theoreticalCount,
    lossRate,
    requiredTiles: Number.isFinite(requiredTiles) ? requiredTiles : 0,
    extraOverTier: tier,
    extraOverRate,
    baseLaborAmount,
    extraOverAmount,
    usedGrout,
    warnings,
    pattern: layout.pattern,
    wallId: wall.id,
  }
}

function emptyResult(
  input: EstimateInput,
  warnings: EstimateWarning[],
  usedGrout: number,
): EstimateResult {
  return {
    effectiveArea: 0,
    tileEffectiveArea: 0,
    theoreticalCount: 0,
    lossRate: 0,
    requiredTiles: 0,
    extraOverTier: 'Std',
    extraOverRate: 0,
    baseLaborAmount: 0,
    extraOverAmount: 0,
    usedGrout,
    warnings,
    pattern: input.layout.pattern,
    wallId: input.wall.id,
  }
}
