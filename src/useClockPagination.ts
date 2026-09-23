import { useLayoutEffect, useRef, useState } from 'react'
import type { WorldClock } from './types'

export const DESKTOP_VIEWPORT = '(min-width: 760px) and (min-height: 540px)'

export function useClockPagination(clocks: WorldClock[], revealId: string | null) {
  const container = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState<number | null>(null)
  const [anchor, setAnchor] = useState(0)
  const revealed = useRef<string | null>(null)

  useLayoutEffect(() => {
    const element = container.current!
    const media = matchMedia(DESKTOP_VIEWPORT)
    function measure() {
      // Narrow/mobile previews retain the accessible flowing layout.
      const width = element.getBoundingClientRect().width
      if (!media.matches || width === 0) {
        setColumns(null)
        return
      }
      const style = getComputedStyle(element)
      const cardWidth = Number.parseFloat(style.getPropertyValue('--clock-card-width'))
      const gap = Number.parseFloat(style.getPropertyValue('--clock-card-gap'))
      setColumns(Math.max(1, Math.min(4, Math.floor((width + gap) / (cardWidth + gap)))))
    }
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(element)
    media.addEventListener('change', measure)
    measure()
    return () => {
      observer?.disconnect()
      media.removeEventListener('change', measure)
    }
  }, [])

  useLayoutEffect(() => {
    if (revealed.current === revealId) return
    revealed.current = revealId
    const index = clocks.findIndex((clock) => clock.id === revealId)
    if (index !== -1) setAnchor(index)
  }, [clocks, revealId])

  const size = columns ?? Math.max(1, clocks.length)
  const pages = Math.max(1, Math.ceil(clocks.length / size))
  const page = Math.min(Math.floor(anchor / size), pages - 1)
  const start = page * size

  return {
    container, columns, page, pages, start,
    visible: clocks.slice(start, start + size),
    goTo: (target: number) => setAnchor(Math.max(0, Math.min(target, pages - 1)) * size),
  }
}
