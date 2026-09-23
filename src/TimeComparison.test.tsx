import { StrictMode } from 'react'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { PRESETS } from './palette'
import { defaultPreferences, parsePreferences, STORAGE_KEY } from './storage'
import { BASE_ZONE, getClockDetails, mexicoDaySlots, mexicoInputToInstant, shiftMexicoDate } from './time'

describe('horas alineadas por instante', () => {
  it.each([
    ['2026-07-15', 24], ['2022-04-03', 23], ['2022-10-30', 25],
    ['1970-01-01', 24], ['2100-12-31', 24],
  ])('el día %s tiene %s columnas reales y ordenadas', (date, count) => {
    const slots = mexicoDaySlots(date)
    expect(slots).toHaveLength(count)
    expect(new Set(slots).size).toBe(count)
    expect(slots.every((slot) => getClockDetails(slot, BASE_ZONE, '24').isoDate === date)).toBe(true)
    expect(slots.slice(1).every((slot, index) => slot - slots[index] === 3_600_000)).toBe(true)
  })

  it('omite horas inexistentes y distingue las repetidas por sus offsets', () => {
    expect(mexicoDaySlots('2022-04-03').map((slot) => getClockDetails(slot, BASE_ZONE, '24').time)).not.toContain('02:00')
    const repeated = mexicoDaySlots('2022-10-30').map((slot) => getClockDetails(slot, BASE_ZONE, '24')).filter((details) => details.time === '01:00')
    expect(repeated.map((details) => details.offset)).toEqual(['UTC−05:00', 'UTC−06:00'])
  })

  it('usa la misma columna para CDMX, DST de Nueva York, India y Nepal', () => {
    for (const [date, newYorkTime] of [['2026-01-15', '10:00'], ['2026-07-15', '11:00']]) {
      const slot = mexicoDaySlots(date)[9]
      expect(slot).toBe(mexicoInputToInstant(date, '09:00'))
      expect(getClockDetails(slot, 'America/New_York', '24').time).toBe(newYorkTime)
      expect(getClockDetails(slot, 'Asia/Kolkata', '24').time).toBe('20:30')
      expect(getClockDetails(slot, 'Asia/Kathmandu', '24').time).toBe('20:45')
    }
  })

  it('navega fechas civiles, no saltos fijos de 24 h', () => {
    expect(shiftMexicoDate('2026-12-31', 1)).toBe('2027-01-01')
    expect(shiftMexicoDate('2024-03-01', -1)).toBe('2024-02-29')
    expect(shiftMexicoDate('2022-04-03', 1)).toBe('2022-04-04')
  })

  it.each([['06:59', false, false], ['07:00', true, false], ['09:00', true, true], ['17:59', true, true], ['18:00', true, false], ['19:00', false, false]])('clasifica la hora local %s sin usar el formato 12 h', (time, isDay, isBusinessHour) => {
    const details = getClockDetails(mexicoInputToInstant('2026-07-15', time), BASE_ZONE, '12')
    expect(details).toMatchObject({ isDay, isBusinessHour })
    expect(details.zoneName).not.toBe('')
  })
})

describe('comparador de ciudades', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-15T15:30:00Z'))
  })
  afterEach(() => { vi.useRealTimers() })

  function setup() {
    const preferences = {
      ...defaultPreferences(), clockView: 'timeline' as const, theme: 'dark' as const,
      palettePreset: 'react' as const, personalization: PRESETS.react,
      clocks: [{ id: 'nepal', zone: 'Asia/Kathmandu', label: 'Cliente Nepal' }, { id: 'ny', zone: 'America/New_York', label: '' }],
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    return preferences
  }

  function baseRow() {
    return within(screen.getAllByRole('row')[1])
  }

  function convert(date: string, time: string) {
    fireEvent.click(screen.getByRole('button', { name: 'Convertir horario' }))
    fireEvent.change(screen.getByLabelText('Fecha en CDMX'), { target: { value: date } })
    fireEvent.change(screen.getByLabelText('Hora en CDMX (24 h)'), { target: { value: time } })
    fireEvent.click(screen.getByRole('button', { name: 'Convertir en todos los relojes' }))
  }

  it('abre la vista guardada sin escrituras y comparte la selección con el conversor y las tarjetas', () => {
    const preferences = setup()
    const write = vi.spyOn(Storage.prototype, 'setItem')
    const interval = vi.spyOn(window, 'setInterval')
    const clearInterval = vi.spyOn(window, 'clearInterval')
    render(<StrictMode><App /></StrictMode>)
    expect(write).not.toHaveBeenCalled()
    expect(screen.getAllByRole('row')).toHaveLength(4)
    expect(screen.getByRole('timer')).toHaveTextContent('09:30')
    fireEvent.click(baseRow().getByRole('button', { name: /^Elegir 09:00,/ }))
    expect(screen.getByLabelText('Hora en CDMX (24 h)')).toHaveValue('09:00')
    expect(screen.getByRole('timer')).toHaveTextContent('09:00')
    expect(screen.getAllByRole('rowheader')[1]).toHaveTextContent('20:45')
    expect(screen.getAllByRole('rowheader')[2]).toHaveTextContent('11:00')
    expect(clearInterval).toHaveBeenCalledWith(interval.mock.results.at(-1)!.value)
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(screen.getByRole('timer')).toHaveTextContent('09:00')
    expect(write).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Tarjetas' }))
    expect(screen.getByRole('article', { name: 'Reloj de Katmandú, Cliente Nepal' })).toHaveTextContent('20:45')
    expect(parsePreferences(window.localStorage.getItem(STORAGE_KEY)!)).toEqual({ ...preferences, clockView: 'cards' })
  })

  it('permite recorrer columnas con flechas, Inicio y Fin y volver al reloj vivo', () => {
    setup()
    const interval = vi.spyOn(window, 'setInterval')
    render(<App />)
    const selected = baseRow().getByRole('button', { name: /^Elegir 09:00,/ })
    selected.focus()
    fireEvent.keyDown(selected, { key: 'ArrowRight' })
    expect(baseRow().getByRole('button', { name: /^Elegir 10:00,/ })).toHaveFocus()
    expect(screen.getByRole('timer')).toHaveTextContent('10:00')
    fireEvent.keyDown(document.activeElement!, { key: 'End' })
    expect(screen.getByRole('timer')).toHaveTextContent('23:00')
    expect(screen.getAllByRole('rowheader')[1]).toHaveTextContent('+1 día')
    fireEvent.keyDown(document.activeElement!, { key: 'Home' })
    expect(screen.getByRole('timer')).toHaveTextContent('00:00')
    fireEvent.click(within(screen.getByRole('region', { name: 'Un día, todas tus ciudades' })).getByRole('button', { name: 'Volver a ahora' }))
    expect(screen.getByRole('timer')).toHaveTextContent('09:30')
    expect(interval).toHaveBeenCalledTimes(2)
  })

  it('selecciona las dos ocurrencias históricas de una hora sin confundir sus instantes', () => {
    setup()
    render(<App />)
    convert('2022-10-30', '00:00')
    expect(screen.getByText(/Este día histórico tiene 25 horas/)).toBeInTheDocument()
    const repeated = baseRow().getAllByRole('button', { name: /^Elegir 01:00,/ })
    expect(repeated).toHaveLength(2)
    fireEvent.click(repeated[0])
    expect(screen.getAllByRole('rowheader')[0]).toHaveTextContent('UTC−05:00')
    expect(screen.getAllByRole('rowheader')[2]).toHaveTextContent('02:00')
    fireEvent.click(repeated[1])
    expect(screen.getAllByRole('rowheader')[0]).toHaveTextContent('UTC−06:00')
    expect(screen.getAllByRole('rowheader')[2]).toHaveTextContent('03:00')
    fireEvent.click(screen.getByRole('button', { name: 'Convertir en todos los relojes' }))
    expect(within(screen.getByRole('region', { name: 'Encuentra el momento' })).getByRole('alert')).toHaveTextContent('ambigua')
    expect(screen.getAllByRole('rowheader')[0]).toHaveTextContent('UTC−06:00')
  })

  it('respeta los límites y rechaza una navegación a una hora inexistente sin cambiar el instante', () => {
    setup()
    render(<App />)
    convert('1970-01-01', '09:00')
    expect(screen.getByRole('button', { name: 'Día anterior en CDMX' })).toBeDisabled()
    convert('2100-12-31', '09:00')
    expect(screen.getByRole('button', { name: 'Día siguiente en CDMX' })).toBeDisabled()
    convert('2022-04-02', '02:30')
    fireEvent.click(screen.getByRole('button', { name: 'Día siguiente en CDMX' }))
    expect(screen.getByLabelText('Fecha en CDMX')).toHaveValue('2022-04-02')
    expect(screen.getByRole('timer')).toHaveTextContent('02:30')
    expect(within(screen.getByRole('region', { name: 'Un día, todas tus ciudades' })).getByRole('alert')).toHaveTextContent('ambigua o no existió')
  })

  it('permite editar, añadir, quitar todos los clientes y conservar CDMX como referencia', () => {
    setup()
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Editar reloj de Katmandú' }))
    fireEvent.change(screen.getByLabelText(/Etiqueta de cliente/), { target: { value: 'Equipo Nepal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByText('Equipo Nepal')).toBeInTheDocument()
    for (const button of screen.getAllByRole('button', { name: /Quitar reloj de/ })) fireEvent.click(button)
    expect(screen.getAllByRole('rowheader')).toHaveLength(1)
    expect(screen.getByRole('rowheader')).toHaveTextContent('America/Mexico_City')
    expect(parsePreferences(window.localStorage.getItem(STORAGE_KEY)!).clocks).toEqual([])
    fireEvent.click(screen.getByRole('button', { name: 'Añadir un reloj de cliente' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('persiste la vista, traduce las filas y permite cambiarla en memoria si falla el guardado', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Comparador' }))
    expect(parsePreferences(window.localStorage.getItem(STORAGE_KEY)!).clockView).toBe('timeline')
    fireEvent.click(screen.getByRole('button', { name: 'ES / EN: Cambiar a inglés' }))
    fireEvent.click(screen.getByRole('button', { name: '12 h' }))
    expect(screen.getByRole('table', { name: /Time comparison by city/ })).toBeInTheDocument()
    expect(screen.getAllByRole('rowheader')[1]).toHaveTextContent('New York')
    expect(screen.getAllByRole('rowheader')[1]).toHaveTextContent('AM')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
    fireEvent.click(screen.getByRole('button', { name: 'Cards' }))
    expect(screen.getByRole('alert')).toHaveTextContent('could not be saved')
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })
})
