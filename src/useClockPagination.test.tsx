import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { CSSProperties } from 'react'
import { useClockPagination } from './useClockPagination'
import type { WorldClock } from './types'

const clocks = Array.from({ length: 10 }, (_, index) => ({ id: `${index}`, zone: 'UTC', label: `${index}` }))
function Harness({ items = clocks, reveal = null }: { items?: WorldClock[]; reveal?: string | null }) {
  const pages = useClockPagination(items, reveal)
  return <div ref={pages.container} style={{ '--clock-card-width': '400px', '--clock-card-gap': '16px' } as CSSProperties}>
    <p>{pages.visible.map((clock) => clock.id).join(',')}</p>
    <button onClick={() => pages.goTo(pages.page + 1)}>Next</button>
    <button onClick={() => pages.goTo(pages.page - 1)}>Previous</button>
  </div>
}

describe('paginación adaptable', () => {
  it('recalcula el tamaño, revela altas y ajusta la última página al eliminar', () => {
    let width = 1280
    let resize = () => {}
    const disconnect = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(0, 0, width, 320))
    vi.mocked(matchMedia).mockReturnValue({ ...matchMedia(''), matches: true })
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback }
      observe() {}
      disconnect = disconnect
    })
    const view = render(<Harness />)
    expect(screen.getByText('0,1,2')).toBeInTheDocument()
    act(() => screen.getByText('Next').click())
    expect(screen.getByText('3,4,5')).toBeInTheDocument()
    act(() => { width = 900; resize() })
    expect(screen.getByText('2,3')).toBeInTheDocument()
    view.rerender(<Harness reveal="9" />)
    expect(screen.getByText('8,9')).toBeInTheDocument()
    view.rerender(<Harness items={clocks.slice(0, 8)} reveal="9" />)
    expect(screen.getByText('6,7')).toBeInTheDocument()
    act(() => screen.getByText('Previous').click())
    expect(screen.getByText('4,5')).toBeInTheDocument()
    view.unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })

  it.each([
    [399.75, '0'],
    [815.75, '0'],
    [816, '0,1'],
    [1231.75, '0,1'],
    [1232, '0,1,2'],
    [1647.75, '0,1,2'],
    [1648, '0,1,2,3'],
    [2200, '0,1,2,3'],
  ])('respeta el ancho real de %s px sin desbordar ni ensanchar cards', (width, visible) => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, width, 320))
    vi.mocked(matchMedia).mockReturnValue({ ...matchMedia(''), matches: true })
    render(<Harness />)
    expect(screen.getByText(visible)).toBeInTheDocument()
  })

  it('mantiene el flujo completo en vistas estrechas y nunca escribe preferencias', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem')
    render(<Harness />)
    expect(screen.getByText('0,1,2,3,4,5,6,7,8,9')).toBeInTheDocument()
    expect(write).not.toHaveBeenCalled()
  })
})
