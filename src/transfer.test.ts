import { describe, expect, it } from 'vitest'
import { MAX_TRANSFER_BYTES, parseTransfer, readTransfer, serializeTransfer } from './transfer'
import { defaultPreferences } from './storage'
import { PRESETS } from './palette'

describe('transferencia JSON', () => {
  it.each(['react', 'xbox25'] as const)('exporta e importa %s sin perder campos ni ceros iniciales', (id) => {
    const preferences = {
      ...defaultPreferences(), theme: 'dark' as const, language: 'en' as const,
      palettePreset: id, personalization: PRESETS[id], clockView: 'timeline' as const,
      clocks: [{ id: 'case', zone: 'Asia/Kathmandu', label: 'Cliente privado', caseNumber: '00042' }],
    }
    expect(parseTransfer(serializeTransfer(preferences))).toEqual(preferences)
    expect(parseTransfer(`\uFEFF${serializeTransfer(preferences)}`)).toEqual(preferences)
  })

  it('acepta datos antiguos y listas vacías sin agregar ejemplos', () => {
    expect(parseTransfer('{"version":1,"clocks":[],"hourCycle":"12"}')).toEqual({ version: 1, clocks: [], hourCycle: '12' })
  })

  it.each([
    'null', '[]', 'not JSON', '{"version":2,"clocks":[],"hourCycle":"24"}',
    JSON.stringify({ ...defaultPreferences(), personalization: { dark: { text: 'red' } } }),
    JSON.stringify({ ...defaultPreferences(), palettePreset: 'unknown' }),
    JSON.stringify({ ...defaultPreferences(), clocks: [{ id: 'x', zone: 'EST', label: '' }] }),
    JSON.stringify({ ...defaultPreferences(), clocks: [{ id: 'x', zone: 'UTC', label: '', caseNumber: 123 }] }),
  ])('rechaza archivos inválidos de forma completa: %s', (raw) => {
    expect(() => parseTransfer(raw)).toThrow('transferInvalid')
  })

  it('impone el límite en bytes, incluyendo UTF-8', async () => {
    expect(() => parseTransfer('é'.repeat(MAX_TRANSFER_BYTES / 2 + 1))).toThrow('transferTooLarge')
    await expect(readTransfer(new File(['x'.repeat(MAX_TRANSFER_BYTES + 1)], 'large.json'), new AbortController().signal)).rejects.toThrow('transferTooLarge')
  })

  it('lee solo el archivo elegido y admite cancelación', async () => {
    const file = new File([serializeTransfer(defaultPreferences())], 'preferences.json')
    expect(await readTransfer(file, new AbortController().signal)).toEqual(defaultPreferences())
    const controller = new AbortController()
    controller.abort()
    await expect(readTransfer(file, controller.signal)).rejects.toThrow('Cancelled')
  })
})
