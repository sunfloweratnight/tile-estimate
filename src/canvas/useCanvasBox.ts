import { useLayoutEffect, useState, type RefObject } from 'react'

/** Parent width + responsive canvas height; updates on resize/orientation. */
export function useCanvasBox(
  containerRef: RefObject<HTMLElement | null>,
): { width: number; height: number } {
  const [box, setBox] = useState({ width: 320, height: 240 })

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const measure = () => {
      const width = Math.max(el.clientWidth, 1)
      const narrow = width < 480
      const height = narrow
        ? Math.round(Math.max(200, Math.min(260, width * 0.78)))
        : Math.round(Math.max(260, Math.min(420, width * 0.7)))
      setBox((prev) =>
        prev.width === width && prev.height === height
          ? prev
          : { width, height },
      )
    }

    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    window.addEventListener('orientationchange', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('orientationchange', measure)
    }
  }, [containerRef])

  return box
}
