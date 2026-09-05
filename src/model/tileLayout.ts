import type { LayoutPattern } from './types'

/**
 * タイル1枚の配置。
 * - 軸平行: x,y は左下、width×height
 * - 回転時: anchorX/anchorY を原点に rotationDeg 回転し、局所で (0,0)-(width,height)
 *   （参照ヘリンボーン: translate → rotate → rect）
 */
export interface PlacedTile {
  x: number
  y: number
  width: number
  height: number
  rotationDeg?: number
  /** 回転のピボット（壁座標）。未指定なら矩形中心。 */
  anchorX?: number
  anchorY?: number
  cx?: number
  cy?: number
}

const EPS = 1e-9

function tileCorners(t: PlacedTile): [number, number][] {
  const rot = ((t.rotationDeg ?? 0) * Math.PI) / 180
  const ax = t.anchorX ?? t.x
  const ay = t.anchorY ?? t.y
  if (Math.abs(rot) < EPS) {
    return [
      [t.x, t.y],
      [t.x + t.width, t.y],
      [t.x + t.width, t.y + t.height],
      [t.x, t.y + t.height],
    ]
  }
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  const local: [number, number][] = [
    [0, 0],
    [t.width, 0],
    [t.width, t.height],
    [0, t.height],
  ]
  return local.map(([lx, ly]) => [ax + lx * c - ly * s, ay + lx * s + ly * c])
}

function projectionsOverlap(
  cornersA: [number, number][],
  cornersB: [number, number][],
  axis: [number, number],
): boolean {
  const [ax, ay] = axis
  let minA = Infinity
  let maxA = -Infinity
  let minB = Infinity
  let maxB = -Infinity
  for (const [x, y] of cornersA) {
    const p = x * ax + y * ay
    minA = Math.min(minA, p)
    maxA = Math.max(maxA, p)
  }
  for (const [x, y] of cornersB) {
    const p = x * ax + y * ay
    minB = Math.min(minB, p)
    maxB = Math.max(maxB, p)
  }
  return !(maxA <= minB + EPS || maxB <= minA + EPS)
}

/** 内部が交差するか（辺の接触は許容）。回転タイルは OBB(SAT)。 */
export function interiorsOverlap(a: PlacedTile, b: PlacedTile): boolean {
  const ca = tileCorners(a)
  const cb = tileCorners(b)
  const axes: [number, number][] = []
  for (const corners of [ca, cb]) {
    for (let i = 0; i < 4; i++) {
      const [x0, y0] = corners[i]
      const [x1, y1] = corners[(i + 1) % 4]
      const ex = x1 - x0
      const ey = y1 - y0
      const len = Math.hypot(ex, ey) || 1
      axes.push([-ey / len, ex / len])
    }
  }
  return axes.every((axis) => projectionsOverlap(ca, cb, axis))
}

export function hasAnyOverlap(tiles: PlacedTile[]): boolean {
  for (let i = 0; i < tiles.length; i++) {
    for (let j = i + 1; j < tiles.length; j++) {
      if (interiorsOverlap(tiles[i], tiles[j])) return true
    }
  }
  return false
}

function pushAxisAligned(
  tiles: PlacedTile[],
  wallW: number,
  wallH: number,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  if (w <= 0 || h <= 0) return
  if (x >= wallW - EPS || y >= wallH - EPS) return
  if (x + w <= EPS || y + h <= EPS) return
  tiles.push({ x, y, width: w, height: h })
}

function pushRotated(
  tiles: PlacedTile[],
  wallW: number,
  wallH: number,
  anchorX: number,
  anchorY: number,
  w: number,
  h: number,
  rotationDeg: number,
): void {
  if (w <= 0 || h <= 0) return
  const tile: PlacedTile = {
    x: anchorX,
    y: anchorY,
    width: w,
    height: h,
    rotationDeg,
    anchorX,
    anchorY,
  }
  const corners = tileCorners(tile)
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const [x, y] of corners) {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  }
  if (maxX < 0 || maxY < 0 || minX > wallW || minY > wallH) return
  tiles.push(tile)
}

function keepNonOverlapping(tiles: PlacedTile[]): PlacedTile[] {
  const kept: PlacedTile[] = []
  for (const t of tiles) {
    if (kept.some((k) => interiorsOverlap(k, t))) continue
    kept.push(t)
  }
  return kept
}

/**
 * 並べ方に応じたタイル配置を生成する。
 * 不変条件: どの2枚も内部で重ならない。
 */
export function layoutTiles(options: {
  wallWidth: number
  wallHeight: number
  tileWidth: number
  tileHeight: number
  grout: number
  pattern: LayoutPattern
}): PlacedTile[] {
  const {
    wallWidth: wallW,
    wallHeight: wallH,
    tileWidth: tw,
    tileHeight: th,
    pattern,
  } = options
  const g = Math.max(0, options.grout)
  const tiles: PlacedTile[] = []

  if (tw <= 0 || th <= 0 || wallW <= 0 || wallH <= 0) {
    return tiles
  }

  switch (pattern) {
    case 'straight':
    case 'stack':
      layoutGrid(tiles, wallW, wallH, tw, th, g, 0)
      return keepNonOverlapping(tiles)
    case 'brick':
      layoutGrid(tiles, wallW, wallH, tw, th, g, (tw + g) / 2)
      return keepNonOverlapping(tiles)
    case 'basketweave':
      layoutBasketweave(tiles, wallW, wallH, tw, th, g)
      return keepNonOverlapping(tiles)
    case 'herringbone':
      layoutHerringbone(tiles, wallW, wallH, tw, th, g)
      return keepNonOverlapping(tiles)
    default:
      layoutGrid(tiles, wallW, wallH, tw, th, g, 0)
      return keepNonOverlapping(tiles)
  }
}

function layoutGrid(
  tiles: PlacedTile[],
  wallW: number,
  wallH: number,
  tw: number,
  th: number,
  g: number,
  oddRowOffset: number,
): void {
  const pitchW = tw + g
  const pitchH = th + g
  const rows = Math.ceil(wallH / pitchH) + 1
  const cols = Math.ceil(wallW / pitchW) + 2
  for (let row = 0; row < rows; row++) {
    const y = row * pitchH
    const x0 = row % 2 === 1 ? oddRowOffset : 0
    for (let col = -1; col < cols; col++) {
      pushAxisAligned(tiles, wallW, wallH, col * pitchW + x0, y, tw, th)
    }
  }
}

function layoutBasketweave(
  tiles: PlacedTile[],
  wallW: number,
  wallH: number,
  tw: number,
  th: number,
  g: number,
): void {
  const s = Math.max(tw, th)
  const cell = 2 * s + g

  for (let row = 0, by = 0; by < wallH + cell; row++, by += cell) {
    for (let col = 0, bx = 0; bx < wallW + cell; col++, bx += cell) {
      if ((row + col) % 2 === 0) {
        pushAxisAligned(tiles, wallW, wallH, bx, by, tw, th)
        pushAxisAligned(tiles, wallW, wallH, bx + tw + g, by, tw, th)
        pushAxisAligned(tiles, wallW, wallH, bx, by + th + g, tw, th)
        pushAxisAligned(tiles, wallW, wallH, bx + tw + g, by + th + g, tw, th)
      } else {
        pushAxisAligned(tiles, wallW, wallH, bx, by, th, tw)
        pushAxisAligned(tiles, wallW, wallH, bx + th + g, by, th, tw)
        pushAxisAligned(tiles, wallW, wallH, bx, by + tw + g, th, tw)
        pushAxisAligned(tiles, wallW, wallH, bx + th + g, by + tw + g, th, tw)
      }
    }
  }
}

/**
 * ヘリンボーン（±45°）の繰り返しモジュール（壁座標の軸平行 AABB 目安）。
 * 格子: v1=( (L+g)·√2 , 0 ), v2=( 0 , (W+g)·√2 )
 */
export function herringboneModuleSize(
  tileWidth: number,
  tileHeight: number,
  grout: number,
): { moduleW: number; moduleH: number; long: number; short: number } {
  const g = Math.max(0, grout)
  const long = Math.max(tileWidth, tileHeight)
  const short = Math.min(tileWidth, tileHeight)
  return {
    long,
    short,
    moduleW: (long + g) * Math.SQRT2,
    moduleH: (short + g) * Math.SQRT2,
  }
}

/**
 * ヘリンボーン（45°）:
 *
 * - 長辺 L・短辺 W。A(+45°) の長辺上（原点から短辺距離）に B(−45°) の短辺が噛み合う
 * - B オフセット: ( (W+g)·cos45, (W+g)·sin45 )
 * - 非重なり・面積密度1の格子: stepX=(L+g)·√2 , stepY=(W+g)·√2
 * - 描画は角アンカー → rotate → rect
 */
function layoutHerringbone(
  tiles: PlacedTile[],
  wallW: number,
  wallH: number,
  tw: number,
  th: number,
  g: number,
): void {
  const L = Math.max(tw, th)
  const W = Math.min(tw, th)
  const angle = Math.PI / 4
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const stepX = (L + g) * Math.SQRT2
  const stepY = (W + g) * Math.SQRT2
  const bOffX = (W + g) * cos
  const bOffY = (W + g) * sin

  const i0 = Math.floor(-L / stepX) - 2
  const i1 = Math.ceil((wallW + L) / stepX) + 2
  const j0 = Math.floor(-L / stepY) - 2
  const j1 = Math.ceil((wallH + L) / stepY) + 2

  for (let i = i0; i <= i1; i++) {
    for (let j = j0; j <= j1; j++) {
      const x = i * stepX
      const y = j * stepY
      pushRotated(tiles, wallW, wallH, x, y, L, W, 45)
      pushRotated(tiles, wallW, wallH, x + bOffX, y + bOffY, L, W, -45)
    }
  }
}
