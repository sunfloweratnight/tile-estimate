import { useEffect, useRef } from 'react'
import { useLocaleStore } from '../i18n/useLocaleStore'
import { closeRing, ringBounds } from '../model/geometry'
import type { Point } from '../model/types'
import { snap, snapStep, useEstimateStore } from '../store/useEstimateStore'
import { useCanvasBox } from './useCanvasBox'

const HANDLE = 7

type DragTarget =
  | { type: 'opening'; id: string; ox: number; oy: number }
  | { type: 'vertex'; index: number }

export function EditCanvas() {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<DragTarget | null>(null)
  const t = useLocaleStore((s) => s.t)
  const locale = useLocaleStore((s) => s.locale)
  const { width: cssW, height: cssH } = useCanvasBox(frameRef)
  const pad = cssW < 480 ? 12 : 24

  const wallWidth = useEstimateStore((s) => s.wallWidth)
  const wallHeight = useEstimateStore((s) => s.wallHeight)
  const wallUnit = useEstimateStore((s) => s.wallUnit)
  const outerVertices = useEstimateStore((s) => s.outerVertices)
  const openings = useEstimateStore((s) => s.openings)
  const moveOpening = useEstimateStore((s) => s.moveOpening)
  const moveVertex = useEstimateStore((s) => s.moveVertex)
  const getOuterRing = useEstimateStore((s) => s.getOuterRing)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || cssW < 1) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = cssW * dpr
    canvas.height = cssH * dpr
    canvas.style.width = `${cssW}px`
    canvas.style.height = `${cssH}px`

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const ring = getOuterRing()
    const bounds = ringBounds(ring)
    const viewW = Math.max(bounds.width, wallWidth, 1e-6)
    const viewH = Math.max(bounds.height, wallHeight, 1e-6)
    const originX = Math.min(0, bounds.minX)
    const originY = Math.min(0, bounds.minY)

    const scale = Math.min(
      (cssW - pad * 2) / viewW,
      (cssH - pad * 2) / viewH,
    )
    const ox = (cssW - viewW * scale) / 2 - originX * scale
    const oy = (cssH - viewH * scale) / 2 - originY * scale

    const toScreen = (x: number, y: number) => ({
      sx: ox + x * scale,
      sy: oy + (viewH + originY - y) * scale,
    })

    const toWorld = (mx: number, my: number) => {
      const x = (mx - ox) / scale
      const yFromTop = (my - oy) / scale
      const y = viewH + originY - yFromTop
      return { x, y }
    }

    ctx.clearRect(0, 0, cssW, cssH)
    ctx.fillStyle = '#e8eef2'
    ctx.fillRect(0, 0, cssW, cssH)

    ctx.fillStyle = '#f7f4ef'
    ctx.strokeStyle = '#2c3e50'
    ctx.lineWidth = 2
    ctx.beginPath()
    const closed = closeRing(ring)
    for (let i = 0; i < closed.length; i++) {
      const p = toScreen(closed[i][0], closed[i][1])
      if (i === 0) ctx.moveTo(p.sx, p.sy)
      else ctx.lineTo(p.sx, p.sy)
    }
    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    const verts: Point[] = outerVertices ?? []
    const handle = cssW < 480 ? 9 : HANDLE
    for (const [x, y] of verts) {
      const p = toScreen(x, y)
      ctx.fillStyle = '#1565c0'
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(p.sx, p.sy, handle, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
    }

    for (const o of openings) {
      const p = toScreen(o.x, o.y + o.height)
      ctx.fillStyle = o.kind === 'door' ? '#cfd8dc' : '#90a4ae'
      ctx.strokeStyle = '#37474f'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.rect(p.sx, p.sy, o.width * scale, o.height * scale)
      ctx.fill()
      ctx.stroke()
      ctx.fillStyle = '#263238'
      ctx.font = '11px "Hiragino Sans", "Noto Sans JP", sans-serif'
      ctx.fillText(t(`opening.${o.kind}`), p.sx + 4, p.sy + 14)
    }

    ctx.fillStyle = '#546e7a'
    ctx.font = '12px "Hiragino Sans", "Noto Sans JP", sans-serif'
    const label = outerVertices
      ? t('canvas.irregular', { count: verts.length, unit: wallUnit })
      : t('canvas.size', {
          width: wallWidth,
          height: wallHeight,
          unit: wallUnit,
        })
    ctx.fillText(label, pad, Math.max(14, oy - 8 + originY * scale))

    const hitVertex = (mx: number, my: number): number | null => {
      for (let i = verts.length - 1; i >= 0; i--) {
        const p = toScreen(verts[i][0], verts[i][1])
        const dx = mx - p.sx
        const dy = my - p.sy
        if (dx * dx + dy * dy <= (handle + 6) ** 2) return i
      }
      return null
    }

    const hitOpening = (mx: number, my: number) => {
      for (let i = openings.length - 1; i >= 0; i--) {
        const o = openings[i]
        const p = toScreen(o.x, o.y + o.height)
        if (
          mx >= p.sx &&
          mx <= p.sx + o.width * scale &&
          my >= p.sy &&
          my <= p.sy + o.height * scale
        ) {
          return o
        }
      }
      return null
    }

    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const vi = hitVertex(mx, my)
      if (vi !== null) {
        dragRef.current = { type: 'vertex', index: vi }
        canvas.setPointerCapture(e.pointerId)
        return
      }
      const o = hitOpening(mx, my)
      if (!o) return
      const world = toWorld(mx, my)
      dragRef.current = {
        type: 'opening',
        id: o.id,
        ox: world.x - o.x,
        oy: world.y - o.y,
      }
      canvas.setPointerCapture(e.pointerId)
    }

    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current
      if (!drag) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const world = toWorld(mx, my)
      const step = snapStep(wallWidth, wallHeight)
      if (drag.type === 'vertex') {
        moveVertex(drag.index, snap(world.x, step), snap(world.y, step))
      } else {
        moveOpening(drag.id, world.x - drag.ox, world.y - drag.oy)
      }
    }

    const onUp = () => {
      dragRef.current = null
    }

    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    return () => {
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
    }
  }, [
    cssW,
    cssH,
    pad,
    wallWidth,
    wallHeight,
    wallUnit,
    outerVertices,
    openings,
    moveOpening,
    moveVertex,
    getOuterRing,
    t,
    locale,
  ])

  return (
    <div className="canvas-frame" ref={frameRef}>
      <div className="canvas-label">{t('canvas.edit')}</div>
      <canvas ref={canvasRef} className="edit-canvas" />
    </div>
  )
}
