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
 * ヘリンボーン（45°）:
 *
 * 参照 HTML の step=w·cos で A/B を毎格子に置くと隣接セル同士が重なる。
 * 平面を埋めつつ重ならない配置は、タイル中心を格子に置き:
 *   - 格子間隔 step = (w + h) / √2
 *   - A: 中心 (i·step, j·step)、+45°
 *   - B: 中心を ((w+h)/2)·(cos45, sin45) ずらして −45°
 * 描画は参照と同じく「角を原点に translate → rotate → rect」。
 * 目地 g は描画寸法だけ縮める（ステップは公称サイズ基準）。
 */
function layoutHerringbone(
  tiles: PlacedTile[],
  wallW: number,
  wallH: number,
  tw: number,
  th: number,
  g: number,
): void {
  const w = Math.max(tw, th)
  const h = Math.min(tw, th)
  const angle = Math.PI / 4
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)

  const drawW = Math.max(w - g, w * 0.5)
  const drawH = Math.max(h - g, h * 0.5)

  const step = (w + h) / Math.SQRT2
  const pairDx = ((w + h) / 2) * cos
  const pairDy = ((w + h) / 2) * sin

  const pushCentered = (cx: number, cy: number, rotationDeg: number) => {
    const rot = (rotationDeg * Math.PI) / 180
    const c = Math.cos(rot)
    const s = Math.sin(rot)
    // 局所中心 (drawW/2, drawH/2) が世界座標 (cx, cy) になるよう角アンカーを決める
    const lx = drawW / 2
    const ly = drawH / 2
    const ax = cx - (lx * c - ly * s)
    const ay = cy - (lx * s + ly * c)
    pushRotated(tiles, wallW, wallH, ax, ay, drawW, drawH, rotationDeg)
  }

  const margin = w + h
  for (let x = -margin; x < wallW + margin; x += step) {
    for (let y = -margin; y < wallH + margin; y += step) {
      pushCentered(x, y, 45)
      pushCentered(x + pairDx, y + pairDy, -45)
    }
  }
}
