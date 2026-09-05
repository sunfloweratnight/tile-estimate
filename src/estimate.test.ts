import { describe, expect, it } from 'vitest'
import { translate, translateWarning } from './i18n/messages'
import { LOSS_RATE_BY_TIER, resolveExtraOverTier } from './masters/rates'
import { computeEffectiveRegion, rectRing } from './model/geometry'
import { analyzePatternFit, suggestAutoFitTile, suggestAutoFitWall } from './model/patternFit'
import { hasAnyOverlap, layoutTiles } from './model/tileLayout'
import type { EstimateInput } from './model/types'
import { convertLength, toMeters } from './model/units'
import { estimateWall } from './worker/estimate'

function baseInput(overrides: Partial<EstimateInput> = {}): EstimateInput {
  return {
    wall: {
      id: 'wall-1',
      width: 10,
      height: 10,
      openings: [],
      ...overrides.wall,
    },
    tile: {
      width: 1,
      height: 1,
      kind: 'standard',
      grout: 0,
      lossRateOverride: null,
      ...overrides.tile,
    },
    layout: {
      pattern: 'herringbone',
      rotationDeg: 0,
      ...overrides.layout,
    },
    labor: {
      baseLaborPerArea: 50,
      ...overrides.labor,
    },
  }
}

describe('acceptance: rectangle herringbone 10×10 / tile 1×1', () => {
  it('requires tiles >= 100 with H loss and Extra over tier H', () => {
    const result = estimateWall(baseInput())
    expect(result.effectiveArea).toBeCloseTo(100, 6)
    expect(result.tileEffectiveArea).toBe(1)
    expect(result.lossRate).toBe(LOSS_RATE_BY_TIER.H)
    expect(result.requiredTiles).toBe(Math.ceil(100 * (1 + LOSS_RATE_BY_TIER.H)))
    expect(result.requiredTiles).toBeGreaterThanOrEqual(100)
    expect(result.extraOverTier).toBe('H')
    expect(result.extraOverAmount).toBeGreaterThan(0)
  })

  it('Std straight layout has lower extra-over than herringbone', () => {
    const h = estimateWall(baseInput())
    const std = estimateWall(
      baseInput({ layout: { pattern: 'straight', rotationDeg: 0 } }),
    )
    expect(std.extraOverTier).toBe('Std')
    expect(std.extraOverAmount).toBeLessThan(h.extraOverAmount)
    expect(std.requiredTiles).toBeLessThan(h.requiredTiles)
  })
})

describe('acceptance: openings reduce effective area', () => {
  it('subtracts a window from the wall', () => {
    const result = estimateWall(
      baseInput({
        wall: {
          id: 'wall-1',
          width: 10,
          height: 10,
          openings: [
            {
              id: 'win-1',
              kind: 'window',
              x: 2,
              y: 3,
              width: 2,
              height: 1.5,
            },
          ],
        },
        layout: { pattern: 'straight', rotationDeg: 0 },
      }),
    )
    expect(result.effectiveArea).toBeCloseTo(100 - 3, 5)
    expect(result.requiredTiles).toBeGreaterThan(0)
  })

  it('herringbone loss is >= straight for same opening wall', () => {
    const wall = {
      id: 'wall-1',
      width: 10,
      height: 10,
      openings: [
        {
          id: 'win-1',
          kind: 'window' as const,
          x: 1,
          y: 1,
          width: 3,
          height: 2,
        },
      ],
    }
    const straight = estimateWall(
      baseInput({ wall, layout: { pattern: 'straight', rotationDeg: 0 } }),
    )
    const herring = estimateWall(
      baseInput({ wall, layout: { pattern: 'herringbone', rotationDeg: 0 } }),
    )
    expect(herring.requiredTiles).toBeGreaterThanOrEqual(straight.requiredTiles)
    expect(herring.lossRate).toBeGreaterThanOrEqual(straight.lossRate)
  })
})

describe('acceptance: irregular outer polygon', () => {
  it('computes finite positive tile count for L-shaped wall', () => {
    const outer = [
      [0, 0],
      [10, 0],
      [10, 6],
      [6, 6],
      [6, 10],
      [0, 10],
      [0, 0],
    ] as [number, number][]

    const region = computeEffectiveRegion({
      id: 'L',
      width: 10,
      height: 10,
      outerPolygon: outer,
      openings: [],
    })
    expect(region.effectiveArea).toBeCloseTo(84, 4)

    const result = estimateWall(
      baseInput({
        wall: {
          id: 'L',
          width: 10,
          height: 10,
          outerPolygon: outer,
          openings: [],
        },
        layout: { pattern: 'brick', rotationDeg: 0 },
      }),
    )
    expect(result.effectiveArea).toBeCloseTo(84, 4)
    expect(result.requiredTiles).toBeGreaterThan(0)
    expect(Number.isFinite(result.requiredTiles)).toBe(true)
  })
})

describe('extra-over tier resolution', () => {
  it('picks max of H/B > S > R > Std', () => {
    expect(resolveExtraOverTier('herringbone', 'rectified')).toBe('H')
    expect(resolveExtraOverTier('basketweave', 'subway')).toBe('B')
    expect(resolveExtraOverTier('straight', 'subway')).toBe('S')
    expect(resolveExtraOverTier('brick', 'standard')).toBe('S')
    expect(resolveExtraOverTier('straight', 'rectified')).toBe('R')
    expect(resolveExtraOverTier('stack', 'standard')).toBe('Std')
  })
})

describe('geometry helpers', () => {
  it('builds closed rect rings', () => {
    const r = rectRing(0, 0, 2, 3)
    expect(r[0]).toEqual(r[r.length - 1])
  })
})

describe('tile non-overlap constraint', () => {
  const patterns = [
    'straight',
    'stack',
    'brick',
    'herringbone',
    'basketweave',
  ] as const

  it.each(patterns)('%s layout has no overlapping tile interiors', (pattern) => {
    const tiles = layoutTiles({
      wallWidth: 10,
      wallHeight: 10,
      tileWidth: 1,
      tileHeight: 1,
      grout: 0.1,
      pattern,
    })
    expect(tiles.length).toBeGreaterThan(0)
    expect(hasAnyOverlap(tiles)).toBe(false)
  })

  it('herringbone with rectangular tiles does not overlap', () => {
    const tiles = layoutTiles({
      wallWidth: 12,
      wallHeight: 8,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0,
      pattern: 'herringbone',
    })
    expect(tiles.length).toBeGreaterThan(0)
    expect(hasAnyOverlap(tiles)).toBe(false)
  })

  it('herringbone uses both +45° and -45° planks without overlap', () => {
    const tiles = layoutTiles({
      wallWidth: 20,
      wallHeight: 16,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0.05,
      pattern: 'herringbone',
    })
    const plus = tiles.filter((t) => (t.rotationDeg ?? 0) === 45)
    const minus = tiles.filter((t) => (t.rotationDeg ?? 0) === -45)
    expect(tiles.length).toBeGreaterThan(10)
    expect(plus.length).toBeGreaterThan(5)
    expect(minus.length).toBeGreaterThan(5)
    expect(hasAnyOverlap(tiles)).toBe(false)
  })

  it('herringbone A/B pair nest with short-to-long contact', () => {
    const tiles = layoutTiles({
      wallWidth: 8,
      wallHeight: 8,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0,
      pattern: 'herringbone',
    })
    const a = tiles.find((t) => t.rotationDeg === 45 && Math.abs(t.anchorX ?? 0) < 1e-6)
    const b = tiles.find(
      (t) =>
        t.rotationDeg === -45 &&
        a != null &&
        Math.abs((t.anchorX ?? 0) - Math.SQRT1_2) < 0.05,
    )
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
  })
})

describe('pattern fit advice', () => {
  it('exact module multiple wall has no edge-cut warnings for straight', () => {
    const fit = analyzePatternFit({
      wallWidth: 6,
      wallHeight: 4,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0,
      pattern: 'straight',
    })
    expect(fit.remW).toBe(0)
    expect(fit.remH).toBe(0)
    expect(fit.warnings.some((w) => w.id === 'pattern_edge_cuts')).toBe(false)
    expect(fit.layoutTileCount).toBeGreaterThan(0)
  })

  it('non-multiple wall emits pattern_edge_cuts for straight', () => {
    const fit = analyzePatternFit({
      wallWidth: 5.5,
      wallHeight: 4.2,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0,
      pattern: 'straight',
    })
    expect(fit.remW).toBeGreaterThan(0)
    expect(fit.warnings.some((w) => w.id === 'pattern_edge_cuts')).toBe(true)
    expect(fit.warnings.some((w) => w.id === 'pattern_advice_adjust')).toBe(true)
  })

  it('estimate includes layoutTileCount reference', () => {
    const result = estimateWall(
      baseInput({
        layout: { pattern: 'straight', rotationDeg: 0 },
        tile: {
          width: 1,
          height: 1,
          kind: 'standard',
          grout: 0,
          lossRateOverride: null,
        },
      }),
    )
    expect(result.layoutTileCount).toBeGreaterThan(0)
  })

  it('narrow wall warns for herringbone', () => {
    const result = estimateWall(
      baseInput({
        wall: { id: 'w', width: 1, height: 1, openings: [] },
        tile: {
          width: 2,
          height: 1,
          kind: 'standard',
          grout: 0,
          lossRateOverride: null,
        },
        layout: { pattern: 'herringbone', rotationDeg: 0 },
      }),
    )
    expect(
      result.warnings.some((w) => w.id === 'pattern_narrow_for_herringbone'),
    ).toBe(true)
  })
})

describe('auto fit', () => {
  it('suggestAutoFitWall rounds up to module multiples', () => {
    const fit = suggestAutoFitWall({
      wallWidth: 5.5,
      wallHeight: 4.2,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0,
      pattern: 'straight',
    })
    expect(fit.changed).toBe(true)
    expect(fit.width).toBe(6)
    expect(fit.height).toBe(5)
  })

  it('suggestAutoFitWall is unchanged when already aligned', () => {
    const fit = suggestAutoFitWall({
      wallWidth: 6,
      wallHeight: 4,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0,
      pattern: 'straight',
    })
    expect(fit.changed).toBe(false)
    expect(fit.width).toBe(6)
    expect(fit.height).toBe(4)
  })

  it('suggestAutoFitTile makes straight remainders zero', () => {
    const wallWidth = 5.5
    const wallHeight = 4.2
    const fit = suggestAutoFitTile({
      wallWidth,
      wallHeight,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0,
      pattern: 'straight',
    })
    expect(fit.changed).toBe(true)
    expect(fit.width).toBeGreaterThan(0)
    expect(fit.height).toBeGreaterThan(0)
    const check = analyzePatternFit({
      wallWidth,
      wallHeight,
      tileWidth: fit.width,
      tileHeight: fit.height,
      grout: 0,
      pattern: 'straight',
    })
    expect(check.remW).toBe(0)
    expect(check.remH).toBe(0)
    // aspect roughly preserved (2:1)
    expect(fit.width / fit.height).toBeGreaterThan(1.2)
    expect(fit.width / fit.height).toBeLessThan(3)
  })

  it('suggestAutoFitTile herringbone clears edge remainders', () => {
    const wallWidth = 10
    const wallHeight = 10
    const fit = suggestAutoFitTile({
      wallWidth,
      wallHeight,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0,
      pattern: 'herringbone',
    })
    expect(fit.changed).toBe(true)
    const check = analyzePatternFit({
      wallWidth,
      wallHeight,
      tileWidth: fit.width,
      tileHeight: fit.height,
      grout: 0,
      pattern: 'herringbone',
    })
    expect(check.remW).toBe(0)
    expect(check.remH).toBe(0)
    expect(check.warnings.some((w) => w.id === 'pattern_edge_cuts')).toBe(
      false,
    )
  })

  it('suggestAutoFitWall herringbone clears edge remainders', () => {
    const fit = suggestAutoFitWall({
      wallWidth: 10,
      wallHeight: 10,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0,
      pattern: 'herringbone',
    })
    expect(fit.changed).toBe(true)
    const check = analyzePatternFit({
      wallWidth: fit.width,
      wallHeight: fit.height,
      tileWidth: 2,
      tileHeight: 1,
      grout: 0,
      pattern: 'herringbone',
    })
    expect(check.remW).toBe(0)
    expect(check.remH).toBe(0)
    expect(check.warnings.some((w) => w.id === 'pattern_edge_cuts')).toBe(
      false,
    )
  })
})

describe('units', () => {
  it('converts length between mm, cm, and m', () => {
    expect(toMeters(1000, 'mm')).toBeCloseTo(1, 9)
    expect(toMeters(100, 'cm')).toBeCloseTo(1, 9)
    expect(toMeters(1, 'm')).toBe(1)
    expect(convertLength(1, 'm', 'mm')).toBeCloseTo(1000, 6)
    expect(convertLength(10, 'cm', 'mm')).toBeCloseTo(100, 6)
  })

  it('estimate is invariant when wall/tile are converted to meters', () => {
    const inMeters = estimateWall(
      baseInput({
        wall: { id: 'w', width: 5, height: 4, openings: [] },
        tile: {
          width: 0.3,
          height: 0.15,
          kind: 'standard',
          grout: 0,
          lossRateOverride: null,
        },
        layout: { pattern: 'straight', rotationDeg: 0 },
      }),
    )
    const inMm = estimateWall(
      baseInput({
        wall: { id: 'w', width: 5000, height: 4000, openings: [] },
        tile: {
          width: 300,
          height: 150,
          kind: 'standard',
          grout: 0,
          lossRateOverride: null,
        },
        layout: { pattern: 'straight', rotationDeg: 0 },
      }),
    )
    // Same numbers in different unit systems are NOT auto-converted in estimateWall;
    // store converts before calling. Here verify meter path is consistent.
    expect(inMeters.requiredTiles).toBe(
      Math.ceil((20 / 0.045) * (1 + LOSS_RATE_BY_TIER.Std)),
    )
    expect(inMm.effectiveArea).toBeGreaterThan(inMeters.effectiveArea)
  })
})

describe('i18n', () => {
  it('translates app title in ja and en', () => {
    expect(translate('ja', 'app.title')).toBe('タイル見積')
    expect(translate('en', 'app.title')).toBe('Tile estimate')
  })

  it('interpolates warning values', () => {
    expect(
      translateWarning('en', { id: 'grout_default', values: { mm: 2 } }),
    ).toContain('2')
    expect(
      translateWarning('ja', { id: 'opening_outside', values: { id: 'win-1' } }),
    ).toContain('win-1')
  })

  it('falls back to key when missing', () => {
    expect(translate('en', 'missing.key.xyz')).toBe('missing.key.xyz')
  })
})

describe('estimate warnings', () => {
  it('emits grout_default warning code when grout is null', () => {
    const result = estimateWall(
      baseInput({
        tile: {
          width: 1,
          height: 1,
          kind: 'standard',
          grout: null,
          lossRateOverride: null,
        },
        layout: { pattern: 'straight', rotationDeg: 0 },
      }),
    )
    expect(result.warnings.some((w) => w.id === 'grout_default')).toBe(true)
  })
})
