import { StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EarthBackdrop } from './EarthBackdrop'
import { createEarthRenderer } from './earth-renderer'

vi.mock('./earth-renderer', () => ({ EARTH_SIZE: 384, createEarthRenderer: vi.fn() }))

describe('Earth backdrop', () => {
  const draw = vi.fn()
  let frames: Map<number, FrameRequestCallback>
  let nextFrame: number
  let media: EventTarget & { matches: boolean }
  let onIntersection: ((visible: boolean) => void) | undefined
  const disconnect = vi.fn()

  beforeEach(() => {
    draw.mockClear()
    disconnect.mockClear()
    vi.mocked(createEarthRenderer).mockReset().mockResolvedValue({ draw })
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
        onIntersection = (visible) => callback([{ isIntersecting: visible }])
      }
      observe() {}
      disconnect = disconnect
    })
  })

  async function ready() {
    await waitFor(() => expect(document.querySelector('canvas')).toHaveAttribute('data-state', 'ready'))
  }

  function step(now: number) {
    const callbacks = [...frames.values()]
    frames.clear()
    act(() => callbacks.forEach(callback => callback(now)))
  }

  it('draws once, rotates, pauses without losing its angle, and resumes without reloading', async () => {
    const view = render(<EarthBackdrop active language="es" />)
    await ready()
    expect(draw).toHaveBeenLastCalledWith(0)
    expect(document.querySelector('.earth-backdrop')).toHaveAttribute('aria-hidden', 'true')
    step(0)
    step(50)
    expect(draw).toHaveBeenLastCalledWith(.05)
    fireEvent.click(screen.getByRole('button', { name: 'Pausar animación de la Tierra' }))
    expect(frames.size).toBe(0)
    expect(screen.getByRole('button', { name: 'Reanudar animación de la Tierra' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Reanudar animación de la Tierra' }))
    step(1000)
    step(1050)
    expect(draw).toHaveBeenLastCalledWith(.1)
    view.rerender(<EarthBackdrop active language="en" />)
    expect(screen.getByRole('button', { name: 'Pause Earth animation' })).toBeEnabled()
    expect(createEarthRenderer).toHaveBeenCalledTimes(1)
    view.unmount()
    expect(frames.size).toBe(0)
    expect(disconnect).toHaveBeenCalledOnce()
    expect(vi.mocked(createEarthRenderer).mock.calls[0][1].aborted).toBe(true)
  })

  it('stays static for reduced motion and conversion, preserving an explicit pause', async () => {
    media.matches = true
    const view = render(<EarthBackdrop active language="es" />)
    await ready()
    expect(frames.size).toBe(0)
    expect(draw).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', { name: /movimiento reducido/ })).toBeDisabled()
    act(() => { media.matches = false; media.dispatchEvent(new Event('change')) })
    expect(frames.size).toBe(1)
    view.rerender(<EarthBackdrop active={false} language="es" />)
    expect(frames.size).toBe(0)
    expect(screen.getByRole('button', { name: /mientras conviertes/ })).toBeDisabled()
    view.rerender(<EarthBackdrop active language="es" />)
    fireEvent.click(screen.getByRole('button', { name: 'Pausar animación de la Tierra' }))
    view.rerender(<EarthBackdrop active={false} language="es" />)
    view.rerender(<EarthBackdrop active language="es" />)
    expect(frames.size).toBe(0)
    expect(screen.getByRole('button', { name: 'Reanudar animación de la Tierra' })).toBeEnabled()
  })

  it('suspends work outside the viewport and in hidden tabs', async () => {
    render(<EarthBackdrop active language="es" />)
    await ready()
    expect(frames.size).toBe(1)
    act(() => onIntersection?.(false))
    expect(frames.size).toBe(0)
    act(() => onIntersection?.(true))
    expect(frames.size).toBe(1)
    const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(frames.size).toBe(0)
    hidden.mockReturnValue(false)
    act(() => document.dispatchEvent(new Event('visibilitychange')))
    expect(frames.size).toBe(1)
  })

  it('cleans up StrictMode mounts and ignores completed loads after unmount', async () => {
    const view = render(<StrictMode><EarthBackdrop active language="en" /></StrictMode>)
    await ready()
    expect(createEarthRenderer).toHaveBeenCalledTimes(2)
    expect(draw).toHaveBeenCalledOnce()
    expect(vi.mocked(createEarthRenderer).mock.calls[0][1].aborted).toBe(true)
    expect(frames.size).toBe(1)
    view.unmount()
    expect(frames.size).toBe(0)
    expect(disconnect).toHaveBeenCalledTimes(2)
  })

  it('reports a rendering failure visibly without leaving an animation running', async () => {
    const error = new Error('Texture unavailable')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(createEarthRenderer).mockRejectedValue(error)
    render(<EarthBackdrop active language="en" />)
    expect(await screen.findByRole('status')).toHaveTextContent('Clocks are still available')
    expect(screen.getByRole('button')).toBeDisabled()
    expect(log).toHaveBeenCalledWith('Unable to render the Earth backdrop', error)
    expect(frames.size).toBe(0)
  })
})
