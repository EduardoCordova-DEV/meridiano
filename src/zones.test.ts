import { describe, expect, it } from 'vitest'
import zoneTable from './zone.tab?raw'
import { getClockDetails, isValidZone, mexicoInputToInstant, offsetMinutesAt } from './time'
import { searchZones, zoneInfo, ZONES } from './zones'
import { TIME_ZONE_ABBREVIATIONS, zoneNames } from './zone-names'

describe('nombres regionales y abreviaturas', () => {
  it('conserva las 419 zonas y las 162 siglas del catálogo migrado', () => {
    expect(ZONES).toHaveLength(419)
    expect(TIME_ZONE_ABBREVIATIONS.size).toBe(162)
  })

  it.each([
    ['ET', 'America/New_York'], ['Eastern Time (ET)', 'America/Toronto'],
    ['EST/EDT', 'America/New_York'], ['Eastern Standard Time', 'America/New_York'],
    ['eastern daylight time', 'America/New_York'], ['hora del este', 'America/New_York'],
    ['CT', 'America/Chicago'], ['MT', 'America/Denver'], ['PT', 'America/Los_Angeles'],
    ['AKT', 'America/Anchorage'], ['HST', 'Pacific/Honolulu'], ['AT', 'America/Halifax'],
    ['NST', 'America/St_Johns'], ['BRT', 'America/Sao_Paulo'], ['ART', 'America/Argentina/Buenos_Aires'],
    ['COT', 'America/Bogota'], ['PET', 'America/Lima'], ['CLST', 'America/Santiago'],
    ['CET', 'Europe/Paris'], ['CEST', 'Europe/Berlin'], ['EET', 'Europe/Bucharest'],
    ['EEST', 'Europe/Bucharest'], ['WET', 'Europe/Lisbon'], ['WEST', 'Europe/Lisbon'],
    ['MSK', 'Europe/Moscow'], ['TRT', 'Europe/Istanbul'],
    ['WAT', 'Africa/Lagos'], ['CAT', 'Africa/Harare'], ['EAT', 'Africa/Nairobi'],
    ['SAST', 'Africa/Johannesburg'], ['NPT', 'Asia/Kathmandu'], ['PKT', 'Asia/Karachi'],
    ['ICT', 'Asia/Bangkok'], ['SGT', 'Asia/Singapore'], ['JST', 'Asia/Tokyo'],
    ['KST', 'Asia/Seoul'], ['PHT', 'Asia/Manila'], ['WIB', 'Asia/Jakarta'],
    ['AET', 'Australia/Sydney'], ['AEST', 'Australia/Brisbane'], ['AEDT', 'Australia/Sydney'],
    ['ACST', 'Australia/Darwin'], ['ACDT', 'Australia/Adelaide'], ['AWST', 'Australia/Perth'],
    ['ACWST', 'Australia/Eucla'], ['LHDT', 'Australia/Lord_Howe'],
    ['NZT', 'Pacific/Auckland'], ['NZDT', 'Pacific/Auckland'], ['CHAST', 'Pacific/Chatham'],
    ['CHADT', 'Pacific/Chatham'], ['LINT', 'Pacific/Kiritimati'], ['MART', 'Pacific/Marquesas'],
  ])('encuentra %s sin depender del idioma de la interfaz', (query, zone) => {
    for (const language of ['es', 'en'] as const) {
      expect(searchZones(query, language)).toContainEqual(expect.objectContaining({ zone }))
    }
  })

  it.each([
    ['CST', ['America/Chicago', 'America/Mexico_City', 'America/Havana', 'Asia/Shanghai']],
    ['IST', ['Asia/Kolkata', 'Asia/Jerusalem', 'Europe/Dublin']],
    ['BST', ['Europe/London', 'Asia/Dhaka']],
    ['AST', ['America/Halifax', 'Asia/Riyadh']],
    ['GST', ['Asia/Dubai', 'Atlantic/South_Georgia']],
    ['PST', ['America/Los_Angeles', 'Asia/Manila', 'Pacific/Pitcairn']],
    ['ACT', ['Australia/Adelaide', 'America/Rio_Branco']],
  ])('desambigua %s por ciudad, país y zona, sin elegir una región automáticamente', (query, zones) => {
    const found = searchZones(query)
    for (const zone of zones) expect(found).toContainEqual(expect.objectContaining({ zone }))
    expect(new Set(found.map((option) => option.zone)).size).toBe(found.length)
  })

  it('busca siglas completas, no letras dentro de ciudades o de otras siglas', () => {
    const eastern = searchZones('  eT  ')
    expect(eastern.length).toBeGreaterThan(1)
    expect(eastern).not.toContainEqual(expect.objectContaining({ zone: 'Europe/Bucharest' }))
    expect(eastern).not.toContainEqual(expect.objectContaining({ zone: 'Asia/Ho_Chi_Minh' }))
    expect(searchZones('EST')).not.toContainEqual(expect.objectContaining({ zone: 'Europe/Paris' }))
    expect(searchZones('IST')).not.toContainEqual(expect.objectContaining({ zone: 'Europe/Istanbul' }))
    expect(searchZones('ET Toronto').map((option) => option.zone)).toEqual(['America/Toronto'])
    expect(searchZones('WEST')).not.toContainEqual(expect.objectContaining({ zone: 'Africa/Lagos' }))
    expect(searchZones('West Africa Time')).toContainEqual(expect.objectContaining({ zone: 'Africa/Lagos' }))
  })

  it('incluye los nombres completos localizados para todo el catálogo y admite copiar la etiqueta', () => {
    for (const zone of ZONES) {
      const names = zoneNames(zone.zone)
      for (const language of ['es', 'en'] as const) {
        expect(names.labels[language]).not.toBe('')
        expect(searchZones(names.labels[language], language), zone.zone)
          .toContainEqual(expect.objectContaining({ zone: zone.zone }))
      }
    }
  })

  it('conserva las reglas estacionales al buscar ET o sus alias EST y EDT', () => {
    for (const [date, offset] of [['2026-01-15', -300], ['2026-07-15', -240]] as const) {
      const instant = mexicoInputToInstant(date, '09:00')
      for (const query of ['ET', 'EST', 'EDT']) {
        expect(searchZones(query, 'es', instant)).toContainEqual(expect.objectContaining({ zone: 'America/New_York' }))
        expect(offsetMinutesAt(instant, 'America/New_York')).toBe(offset)
      }
    }
    expect(zoneNames('America/New_York').labels.en).toBe('Eastern Time (ET / EST / EDT)')
    expect(zoneNames('Asia/Kathmandu').labels.en).toContain('NPT')
  })
})

describe('catálogo mundial IANA', () => {
  it('incluye cada ubicación del catálogo que reconoce el navegador, sin duplicados', () => {
    const entries = zoneTable.split(/\r?\n/).filter((line) => line.trim() && !line.startsWith('#'))
    expect(entries).toHaveLength(418)
    expect(ZONES.length).toBeGreaterThan(400)
    const zones = new Set(ZONES.map((item) => item.zone))
    expect(zones.size).toBe(ZONES.length)
    for (const line of entries) {
      const [country, coordinates, zone] = line.split('\t')
      expect(country).toMatch(/^[A-Z]{2}$/)
      expect(coordinates).toMatch(/^[+-]\d+[+-]\d+$/)
      expect(zones.has(zone), zone).toBe(isValidZone(zone))
    }
    expect(zones.has('UTC')).toBe(true)
    expect(ZONES.every((item) => isValidZone(item.zone))).toBe(true)
  })

  it.each([
    ['Marruecos', 'Africa/Casablanca'],
    ['Kenya', 'Africa/Nairobi'],
    ['Afganistan', 'Asia/Kabul'],
    ['Pakistan', 'Asia/Karachi'],
    ['Kazakhstan', 'Asia/Almaty'],
    ['Vietnam', 'Asia/Ho_Chi_Minh'],
    ['Varsovia', 'Europe/Warsaw'],
    ['Copenhague', 'Europe/Copenhagen'],
    ['Ucrania', 'Europe/Kyiv'],
    ['Canarias', 'Atlantic/Canary'],
    ['Azores', 'Atlantic/Azores'],
    ['Maldivas', 'Indian/Maldives'],
    ['Lord Howe', 'Australia/Lord_Howe'],
    ['Marquesas', 'Pacific/Marquesas'],
    ['Samoa Americana', 'Pacific/Pago_Pago'],
    ['Antartida', 'Antarctica/Troll'],
    ['Arctic/Longyearbyen', 'Arctic/Longyearbyen'],
    ['America/Argentina/Mendoza', 'America/Argentina/Mendoza'],
  ])('encuentra %s en ambos idiomas', (query, zone) => {
    for (const language of ['es', 'en'] as const) {
      expect(searchZones(query, language)).toContainEqual(expect.objectContaining({ zone }))
    }
  })

  it('traduce países y localidades manteniendo identificadores y relojes anteriores', () => {
    expect(zoneInfo('Europe/Warsaw', 'es')).toEqual({ zone: 'Europe/Warsaw', city: 'Varsovia', country: 'Polonia' })
    expect(zoneInfo('Europe/Warsaw', 'en')).toEqual({ zone: 'Europe/Warsaw', city: 'Warsaw', country: 'Poland' })
    expect(zoneInfo('Asia/Kabul', 'en').country).toBe('Afghanistan')
    expect(zoneInfo('America/Mexico_City', 'es').city).toBe('Ciudad de México')
    expect(zoneInfo('Asia/Kolkata', 'es').city).toBe('Nueva Delhi')
    expect(zoneInfo('America/Argentina/Buenos_Aires', 'en').city).toBe('Buenos Aires')
  })

  it('busca regiones en español además del nombre de región IANA', () => {
    for (const [query, zone] of [
      ['Europa', 'Europe/Warsaw'], ['Africa', 'Africa/Casablanca'],
      ['Oceania', 'Pacific/Fiji'], ['Oceano Indico', 'Indian/Maldives'],
      ['Atlantico', 'Atlantic/Azores'], ['Antartida', 'Antarctica/Casey'],
    ]) {
      expect(searchZones(query)).toContainEqual(expect.objectContaining({ zone }))
    }
  })

  it.each([
    ['2026-01-15', 'Australia/Lord_Howe', 660, '02:00', 'GMT+11'],
    ['2026-07-15', 'Australia/Lord_Howe', 630, '01:30', 'GMT+10:30'],
    ['2026-07-15', 'Australia/Darwin', 570, '00:30', 'UTC+09:30'],
    ['2026-07-15', 'Asia/Kabul', 270, '19:30', 'GMT+4:30'],
    ['2026-07-15', 'Asia/Tehran', 210, '18:30', 'UTC+03:30'],
    ['2026-07-15', 'Pacific/Marquesas', -570, '05:30', 'UTC-09:30'],
    ['2026-07-15', 'Pacific/Pago_Pago', -660, '04:00', 'GMT-11'],
    ['2026-07-15', 'Pacific/Kiritimati', 840, '05:00', 'GMT+14'],
  ])('calcula %s en %s y lo encuentra por su desfase real', (date, zone, offset, time, query) => {
    const instant = mexicoInputToInstant(date, '09:00')
    expect(offsetMinutesAt(instant, zone)).toBe(offset)
    expect(getClockDetails(instant, zone, '24').time).toBe(time)
    const found = searchZones(query, 'es', instant)
    expect(found).toContainEqual(expect.objectContaining({ zone }))
    expect(found.every((item) => offsetMinutesAt(instant, item.zone) === offset)).toBe(true)
  })

  it('conserva la fecha correcta al cruzar el año hacia el Pacífico occidental y oriental', () => {
    const instant = mexicoInputToInstant('2026-01-01', '00:30')
    expect(getClockDetails(instant, 'Pacific/Pago_Pago', '24')).toMatchObject({ time: '19:30', isoDate: '2025-12-31', dayDifference: -1 })
    expect(getClockDetails(instant, 'Pacific/Kiritimati', '24')).toMatchObject({ time: '20:30', isoDate: '2026-01-01', dayDifference: 0 })
  })
})
