import { StrictMode } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CelestialBackdrop } from './CelestialBackdrop'
import { messages } from './i18n'

describe('Local card backgrounds', () => {
  it.each([true, false])('loads a decorative static image for isDay=%s without an animation control', (isDay) => {
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    render(<StrictMode><CelestialBackdrop isDay={isDay} language="es" /></StrictMode>)
    const image = document.querySelector('img')!
    expect(image.getAttribute('src')).toContain(isDay ? 'daylight-city.webp' : 'nighttime-city.webp')
    expect(image).toHaveAttribute('alt', '')
    expect(image).toHaveAttribute('loading', 'lazy')
    expect(image.parentElement).toHaveAttribute('aria-hidden', 'true')
    expect(image).toHaveAttribute('data-state', 'loading')
    fireEvent.load(image)
    expect(image).toHaveAttribute('data-state', 'ready')
    expect(document.querySelector('canvas')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(raf).not.toHaveBeenCalled()
  })

  it.each([true, false])('resets image readiness and ignores stale load events when isDay=%s changes', (isDay) => {
    const view = render(<CelestialBackdrop isDay={isDay} language="es" />)
    const original = document.querySelector('img')!
    fireEvent.load(original)
    view.rerender(<CelestialBackdrop isDay={!isDay} language="es" />)
    const next = document.querySelector('img')!
    expect(next).not.toBe(original)
    expect(next).toHaveAttribute('data-state', 'loading')
    fireEvent.load(original)
    expect(next).toHaveAttribute('data-state', 'loading')
    fireEvent.load(next)
    expect(next).toHaveAttribute('data-state', 'ready')
    view.rerender(<CelestialBackdrop isDay={!isDay} language="en" />)
    expect(document.querySelector('img')).toBe(next)
    expect(next).toHaveAttribute('data-state', 'ready')
  })

  it.each([true, false])('reports failures for isDay=%s and recovers when the local day/night period changes', (isDay) => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = render(<CelestialBackdrop isDay={isDay} language="es" />)
    fireEvent.error(document.querySelector('img')!)
    expect(screen.getByRole('status')).toHaveTextContent(isDay ? messages('es').daylightUnavailable : messages('es').nighttimeUnavailable)
    expect(document.querySelector('img')).toBeNull()
    expect(log).toHaveBeenCalledWith(`Unable to load the ${isDay ? 'daytime' : 'nighttime'} card background`)
    view.rerender(<CelestialBackdrop isDay={isDay} language="en" />)
    expect(screen.getByRole('status')).toHaveTextContent(isDay ? messages('en').daylightUnavailable : messages('en').nighttimeUnavailable)
    view.rerender(<CelestialBackdrop isDay={!isDay} language="en" />)
    expect(screen.queryByRole('status')).toBeNull()
    expect(document.querySelector('img')).toHaveAttribute('data-state', 'loading')
    fireEvent.load(document.querySelector('img')!)
    expect(document.querySelector('img')).toHaveAttribute('data-state', 'ready')
  })
})
