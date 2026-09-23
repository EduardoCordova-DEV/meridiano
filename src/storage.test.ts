import { describe, expect, it, vi } from 'vitest'
import { defaultPreferences, loadPreferences, parsePreferences, savePreferences, STORAGE_KEY } from './storage'
import { PRESETS } from './palette'

describe('preferencias locales', () => {
  it.each(['0000123456789012', 'SR-2026-0042', '0', 'A'.repeat(60)])('conserva el número de caso como texto: %s', (caseNumber) => {
    const preferences = { ...defaultPreferences(), clocks: [{ id: 'case', zone: 'America/New_York', label: 'Cliente', caseNumber }] }
    expect(savePreferences(preferences)).toBeNull()
    expect(loadPreferences()).toEqual({ preferences, issue: null })
  })

  it('acepta relojes anteriores sin inventar casos a partir de sus etiquetas ni escribir al cargar', () => {
    const preferences = { ...defaultPreferences(), clocks: [{ id: 'legacy', zone: 'Europe/Bucharest', label: '000123456789 - Cliente' }] }
    const raw = JSON.stringify(preferences)
    window.localStorage.setItem(STORAGE_KEY, raw)
    const write = vi.spyOn(Storage.prototype, 'setItem')
    expect(loadPreferences()).toEqual({ preferences, issue: null })
    expect(loadPreferences().preferences.clocks[0]).not.toHaveProperty('caseNumber')
    expect(write).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it.each(['', '   '])('omite un caso vacío al leer: %j', (caseNumber) => {
    const clock = { id: 'case', zone: 'America/New_York', label: 'Cliente' }
    expect(parsePreferences(JSON.stringify({ ...defaultPreferences(), clocks: [{ ...clock, caseNumber }] })).clocks).toEqual([clock])
  })

  it.each([null, 1234567890123456, {}, [], true, '1'.repeat(61)])('rechaza números de caso inválidos sin sobrescribirlos: %j', (caseNumber) => {
    const raw = JSON.stringify({ ...defaultPreferences(), clocks: [{ id: 'case', zone: 'America/New_York', label: 'Cliente', caseNumber }] })
    window.localStorage.setItem(STORAGE_KEY, raw)
    expect(() => parsePreferences(raw)).toThrow()
    expect(loadPreferences().issue).toBe('storageInvalidError')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it.each(['cards', 'timeline'] as const)('conserva la vista %s sin alterar las demás preferencias', (clockView) => {
    const preferences = { ...defaultPreferences(), clockView, clocks: [] }
    expect(savePreferences(preferences)).toBeNull()
    expect(loadPreferences()).toEqual({ preferences, issue: null })
  })

  it('conserva las dos paletas sin alterar relojes ni otras preferencias', () => {
    const preferences = { ...defaultPreferences(), theme: 'dark' as const, language: 'en' as const, personalization: { light: PRESETS.ocean.light, dark: PRESETS.orchid.dark } }
    expect(savePreferences(preferences)).toBeNull()
    expect(loadPreferences()).toEqual({ preferences, issue: null })
  })

  it.each(['react', 'custom', 'meridiano'] as const)('conserva la identidad de la paleta %s', (palettePreset) => {
    const preferences = { ...defaultPreferences(), palettePreset, personalization: PRESETS.react }
    expect(savePreferences(preferences)).toBeNull()
    expect(loadPreferences()).toEqual({ preferences, issue: null })
  })

  it.each(['invalid-preset', null, 42, {}])('rechaza una identidad inválida sin perder los relojes: %j', (palettePreset) => {
    const original = { ...defaultPreferences(), clocks: [] }
    const raw = JSON.stringify({ ...original, palettePreset, personalization: PRESETS.react })
    window.localStorage.setItem(STORAGE_KEY, raw)
    expect(loadPreferences()).toEqual({ preferences: original, issue: 'storagePaletteError' })
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it.each([null, [], { light: null }, { light: {} }, { dark: { ...PRESETS.rose.dark, text: 'red' } }, { light: { ...PRESETS.ocean.light, extra: '#123456' } }, { other: PRESETS.ocean.light }])('conserva relojes válidos y datos originales si solo las paletas están dañadas: %j', (personalization) => {
    const preferences = { ...defaultPreferences(), clocks: [], language: 'en', theme: 'dark' }
    const raw = JSON.stringify({ ...preferences, personalization })
    window.localStorage.setItem(STORAGE_KEY, raw)
    const write = vi.spyOn(Storage.prototype, 'setItem')
    expect(loadPreferences()).toEqual({ preferences, issue: 'storagePaletteError' })
    expect(() => parsePreferences(raw)).toThrow()
    expect(write).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it('muestra ejemplos solo cuando no hay preferencias y no escribe al cargar', () => {
    const write = vi.spyOn(Storage.prototype, 'setItem')
    const result = loadPreferences()
    expect(result.preferences.clocks).toHaveLength(3)
    expect(result.issue).toBeNull()
    expect(write).not.toHaveBeenCalled()
  })

  it('conserva una lista vacía y el formato de 12 horas', () => {
    const preferences = { ...defaultPreferences(), clocks: [], hourCycle: '12' as const }
    expect(savePreferences(preferences)).toBeNull()
    expect(loadPreferences()).toEqual({ preferences, issue: null })
  })

  it.each(['light', 'dark'] as const)('valida y conserva el tema %s con los relojes existentes', (theme) => {
    const preferences = { ...defaultPreferences(), theme }
    expect(savePreferences(preferences)).toBeNull()
    expect(loadPreferences()).toEqual({ preferences, issue: null })
  })

  it.each(['es', 'en'] as const)('valida y conserva el idioma %s sin modificar las otras preferencias', (language) => {
    const preferences = { ...defaultPreferences(), theme: 'dark' as const, language }
    expect(savePreferences(preferences)).toBeNull()
    expect(loadPreferences()).toEqual({ preferences, issue: null })
  })

  it('acepta preferencias anteriores sin añadir ni escribir un tema', () => {
    const preferences = { ...defaultPreferences(), clocks: [], hourCycle: '12' as const }
    const original = JSON.stringify(preferences)
    window.localStorage.setItem(STORAGE_KEY, original)
    const write = vi.spyOn(Storage.prototype, 'setItem')
    expect(loadPreferences()).toEqual({ preferences, issue: null })
    expect(loadPreferences().preferences).not.toHaveProperty('theme')
    expect(loadPreferences().preferences).not.toHaveProperty('language')
    expect(loadPreferences().preferences).not.toHaveProperty('personalization')
    expect(loadPreferences().preferences).not.toHaveProperty('clockView')
    expect(write).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(original)
  })

  it.each([
    'not json', 'null', '[]', '{}',
    JSON.stringify({ ...defaultPreferences(), version: 2 }),
    JSON.stringify({ ...defaultPreferences(), hourCycle: 24 }),
    JSON.stringify({ ...defaultPreferences(), clockView: 'grid' }),
    JSON.stringify({ ...defaultPreferences(), clockView: null }),
    JSON.stringify({ ...defaultPreferences(), theme: 'sepia' }),
    JSON.stringify({ ...defaultPreferences(), theme: null }),
    JSON.stringify({ ...defaultPreferences(), theme: 1 }),
    JSON.stringify({ ...defaultPreferences(), language: 'fr' }),
    JSON.stringify({ ...defaultPreferences(), language: null }),
    JSON.stringify({ ...defaultPreferences(), language: 1 }),
    JSON.stringify({ ...defaultPreferences(), clocks: [{ id: 'x', zone: 'CST', label: '' }] }),
    JSON.stringify({ ...defaultPreferences(), clocks: [{ id: 'x', zone: 'Not/AZone', label: '' }] }),
    JSON.stringify({ ...defaultPreferences(), clocks: [{ id: 'x', zone: 'Europe/London', label: 'x'.repeat(61) }] }),
    JSON.stringify({ ...defaultPreferences(), clocks: [{ id: 'x', zone: 'Europe/London', label: '' }, { id: 'x', zone: 'Asia/Tokyo', label: '' }] }),
  ])('rechaza y preserva datos inválidos: %s', (raw) => {
    window.localStorage.setItem(STORAGE_KEY, raw)
    expect(() => parsePreferences(raw)).toThrow()
    expect(loadPreferences().issue).toBe('storageInvalidError')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })

  it('hace visible un fallo de lectura', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError') })
    expect(loadPreferences().issue).toBe('storageReadError')
  })

  it('hace visible un fallo de escritura', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
    expect(savePreferences(defaultPreferences())).toBe('storageWriteError')
  })
})
