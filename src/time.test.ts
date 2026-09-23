import { describe, expect, it } from 'vitest'
import { BASE_ZONE, getClockDetails, isValidZone, mexicoInputAt, mexicoInputToInstant, offsetMinutesAt } from './time'
import { searchZones, zoneInfo, ZONES } from './zones'

describe('conversión desde Ciudad de México', () => {
  it.each([
    ['2026-07-15', '04:59', 'America/New_York', false],
    ['2026-07-15', '05:00', 'America/New_York', true],
    ['2026-07-15', '16:59', 'America/New_York', true],
    ['2026-07-15', '17:00', 'America/New_York', false],
    ['2026-01-15', '05:59', 'America/New_York', false],
    ['2026-01-15', '06:00', 'America/New_York', true],
    ['2026-07-15', '07:14', 'Asia/Kathmandu', true],
    ['2026-07-15', '07:15', 'Asia/Kathmandu', false],
  ])('día/noche sigue el horario local, DST y fracciones: %s %s %s', (date, time, zone, day) => {
    const instant = mexicoInputToInstant(date, time)
    expect(getClockDetails(instant, zone, '24').isDay).toBe(day)
    expect(getClockDetails(instant, zone, '12', 'en').isDay).toBe(day)
  })

  it.each(['Romania', 'Rumanía', 'Rumania', 'Bucarest', 'Bucharest', 'Europe/Bucharest'])('encuentra Rumanía al buscar %s', (query) => {
    expect(searchZones(query, 'es')).toEqual([{ zone: 'Europe/Bucharest', city: 'Bucarest', country: 'Rumanía' }])
    expect(searchZones(query, 'en')).toEqual([{ zone: 'Europe/Bucharest', city: 'Bucharest', country: 'Romania' }])
  })

  it.each([
    ['2026-01-15', 120, '17:00', 'GMT+2'],
    ['2026-07-15', 180, '18:00', 'GMT+3'],
    ['2026-09-22', 180, '18:00', 'GMT+3'],
  ])('Rumanía respeta su desfase IANA el %s', (date, offset, time, query) => {
    const instant = mexicoInputToInstant(date, '09:00')
    expect(offsetMinutesAt(instant, 'Europe/Bucharest')).toBe(offset)
    expect(getClockDetails(instant, 'Europe/Bucharest', '24').time).toBe(time)
    expect(searchZones(query, 'es', instant)).toContainEqual(expect.objectContaining({ zone: 'Europe/Bucharest' }))
    expect(searchZones(offset === 120 ? 'GMT+3' : 'GMT+2', 'es', instant).some((item) => item.zone === 'Europe/Bucharest')).toBe(false)
  })

  it.each(['Gmt+2', 'GMT+02', 'UTC+02:00', 'utc+0200', ' GMT + 2 '])('encuentra ciudades por el desfase %s del instante seleccionado', (query) => {
    const instant = mexicoInputToInstant('2026-07-15', '09:00')
    const results = searchZones(query, 'es', instant)
    expect(results).toContainEqual(expect.objectContaining({ zone: 'Europe/Berlin' }))
    expect(results).toContainEqual(expect.objectContaining({ zone: 'Africa/Johannesburg' }))
    expect(results.every((item) => offsetMinutesAt(instant, item.zone) === 120)).toBe(true)
    expect(results.some((item) => item.zone === 'Europe/London')).toBe(false)
  })

  it('la búsqueda GMT usa DST del instante mostrado, no el offset actual ni la diferencia con CDMX', () => {
    const winter = mexicoInputToInstant('2026-01-15', '09:00')
    const summer = mexicoInputToInstant('2026-07-15', '09:00')
    expect(searchZones('GMT+2', 'en', summer)).toContainEqual({ zone: 'Europe/Berlin', city: 'Berlin', country: 'Germany' })
    expect(searchZones('GMT+2', 'en', winter).some((item) => item.zone === 'Europe/Berlin')).toBe(false)
    expect(searchZones('UTC+01:00', 'es', winter)).toContainEqual(expect.objectContaining({ zone: 'Europe/Berlin' }))
    expect(searchZones('GMT+2', 'es', summer).some((item) => item.zone === 'America/New_York')).toBe(false)
  })

  it.each([
    ['UTC+05:30', 'Asia/Kolkata'],
    ['GMT+5:45', 'Asia/Kathmandu'],
    ['GMT-3', 'America/Argentina/Buenos_Aires'],
    ['UTC−02:30', 'America/St_Johns'],
    ['UTC', 'UTC'],
    ['GMT', 'UTC'],
    ['GMT-0', 'UTC'],
  ])('admite desfases negativos, fraccionarios y cero: %s', (query, zone) => {
    expect(searchZones(query, 'es', mexicoInputToInstant('2026-07-15', '09:00')))
      .toContainEqual(expect.objectContaining({ zone }))
  })

  it.each(['GMT+99', 'UTC+02:60', 'GMT+2:3', 'UTC++2', 'GMT+2x'])('no interpreta una búsqueda mal formada como otro desfase: %s', (query) => {
    expect(searchZones(query, 'es', mexicoInputToInstant('2026-07-15', '09:00'))).toEqual([])
  })

  it('traduce fechas y diferencias sin alterar instante, offset ni formato horario', () => {
    const instant = mexicoInputToInstant('2026-12-31', '23:30')
    const spanish = getClockDetails(instant, 'Asia/Tokyo', '24', 'es')
    const english = getClockDetails(instant, 'Asia/Tokyo', '24', 'en')
    expect(english.date).toBe('Friday, January 1, 2027')
    expect(spanish.date).toBe('viernes, 1 de enero de 2027')
    expect(english.time).toBe(spanish.time)
    expect(english.offset).toBe(spanish.offset)
    expect(english.isoDate).toBe(spanish.isoDate)
    expect(english.dayLabel).toBe('+1 day')
    expect(english.difference).toBe('+15 h vs. Mexico City')
    expect(getClockDetails(instant, 'Asia/Tokyo', '12', 'en').time).toBe('02:30')
    expect(getClockDetails(instant, 'Asia/Tokyo', '12', 'en').period).toBe('PM')
    expect(getClockDetails(instant, BASE_ZONE, '24', 'en').difference).toBe('Same time as Mexico City')
  })

  it('busca y traduce el catálogo sin cambiar identificadores IANA', () => {
    expect(searchZones('Londres', 'en')[0]).toEqual({ city: 'London', country: 'United Kingdom', zone: 'Europe/London' })
    expect(searchZones('New York', 'es')[0]).toEqual({ city: 'Nueva York', country: 'Estados Unidos', zone: 'America/New_York' })
    expect(searchZones('United States', 'es').length).toBeGreaterThan(1)
    expect(searchZones('Europe/London', 'en')[0].zone).toBe('Europe/London')
    expect(zoneInfo('Asia/Kathmandu', 'en').city).toBe('Kathmandu')
  })

  it('interpreta la entrada como CDMX, independientemente de la zona del sistema', () => {
    const instant = mexicoInputToInstant('2026-07-15', '09:30')
    expect(new Date(instant).toISOString()).toBe('2026-07-15T15:30:00.000Z')
    expect(mexicoInputAt(instant)).toEqual({ date: '2026-07-15', time: '09:30' })
    expect(getClockDetails(instant, BASE_ZONE, '24').time).toBe('09:30')
  })

  it.each([
    ['2026-01-15', 'America/New_York', '10:00', -300, '+1 h vs. CDMX'],
    ['2026-07-15', 'America/New_York', '11:00', -240, '+2 h vs. CDMX'],
    ['2026-01-15', 'Europe/London', '15:00', 0, '+6 h vs. CDMX'],
    ['2026-07-15', 'Europe/London', '16:00', 60, '+7 h vs. CDMX'],
    ['2026-03-15', 'America/New_York', '11:00', -240, '+2 h vs. CDMX'],
    ['2026-03-15', 'Europe/London', '15:00', 0, '+6 h vs. CDMX'],
    ['2026-07-15', 'Asia/Kolkata', '20:30', 330, '+11 h 30 min vs. CDMX'],
    ['2026-07-15', 'Asia/Kathmandu', '20:45', 345, '+11 h 45 min vs. CDMX'],
    ['2026-07-15', 'Australia/Eucla', '23:45', 525, '+14 h 45 min vs. CDMX'],
    ['2026-01-15', 'Pacific/Chatham', '04:45', 825, '+19 h 45 min vs. CDMX'],
    ['2026-07-15', 'Pacific/Chatham', '03:45', 765, '+18 h 45 min vs. CDMX'],
    ['2026-07-15', 'America/St_Johns', '12:30', -150, '+3 h 30 min vs. CDMX'],
  ])('aplica reglas IANA de %s en %s', (date, zone, time, offset, difference) => {
    const instant = mexicoInputToInstant(date, '09:00')
    const details = getClockDetails(instant, zone, '24')
    expect(details.time).toBe(time)
    expect(offsetMinutesAt(instant, zone)).toBe(offset)
    expect(details.difference).toBe(difference)
  })

  it.each([
    ['2026-12-31', '23:30', 'Asia/Tokyo', '2027-01-01', '14:30', 1],
    ['2026-01-01', '00:30', 'America/Los_Angeles', '2025-12-31', '22:30', -1],
    ['2026-01-31', '23:30', 'Europe/London', '2026-02-01', '05:30', 1],
    ['2024-02-29', '23:30', 'Asia/Kathmandu', '2024-03-01', '11:15', 1],
  ])('maneja el cruce de fecha %s %s para %s', (date, time, zone, expectedDate, expectedTime, dayDifference) => {
    const result = getClockDetails(mexicoInputToInstant(date, time), zone, '24')
    expect(result.isoDate).toBe(expectedDate)
    expect(result.time).toBe(expectedTime)
    expect(result.dayDifference).toBe(dayDifference)
    expect(result.dayLabel).toBe(dayDifference > 0 ? '+1 día' : '−1 día')
  })

  it('salta la hora inexistente de un cliente a partir de un instante válido', () => {
    const before = mexicoInputToInstant('2026-03-08', '00:59')
    const after = mexicoInputToInstant('2026-03-08', '01:00')
    expect(getClockDetails(before, 'America/New_York', '24').time).toBe('01:59')
    expect(getClockDetails(after, 'America/New_York', '24').time).toBe('03:00')
  })

  it('respeta el horario de verano histórico de México', () => {
    expect(new Date(mexicoInputToInstant('2022-07-15', '09:00')).toISOString()).toBe('2022-07-15T14:00:00.000Z')
    expect(offsetMinutesAt(mexicoInputToInstant('2026-07-15', '09:00'), BASE_ZONE)).toBe(-360)
  })

  it.each([['2022-04-03', '02:30'], ['2022-10-30', '01:30']])('rechaza la hora mexicana inexistente o ambigua %s %s', (date, time) => {
    expect(() => mexicoInputToInstant(date, time)).toThrow(/ambigua o no existió/)
  })

  it.each([
    ['', '12:00'], ['2026-07-15', ''], ['2026-02-30', '12:00'],
    ['2026-07-15', '24:00'], ['2026-07-15', '12:60'],
    ['1969-12-31', '12:00'], ['2101-01-01', '12:00'], ['2026-1-5', '1:00'],
  ])('rechaza la entrada inválida %s %s', (date, time) => {
    expect(() => mexicoInputToInstant(date, time)).toThrow()
  })

  it('usa 00 a medianoche en 24 h y distingue am/pm en 12 h', () => {
    const midnight = mexicoInputToInstant('2026-07-15', '00:00')
    const noon = mexicoInputToInstant('2026-07-15', '12:00')
    expect(getClockDetails(midnight, BASE_ZONE, '24').time).toBe('00:00')
    expect(getClockDetails(midnight, BASE_ZONE, '12').time).toBe('12:00')
    expect(getClockDetails(midnight, BASE_ZONE, '12').period).not.toBe(getClockDetails(noon, BASE_ZONE, '12').period)
  })

  it('el catálogo usa zonas disponibles y permite búsqueda con o sin acentos', () => {
    expect(ZONES.every((option) => isValidZone(option.zone))).toBe(true)
    expect(searchZones('mexico')).toContainEqual(expect.objectContaining({ zone: BASE_ZONE }))
    expect(searchZones('NEPAL')).toContainEqual(expect.objectContaining({ zone: 'Asia/Kathmandu' }))
    expect(searchZones('europe/london')[0]?.city).toBe('Londres')
    expect(searchZones('nueva york')[0]?.zone).toBe('America/New_York')
    expect(isValidZone('CST')).toBe(false)
    expect(isValidZone('-06:00')).toBe(false)
    expect(isValidZone('Not/AZone')).toBe(false)
  })
})
