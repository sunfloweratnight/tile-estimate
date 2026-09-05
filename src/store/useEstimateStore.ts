import { create } from 'zustand'
import {
  BASE_LABOR_PER_AREA,
  DEFAULT_GROUT_METERS,
} from '../masters/rates'
import {
  closeRing,
  openVertices,
  rectRing,
  ringBounds,
} from '../model/geometry'
import {
  suggestAutoFitTile,
  suggestAutoFitWall,
} from '../model/patternFit'
import type {
  EstimateInput,
  EstimateResult,
  LayoutPattern,
  Opening,
  Point,
  Ring,
  TileKind,
} from '../model/types'
import {
  convertLength,
  fromMeters,
  toMeters,
  type LengthUnit,
} from '../model/units'
import { estimateInWorker } from '../worker/client'

export interface AppState {
  wallWidth: number
  wallHeight: number
  wallUnit: LengthUnit
  /** null = 長方形。設定時は凹凸のある外周。壁単位。 */
  outerVertices: Point[] | null
  openings: Opening[]
  tileWidth: number
  tileHeight: number
  tileUnit: LengthUnit
  tileKind: TileKind
  /** 目地幅。タイル単位。null = 既定 2mm */
  grout: number | null
  pattern: LayoutPattern
  rotationDeg: number
  baseLaborPerArea: number
  result: EstimateResult | null
  estimating: boolean
  error: string | null
  setWallSize: (width: number, height: number) => void
  setWallUnit: (unit: LengthUnit) => void
  setTile: (partial: {
    width?: number
    height?: number
    kind?: TileKind
    grout?: number | null
  }) => void
  setTileUnit: (unit: LengthUnit) => void
  setPattern: (pattern: LayoutPattern) => void
  setRotation: (deg: number) => void
  autoFitWallToPattern: () => boolean
  autoFitTileToWall: () => boolean
  addOpening: (opening?: Partial<Opening>) => void
  updateOpening: (id: string, patch: Partial<Opening>) => void
  removeOpening: (id: string) => void
  moveOpening: (id: string, x: number, y: number) => void
  enableIrregularOutline: () => void
  resetToRectangle: () => void
  applyLShapeNotch: () => void
  moveVertex: (index: number, x: number, y: number) => void
  insertVertexOnEdge: (afterIndex: number) => void
  removeVertex: (index: number) => void
  scheduleEstimate: () => void
  buildInput: () => EstimateInput
  getOuterRing: () => Ring
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let requestSeq = 0

/** 壁の尺度に合わせたスナップ幅 */
export function snapStep(wallWidth: number, wallHeight: number): number {
  const span = Math.max(wallWidth, wallHeight)
  if (span >= 1000) return 10
  if (span >= 100) return 1
  return 0.1
}

export function snap(n: number, grid = 0.1): number {
  return Math.round(n / grid) * grid
}

function syncBoundsFromVertices(vertices: Point[]): {
  wallWidth: number
  wallHeight: number
} {
  const b = ringBounds(closeRing(vertices))
  return {
    wallWidth: Math.max(b.width, 0.1),
    wallHeight: Math.max(b.height, 0.1),
  }
}

function scalePoint(p: Point, factor: number): Point {
  return [p[0] * factor, p[1] * factor]
}

export const useEstimateStore = create<AppState>((set, get) => ({
  wallWidth: 10,
  wallHeight: 10,
  wallUnit: 'm',
  outerVertices: null,
  openings: [],
  tileWidth: 2,
  tileHeight: 1,
  tileUnit: 'm',
  tileKind: 'standard',
  grout: 0,
  pattern: 'herringbone',
  rotationDeg: 0,
  baseLaborPerArea: BASE_LABOR_PER_AREA,
  result: null,
  estimating: false,
  error: null,

  getOuterRing: () => {
    const s = get()
    if (s.outerVertices && s.outerVertices.length >= 3) {
      return closeRing(s.outerVertices)
    }
    return rectRing(0, 0, s.wallWidth, s.wallHeight)
  },

  buildInput: () => {
    const s = get()
    const wu = s.wallUnit
    const tu = s.tileUnit
    const outer =
      s.outerVertices && s.outerVertices.length >= 3
        ? closeRing(s.outerVertices.map((p) => scalePoint(p, toMeters(1, wu))))
        : undefined
    return {
      wall: {
        id: 'wall-1',
        width: toMeters(s.wallWidth, wu),
        height: toMeters(s.wallHeight, wu),
        outerPolygon: outer,
        openings: s.openings.map((o) => ({
          ...o,
          x: toMeters(o.x, wu),
          y: toMeters(o.y, wu),
          width: toMeters(o.width, wu),
          height: toMeters(o.height, wu),
        })),
      },
      tile: {
        width: toMeters(s.tileWidth, tu),
        height: toMeters(s.tileHeight, tu),
        kind: s.tileKind,
        grout: s.grout === null ? null : toMeters(s.grout, tu),
        lossRateOverride: null,
      },
      layout: {
        pattern: s.pattern,
        rotationDeg: s.rotationDeg,
      },
      labor: {
        baseLaborPerArea: s.baseLaborPerArea,
      },
    }
  },

  scheduleEstimate: () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(async () => {
      const seq = ++requestSeq
      set({ estimating: true, error: null })
      try {
        const result = await estimateInWorker(get().buildInput())
        if (seq !== requestSeq) return
        set({ result, estimating: false })
      } catch (e) {
        if (seq !== requestSeq) return
        set({
          estimating: false,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    }, 80)
  },

  setWallSize: (width, height) => {
    set({ wallWidth: width, wallHeight: height })
    get().scheduleEstimate()
  },

  setWallUnit: (unit) => {
    const s = get()
    if (unit === s.wallUnit) return
    const from = s.wallUnit
    const factor = convertLength(1, from, unit)
    const openings = s.openings.map((o) => ({
      ...o,
      x: convertLength(o.x, from, unit),
      y: convertLength(o.y, from, unit),
      width: convertLength(o.width, from, unit),
      height: convertLength(o.height, from, unit),
    }))
    const outerVertices = s.outerVertices
      ? s.outerVertices.map((p) => scalePoint(p, factor))
      : null
    set({
      wallUnit: unit,
      wallWidth: convertLength(s.wallWidth, from, unit),
      wallHeight: convertLength(s.wallHeight, from, unit),
      openings,
      outerVertices,
    })
    get().scheduleEstimate()
  },

  setTile: (partial) => {
    set((s) => ({
      tileWidth: partial.width ?? s.tileWidth,
      tileHeight: partial.height ?? s.tileHeight,
      tileKind: partial.kind ?? s.tileKind,
      grout: partial.grout !== undefined ? partial.grout : s.grout,
    }))
    get().scheduleEstimate()
  },

  setTileUnit: (unit) => {
    const s = get()
    if (unit === s.tileUnit) return
    const from = s.tileUnit
    set({
      tileUnit: unit,
      tileWidth: convertLength(s.tileWidth, from, unit),
      tileHeight: convertLength(s.tileHeight, from, unit),
      grout:
        s.grout === null ? null : convertLength(s.grout, from, unit),
    })
    get().scheduleEstimate()
  },

  setPattern: (pattern) => {
    set({ pattern })
    get().scheduleEstimate()
  },

  setRotation: (deg) => {
    set({ rotationDeg: deg })
    get().scheduleEstimate()
  },

  autoFitWallToPattern: () => {
    const s = get()
    const wu = s.wallUnit
    const tu = s.tileUnit
    const groutM =
      s.grout === null ? DEFAULT_GROUT_METERS : toMeters(s.grout, tu)
    const fit = suggestAutoFitWall({
      wallWidth: toMeters(s.wallWidth, wu),
      wallHeight: toMeters(s.wallHeight, wu),
      tileWidth: toMeters(s.tileWidth, tu),
      tileHeight: toMeters(s.tileHeight, tu),
      grout: groutM,
      pattern: s.pattern,
    })
    if (!fit.changed) return false
    get().setWallSize(
      fromMeters(fit.width, wu),
      fromMeters(fit.height, wu),
    )
    return true
  },

  autoFitTileToWall: () => {
    const s = get()
    const wu = s.wallUnit
    const tu = s.tileUnit
    const groutM =
      s.grout === null ? DEFAULT_GROUT_METERS : toMeters(s.grout, tu)
    const fit = suggestAutoFitTile({
      wallWidth: toMeters(s.wallWidth, wu),
      wallHeight: toMeters(s.wallHeight, wu),
      tileWidth: toMeters(s.tileWidth, tu),
      tileHeight: toMeters(s.tileHeight, tu),
      grout: groutM,
      pattern: s.pattern,
    })
    if (!fit.changed) return false
    get().setTile({
      width: fromMeters(fit.width, tu),
      height: fromMeters(fit.height, tu),
    })
    return true
  },

  addOpening: (opening) => {
    const s = get()
    const step = snapStep(s.wallWidth, s.wallHeight)
    const id = `op-${crypto.randomUUID().slice(0, 8)}`
    const next: Opening = {
      id,
      kind: opening?.kind ?? 'window',
      width: opening?.width ?? Math.min(2, s.wallWidth / 2),
      height: opening?.height ?? Math.min(1.5, s.wallHeight / 2),
      x: opening?.x ?? snap(s.wallWidth * 0.25, step),
      y: opening?.y ?? snap(s.wallHeight * 0.35, step),
    }
    set({ openings: [...s.openings, next] })
    get().scheduleEstimate()
  },

  updateOpening: (id, patch) => {
    set((s) => ({
      openings: s.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }))
    get().scheduleEstimate()
  },

  removeOpening: (id) => {
    set((s) => ({ openings: s.openings.filter((o) => o.id !== id) }))
    get().scheduleEstimate()
  },

  moveOpening: (id, x, y) => {
    const s = get()
    const o = s.openings.find((op) => op.id === id)
    if (!o) return
    const step = snapStep(s.wallWidth, s.wallHeight)
    const nx = Math.max(0, Math.min(snap(x, step), s.wallWidth - o.width))
    const ny = Math.max(0, Math.min(snap(y, step), s.wallHeight - o.height))
    set({
      openings: s.openings.map((op) =>
        op.id === id ? { ...op, x: nx, y: ny } : op,
      ),
    })
    get().scheduleEstimate()
  },

  enableIrregularOutline: () => {
    const s = get()
    if (s.outerVertices) return
    const verts = openVertices(rectRing(0, 0, s.wallWidth, s.wallHeight))
    set({ outerVertices: verts })
    get().scheduleEstimate()
  },

  resetToRectangle: () => {
    const s = get()
    set({
      outerVertices: null,
      wallWidth: s.wallWidth,
      wallHeight: s.wallHeight,
    })
    get().scheduleEstimate()
  },

  applyLShapeNotch: () => {
    const s = get()
    const w = s.wallWidth
    const h = s.wallHeight
    const cutW = w * 0.4
    const cutH = h * 0.4
    const verts: Point[] = [
      [0, 0],
      [w, 0],
      [w, h - cutH],
      [w - cutW, h - cutH],
      [w - cutW, h],
      [0, h],
    ]
    const bounds = syncBoundsFromVertices(verts)
    set({ outerVertices: verts, ...bounds })
    get().scheduleEstimate()
  },

  moveVertex: (index, x, y) => {
    const s = get()
    if (!s.outerVertices) return
    const step = snapStep(s.wallWidth, s.wallHeight)
    const verts = s.outerVertices.map((p, i) =>
      i === index ? ([snap(x, step), snap(y, step)] as Point) : p,
    )
    const bounds = syncBoundsFromVertices(verts)
    set({ outerVertices: verts, ...bounds })
    get().scheduleEstimate()
  },

  insertVertexOnEdge: (afterIndex) => {
    const s = get()
    if (!s.outerVertices || s.outerVertices.length < 3) return
    const verts = [...s.outerVertices]
    const a = verts[afterIndex]
    const b = verts[(afterIndex + 1) % verts.length]
    const mid: Point = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    verts.splice(afterIndex + 1, 0, mid)
    set({ outerVertices: verts })
    get().scheduleEstimate()
  },

  removeVertex: (index) => {
    const s = get()
    if (!s.outerVertices || s.outerVertices.length <= 3) return
    const verts = s.outerVertices.filter((_, i) => i !== index)
    const bounds = syncBoundsFromVertices(verts)
    set({ outerVertices: verts, ...bounds })
    get().scheduleEstimate()
  },
}))
