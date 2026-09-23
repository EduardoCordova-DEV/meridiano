import { memo, useEffect, useRef, useState } from 'react'
import { CELESTIAL_SIZE, createCelestialRenderer } from './celestial-renderer'
import type { CelestialKind } from './celestial-renderer'
import { messages } from './i18n'
import { Icon } from './icons'
import type { Language, Theme } from './types'

export const CelestialBackdrop = memo(function CelestialBackdrop({ kind, active, language, theme }: {
  kind: CelestialKind; active: boolean; language: Language; theme: Theme
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [paused, setPaused] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const enabled = active && !paused && !reducedMotion
  const options = useRef({ enabled, theme })
  const syncRef = useRef<(() => void) | null>(null)
  const t = messages(language)

  useEffect(() => {
    options.current = { enabled, theme }
    syncRef.current?.()
  }, [enabled, theme])

  useEffect(() => {
    const canvas = canvasRef.current!
    const media = matchMedia('(prefers-reduced-motion: reduce)')
    let renderer: ReturnType<typeof createCelestialRenderer> | null = null
    let request: number | null = null
    let previous: number | null = null
    let seconds = 0
    let visible = typeof IntersectionObserver === 'undefined'
    let failed = false
    let disposed = false
    let drawnTheme: Theme | null = null
    setStatus('loading')

    function cancel() {
      if (request !== null) cancelAnimationFrame(request)
      request = null
      previous = null
    }
    function draw() {
      try {
        renderer ??= createCelestialRenderer(canvas, kind)
        renderer.draw(seconds, options.current.theme)
        if (drawnTheme === null) setStatus('ready')
        drawnTheme = options.current.theme
      } catch (error: unknown) {
        console.error('Unable to render the celestial backdrop', error)
        failed = true
        renderer = null
        cancel()
        setStatus('error')
      }
    }
    function animate(now: number) {
      request = null
      if (disposed || failed || !visible || document.hidden || !options.current.enabled) return
      if (previous === null) previous = now
      const elapsed = now - previous
      if (elapsed >= 1000 / 24) {
        seconds += Math.min(elapsed / 1000, .1)
        previous = now
        draw()
      }
      if (!failed) request = requestAnimationFrame(animate)
    }
    function sync() {
      cancel()
      if (disposed || failed || !visible || document.hidden) return
      // Defer texture generation and canvas buffers until the card is visible.
      if (!renderer || drawnTheme !== options.current.theme) draw()
      if (!failed && options.current.enabled) request = requestAnimationFrame(animate)
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
    sync()
    return () => {
      disposed = true
      cancel()
      observer?.disconnect()
      media.removeEventListener('change', motionChanged)
      document.removeEventListener('visibilitychange', sync)
      renderer = null
      syncRef.current = null
    }
  }, [kind])

  const label = status === 'error' ? t.celestialUnavailable : reducedMotion ? t.celestialReducedMotion :
    !active ? t.celestialConversionPaused : paused ? t.celestialResume : t.celestialPause
  return <>
    <div className="celestial-backdrop" aria-hidden="true">
      <div className="celestial-sphere"><canvas ref={canvasRef} width={CELESTIAL_SIZE} height={CELESTIAL_SIZE} data-kind={kind} data-state={status} /></div>
    </div>
    <button type="button" className="icon-button celestial-toggle" aria-label={label} title={label}
      disabled={status !== 'ready' || reducedMotion || !active} onClick={() => setPaused(value => !value)}>
      <Icon name={enabled ? 'pause' : 'play'} size={14} />
    </button>
    {status === 'error' && <p className="celestial-error" role="status">{t.celestialUnavailable}</p>}
  </>
})
