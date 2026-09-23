import { memo, useEffect, useRef, useState } from 'react'
import { createEarthRenderer, EARTH_SIZE } from './earth-renderer'
import { messages } from './i18n'
import { Icon } from './icons'
import type { Language } from './types'

export const EarthBackdrop = memo(function EarthBackdrop({ active, language }: { active: boolean; language: Language }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const enabled = active && !paused && !reducedMotion
  const enabledRef = useRef(enabled)
  const syncRef = useRef<(() => void) | null>(null)
  const t = messages(language)

  useEffect(() => {
    enabledRef.current = enabled
    syncRef.current?.()
  }, [enabled])

  useEffect(() => {
    const canvas = canvasRef.current!
    const abort = new AbortController()
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    let renderer: Awaited<ReturnType<typeof createEarthRenderer>> | null = null
    let request: number | null = null
    let previous: number | null = null
    let seconds = 0
    let visible = true

    function animate(now: number) {
      request = null
      if (abort.signal.aborted || !renderer || !enabledRef.current || document.hidden || !visible) return
      if (previous === null) previous = now
      const elapsed = now - previous
      if (elapsed >= 1000 / 24) {
        seconds += Math.min(elapsed / 1000, .1)
        renderer.draw(seconds)
        previous = now
      }
      request = requestAnimationFrame(animate)
    }

    function sync() {
      if (request !== null) cancelAnimationFrame(request)
      request = null
      previous = null
      if (renderer && enabledRef.current && !document.hidden && visible && !abort.signal.aborted) {
        request = requestAnimationFrame(animate)
      }
    }

    function motionChanged() { setReducedMotion(media.matches) }
    const observer = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    observer?.observe(canvas)
    media.addEventListener('change', motionChanged)
    document.addEventListener('visibilitychange', sync)
    syncRef.current = sync

    void createEarthRenderer(canvas, abort.signal).then((loaded) => {
      if (abort.signal.aborted) return
      renderer = loaded
      renderer.draw(0)
      setStatus('ready')
      sync()
    }).catch((error: unknown) => {
      if (abort.signal.aborted) return
      console.error('Unable to render the Earth backdrop', error)
      setStatus('error')
    })

    return () => {
      abort.abort()
      if (request !== null) cancelAnimationFrame(request)
      observer?.disconnect()
      media.removeEventListener('change', motionChanged)
      document.removeEventListener('visibilitychange', sync)
      syncRef.current = null
    }
  }, [])

  const label = status === 'error' ? t.earthUnavailable : reducedMotion ? t.earthReducedMotion : !active ? t.earthConversionPaused : paused ? t.earthResume : t.earthPause
  return <>
    <div className="earth-backdrop" aria-hidden="true">
      <div className="earth-sphere"><canvas ref={canvasRef} width={EARTH_SIZE} height={EARTH_SIZE} data-state={status} /></div>
    </div>
    <button className="earth-toggle" type="button" aria-label={label} title={label} disabled={status !== 'ready' || reducedMotion || !active} onClick={() => setPaused((value) => !value)}>
      <Icon name={enabled ? 'pause' : 'play'} size={13} />
    </button>
    {status === 'error' && <p className="earth-error" role="status">{t.earthUnavailable}</p>}
  </>
})
