import polygonClipping from 'polygon-clipping'
import type { EstimateWarning } from '../i18n/messages'
import type { MultiPolygon, Opening, Point, Ring, WallInput } from './types'

export function rectRing(
  x: number,
  y: number,
  width: number,
  height: number,
): Ring {
  return [
    [x, y],
    [x + width, y],
    [x + width, y + height],
    [x, y + height],
    [x, y],
  ]
}

export function wallOuterRing(wall: WallInput): Ring {
  if (wall.outerPolygon && wall.outerPolygon.length >= 3) {
    return closeRing(wall.outerPolygon)
  }
  return rectRing(0, 0, wall.width, wall.height)
}

export function closeRing(ring: Ring): Ring {
  if (ring.length === 0) return ring
  const [fx, fy] = ring[0]
  const [lx, ly] = ring[ring.length - 1]
  if (fx === lx && fy === ly) return ring
  return [...ring, [fx, fy]]
}

export function ringBounds(ring: Ring): {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
} {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of ring) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  }
}

/** Open vertex list (no duplicate closing point) for editing. */
export function openVertices(ring: Ring): Point[] {
  if (ring.length === 0) return []
  const closed =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
  return closed ? ring.slice(0, -1).map(([x, y]) => [x, y] as Point) : [...ring]
}

export function openingRing(o: Opening): Ring {
  return rectRing(o.x, o.y, o.width, o.height)
}

/** Signed shoelace area for a closed ring. */
export function ringArea(ring: Ring): number {
  const r = closeRing(ring)
  let sum = 0
  for (let i = 0; i < r.length - 1; i++) {
    const [x1, y1] = r[i]
    const [x2, y2] = r[i + 1]
    sum += x1 * y2 - x2 * y1
  }
  return sum / 2
}

export function multiPolygonArea(mp: MultiPolygon): number {
  let area = 0
  for (const poly of mp) {
    if (poly.length === 0) continue
    area += Math.abs(ringArea(poly[0]))
    for (let i = 1; i < poly.length; i++) {
      area -= Math.abs(ringArea(poly[i]))
    }
  }
  return area
}

export function pointInRing(point: Point, ring: Ring): boolean {
  const [x, y] = point
  const r = closeRing(ring)
  let inside = false
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i]
    const [xj, yj] = r[j]
    const intersect =
      yi > y !== yj > y &&
      x < ((xj - xi) * (y - yi)) / (yj - yi + Number.EPSILON) + xi
    if (intersect) inside = !inside
  }
  return inside
}

export interface EffectiveRegionResult {
  multiPolygon: MultiPolygon
  effectiveArea: number
  warnings: EstimateWarning[]
}

/**
 * Subtract openings from wall outer polygon (polygon-clipping = robust boolean ops).
 */
export function computeEffectiveRegion(wall: WallInput): EffectiveRegionResult {
  const warnings: EstimateWarning[] = []
  const outer = wallOuterRing(wall)
  const subject: MultiPolygon = [[outer]]

  if (wall.width <= 0 || wall.height <= 0) {
    return {
      multiPolygon: [],
      effectiveArea: 0,
      warnings: [{ id: 'wall_size_invalid' }],
    }
  }

  const holes: MultiPolygon = []
  for (const opening of wall.openings) {
    if (opening.width <= 0 || opening.height <= 0) {
      warnings.push({
        id: 'opening_size_invalid',
        values: { id: opening.id },
      })
      continue
    }
    const ring = openingRing(opening)
    const corners: Point[] = [
      [opening.x, opening.y],
      [opening.x + opening.width, opening.y],
      [opening.x + opening.width, opening.y + opening.height],
      [opening.x, opening.y + opening.height],
    ]
    const outside = corners.some((c) => !pointInRing(c, outer))
    if (outside) {
      warnings.push({
        id: 'opening_outside',
        values: { id: opening.id },
      })
    }
    holes.push([ring])
  }

  let result: MultiPolygon
  try {
    if (holes.length === 0) {
      result = subject
    } else {
      result = polygonClipping.difference(subject, ...holes) as MultiPolygon
    }
  } catch {
    warnings.push({ id: 'boolean_fallback' })
    const gross = Math.abs(ringArea(outer))
    const holeArea = wall.openings.reduce(
      (s, o) => s + Math.max(0, o.width * o.height),
      0,
    )
    return {
      multiPolygon: subject,
      effectiveArea: Math.max(0, gross - holeArea),
      warnings,
    }
  }

  const effectiveArea = multiPolygonArea(result)
  return { multiPolygon: result, effectiveArea, warnings }
}
