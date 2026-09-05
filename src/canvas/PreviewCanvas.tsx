import { useEffect, useRef } from 'react'
import { useLocaleStore } from '../i18n/useLocaleStore'
import { closeRing, ringBounds } from '../model/geometry'
import { layoutTiles } from '../model/tileLayout'
import { useEstimateStore } from '../store/useEstimateStore'
import { useCanvasBox } from './useCanvasBox'

export function PreviewCanvas() {
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const t = useLocaleStore((s) => s.t)
  const locale = useLocaleStore((s) => s.locale)
  const { width: cssW, height: cssH } = useCanvasBox(frameRef)
  const pad = cssW < 480 ? 10 : 16

  const wallWidth = useEstimateStore((s) => s.wallWidth)
  const wallHeight = useEstimateStore((s) => s.wallHeight)
  const outerVertices = useEstimateStore((s) => s.outerVertices)
  const openings = useEstimateStore((s) => s.openings)
  const tileWidth = useEstimateStore((s) => s.tileWidth)
  const tileHeight = useEstimateStore((s) => s.tileHeight)
  const grout = useEstimateStore((s) => s.grout)
  const pattern = useEstimateStore((s) => s.pattern)
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

    ctx.clearRect(0, 0, cssW, cssH)
    ctx.fillStyle = '#dfe8eb'
    ctx.fillRect(0, 0, cssW, cssH)

    ctx.save()
    ctx.beginPath()
    const closed = closeRing(ring)
    for (let i = 0; i < closed.length; i++) {
      const p = toScreen(closed[i][0], closed[i][1])
      if (i === 0) ctx.moveTo(p.sx, p.sy)
      else ctx.lineTo(p.sx, p.sy)
    }
    ctx.closePath()
    ctx.clip()

    const placed = layoutTiles({
      wallWidth: viewW,
      wallHeight: viewH,
      tileWidth,
      tileHeight,
      grout: grout ?? 0,
      pattern,
    })

    const strokePx = Math.max(1.25, (grout ?? 0) > 0 ? Math.min(2.5, scale * 0.03) : 1.25)
    for (const tile of placed) {
      const rot = tile.rotationDeg ?? 0
      if (rot % 90 !== 0 && tile.anchorX != null && tile.anchorY != null) {
        // +45° / −45° で濃淡を分け、不透明色で視認性を確保
        ctx.fillStyle = rot > 0 ? '#4A90E2' : '#2F6FAD'
        ctx.strokeStyle = '#ffffff'
        // scale 後の CTM では lineWidth も拡大されるので、画面上 strokePx になるよう割る
        ctx.lineWidth = strokePx / scale
        const ax = ox + tile.anchorX * scale
        const ay = oy + (viewH + originY - tile.anchorY) * scale
        ctx.save()
        ctx.translate(ax, ay)
        // 壁座標は Y 上向き。キャンバスは下向きなので scale(1,-1) してから参照と同じ rotate
        ctx.scale(scale, -scale)
        ctx.rotate((rot * Math.PI) / 180)
        ctx.beginPath()
        ctx.rect(0, 0, tile.width, tile.height)
        ctx.fill()
        ctx.stroke()
        ctx.restore()
      } else {
        const sx = ox + tile.x * scale
        const sy = oy + (viewH + originY - tile.y - tile.height) * scale
        ctx.fillStyle = '#90A4AE'
        ctx.strokeStyle = '#37474F'
        ctx.lineWidth = strokePx
        ctx.fillRect(sx, sy, tile.width * scale, tile.height * scale)
        ctx.strokeRect(sx, sy, tile.width * scale, tile.height * scale)
      }
    }
    for (const o of openings) {
      const sx = ox + o.x * scale
      const sy = oy + (viewH + originY - o.y - o.height) * scale
      ctx.fillStyle = '#eceff1'
      ctx.fillRect(sx, sy, o.width * scale, o.height * scale)
      ctx.strokeStyle = '#607d8b'
      ctx.strokeRect(sx, sy, o.width * scale, o.height * scale)
    }
    ctx.restore()

    ctx.strokeStyle = '#2c3e50'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < closed.length; i++) {
      const p = toScreen(closed[i][0], closed[i][1])
      if (i === 0) ctx.moveTo(p.sx, p.sy)
      else ctx.lineTo(p.sx, p.sy)
    }
    ctx.closePath()
    ctx.stroke()

    ctx.fillStyle = '#455a64'
    ctx.font = '12px "Hiragino Sans", "Noto Sans JP", sans-serif'
    ctx.fillText(
      t('canvas.previewTitle', { pattern: t(`pattern.${pattern}`) }),
      pad,
      Math.max(14, oy - 6),
    )
  }, [
    cssW,
    cssH,
    pad,
    wallWidth,
    wallHeight,
    outerVertices,
    openings,
    tileWidth,
    tileHeight,
    grout,
    pattern,
    getOuterRing,
    t,
    locale,
  ])

  return (
    <div className="canvas-frame" ref={frameRef}>
      <div className="canvas-label">{t('canvas.preview')}</div>
      <canvas ref={canvasRef} className="preview-canvas" />
    </div>
  )
}
