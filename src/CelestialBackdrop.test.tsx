import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CelestialBackdrop } from './CelestialBackdrop'
import { createCelestialRenderer } from './celestial-renderer'

describe('Celestial backdrop', () => {
  const draw = vi.fn()
  const disconnect = vi.fn()
  let frames: Map<number, FrameRequestCallback>
  let nextFrame: number
  let media: EventTarget & { matches: boolean }
  let onIntersection: (visible: boolean) => void

  beforeEach(() => {
    draw.mockReset()
    disconnect.mockClear()
    vi.mocked(createCelestialRenderer).mockReset().mockReturnValue({ draw })
    frames = new Map()
    nextFrame = 0
    media = Object.assign(new EventTarget(), { matches: false })
    vi.stubGlobal('matchMedia', vi.fn(() => media))
    vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback)
      return nextFrame
    }))
    vi.stubGlobal('cancelAnimationFrame', vi.fn((id: number) => frames.delete(id)))
    vi.stubGlobal('IntersectionObserver', class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        onIntersection = visible => callback([{ isIntersecting: visible }])
      }
      observe() {}
      disconnect = disconnect
    })
  })
  async function ready() {
    act(() => onIntersection(true))
    await waitFor(() => expect(document.querySelector('canvas')).toHaveAttribute('data-state', 'ready'))
  }
  function step(now: number) {
    const callbacks = [...frames.values()]
    frames.clear()
    act(() => callbacks.forEach(callback => callback(now)))
  }

  it('creates only when visible, renders at most 24 fps, and caps elapsed time', async () => {
    render(<CelestialBackdrop kind="sun" active language="es" theme="dark" />)
    expect(createCelestialRenderer).not.toHaveBeenCalled()
    expect(frames.size).toBe(0)
    await ready()
    expect(draw).toHaveBeenLastCalledWith(0, 'dark')
    expect(document.querySelector('.celestial-backdrop')).toHaveAttribute('aria-hidden', 'true')
    step(0)
    step(16)
    step(32)
    expect(draw).toHaveBeenCalledOnce()
    step(42)
    expect(draw).toHaveBeenCalledTimes(2)
    step(1000)
    expect(draw.mock.lastCall?.[0]).toBeCloseTo(.142, 5)
  })

  it('pauses independently, keeps its angle, and updates a paused scene for theme/language', async () => {
    const view = render(<CelestialBackdrop kind="moon" active language="es" theme="dark" />)
    await ready()
    step(0)
    step(50)
    fireEvent.click(screen.getByRole('button', { name: 'Pausar animación de esta tarjeta' }))
    expect(frames.size).toBe(0)
    view.rerender(<CelestialBackdrop kind="moon" active language="en" theme="light" />)
    expect(draw).toHaveBeenLastCalledWith(.05, 'light')
    expect(screen.getByRole('button', { name: 'Resume this card animation' })).toBeEnabled()
    expect(createCelestialRenderer).toHaveBeenCalledOnce()
    fireEvent.click(screen.getByRole('button'))
    step(1000)
    step(1050)
    expect(draw).toHaveBeenLastCalledWith(.1, 'light')
    view.unmount()
    expect(frames.size).toBe(0)
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it('preserves a manual pause when changing day/night or entering/leaving conversion', async () => {
    const view = render(<CelestialBackdrop kind="sun" active language="es" theme="dark" />)
    await ready()
    fireEvent.click(screen.getByRole('button'))
    view.rerender(<CelestialBackdrop kind="moon" active={false} language="es" theme="dark" />)
    await ready()
    expect(createCelestialRenderer).toHaveBeenCalledTimes(2)
    expect(vi.mocked(createCelestialRenderer).mock.calls[1][1]).toBe('moon')
    expect(disconnect).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: /mientras conviertes/ })).toBeDisabled()
    expect(frames.size).toBe(0)
    view.rerender(<CelestialBackdrop kind="moon" active language="es" theme="dark" />)
    expect(screen.getByRole('button', { name: 'Reanudar animación de esta tarjeta' })).toBeEnabled()
    expect(frames.size).toBe(0)
  })

  it('draws once under reduced motion and reacts to the operating system setting', async () => {
    media.matches = true
    render(<CelestialBackdrop kind="moon" active language="es" theme="dark" />)
    await ready()
    expect(draw).toHaveBeenCalledOnce()
    expect(frames.size).toBe(0)
    expect(screen.getByRole('button', { name: /movimiento reducido/ })).toBeDisabled()
    act(() => { media.matches = false; media.dispatchEvent(new Event('change')) })
    expect(frames.size).toBe(1)
    act(() => { media.matches = true; media.dispatchEvent(new Event('change')) })
    expect(frames.size).toBe(0)
  })

  it('suspends offscreen/hidden work and redraws the latest theme on return', async () => {
    const view = render(<CelestialBackdrop kind="sun" active language="es" theme="dark" />)
    await ready()
    act(() => onIntersection(false))
    view.rerender(<CelestialBackdrop kind="sun" active language="es" theme="light" />)
    expect(draw).toHaveBeenCalledOnce()
    expect(frames.size).toBe(0)
    act(() => onIntersection(true))
    expect(draw).toHaveBeenLastCalledWith(0, 'light')
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(frames.size).toBe(0)
    hidden.mockReturnValue(false)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(frames.size).toBe(1)
    hidden.mockRestore()
  })

  it('cleans StrictMode subscriptions and ignores observers after unmount', async () => {
    const view = render(<StrictMode><CelestialBackdrop kind="moon" active language="en" theme="light" /></StrictMode>)
    await ready()
    expect(createCelestialRenderer).toHaveBeenCalledOnce()
    expect(frames.size).toBe(1)
    view.unmount()
    act(() => onIntersection(true))
    expect(frames.size).toBe(0)
    expect(disconnect).toHaveBeenCalledTimes(2)
  })

  it.each(['initialization', 'frame'] as const)('shows %s errors and stops the renderer', async (phase) => {
    const error = new Error('Canvas failure')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    if (phase === 'initialization') vi.mocked(createCelestialRenderer).mockImplementation(() => { throw error })
    render(<CelestialBackdrop kind="sun" active language="en" theme="dark" />)
    if (phase === 'frame') {
      await ready()
      draw.mockImplementation(() => { throw error })
      step(0)
      step(50)
    } else {
      act(() => onIntersection(true))
    }
    expect(await screen.findByRole('status')).toHaveTextContent('The clock is still available')
    expect(screen.getByRole('button')).toBeDisabled()
    expect(frames.size).toBe(0)
    expect(log).toHaveBeenCalledWith('Unable to render the celestial backdrop', error)
    act(() => onIntersection(true))
    expect(log).toHaveBeenCalledOnce()
    log.mockRestore()
  })
})
