export type Point = [number, number]

/** Closed ring (first point may equal last; we normalize). */
export type Ring = Point[]

export type Polygon = Ring[]
export type MultiPolygon = Polygon[]

export type OpeningKind = 'window' | 'door' | 'other'

export interface Opening {
  id: string
  kind: OpeningKind
  /** Distance from wall left edge */
  x: number
  /** Distance from wall bottom edge */
  y: number
  width: number
  height: number
}

export type TileKind = 'standard' | 'rectified' | 'subway'

export type LayoutPattern =
  | 'straight'
  | 'stack'
  | 'brick'
  | 'herringbone'
  | 'basketweave'

export type ExtraOverTier = 'Std' | 'R' | 'S' | 'H' | 'B'

export interface WallInput {
  id: string
  /** Outer rectangle width (same unit everywhere). */
  width: number
  height: number
  /**
   * Optional non-rectangular outer polygon in wall coords (origin bottom-left).
   * When omitted, derived from width × height.
   */
  outerPolygon?: Ring
  openings: Opening[]
}

export interface TileInput {
  width: number
  height: number
  kind: TileKind
  /** Grout / joint width. null = use default with warning. */
  grout: number | null
  /** Override loss rate (0–1). null = master by tier. */
  lossRateOverride: number | null
}

export interface LayoutInput {
  pattern: LayoutPattern
  rotationDeg: number
}

export interface LaborInput {
  baseLaborPerArea: number
}

export interface EstimateInput {
  wall: WallInput
  tile: TileInput
  layout: LayoutInput
  labor: LaborInput
}

import type { EstimateWarning } from '../i18n/messages'

export type { EstimateWarning }

export interface EstimateResult {
  effectiveArea: number
  tileEffectiveArea: number
  theoreticalCount: number
  lossRate: number
  requiredTiles: number
  /** 配置プレビュー上の枚数（壁と交差するタイル数）。参考値。 */
  layoutTileCount: number
  extraOverTier: ExtraOverTier
  extraOverRate: number
  baseLaborAmount: number
  extraOverAmount: number
  usedGrout: number
  warnings: EstimateWarning[]
  pattern: LayoutPattern
  wallId: string
}
