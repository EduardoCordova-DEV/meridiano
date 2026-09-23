import { describe, expect, it } from 'vitest'
import { contrastRatio, isHexColor, isPersonalization, legacyPreset, palettesForPreset, paletteTokens, PALETTE_KEYS, PRESET_IDS, PRESETS, presetFor, readableColor, sharedPreset } from './palette'
import type { Palette } from './types'

describe('paletas y contraste', () => {
  it.each(PRESET_IDS)('empareja las variantes del preset %s', (id) => {
    const palettes = palettesForPreset(id)
    expect(sharedPreset(palettes)).toBe(id)
    expect(palettes).toEqual(id === 'meridiano' ? {} : PRESETS[id])
    if (palettes.light) expect(palettes.light).not.toBe(PRESETS[id].light)
    if (palettes.dark) expect(palettes.dark).not.toBe(PRESETS[id].dark)
  })

  it('recupera el preset anterior desde el modo activo o el único modo configurado', () => {
    expect(legacyPreset({ dark: PRESETS.react.dark }, 'light')).toBe('react')
    expect(legacyPreset({ light: PRESETS.ocean.light, dark: PRESETS.react.dark }, 'dark')).toBe('react')
    expect(legacyPreset({ light: PRESETS.ocean.light, dark: PRESETS.react.dark }, 'light')).toBe('ocean')
    expect(legacyPreset({ light: { ...PRESETS.ocean.light, accent: '#123456' }, dark: PRESETS.react.dark }, 'dark')).toBe('custom')
    expect(sharedPreset({ dark: PRESETS.react.dark })).toBe('custom')
  })
  it.each(['#000000', '#FFFFFF', '#aB01eF'])('acepta HEX completo %s', (color) => {
    expect(isHexColor(color)).toBe(true)
  })

  it.each(['#fff', '#12345678', 'red', '#ggffff', ' #123456', 'url(https://example.com)', null, 42])('rechaza colores no válidos %s', (color) => {
    expect(isHexColor(color)).toBe(false)
  })

  it('valida claves, objetos completos y modos sin aceptar CSS libre', () => {
    expect(isPersonalization({})).toBe(true)
    expect(isPersonalization({ light: PRESETS.ocean.light, dark: PRESETS.rose.dark })).toBe(true)
    for (const value of [null, [], { light: [] }, { light: {} }, { system: PRESETS.ocean.light }, { light: { ...PRESETS.ocean.light, extra: '#000000' } }, { dark: { ...PRESETS.rose.dark, text: 'red' } }]) {
      expect(isPersonalization(value)).toBe(false)
    }
  })

  it('identifica presets sin importar mayúsculas y reconoce ediciones', () => {
    expect(presetFor(undefined, 'light')).toBe('meridiano')
    expect(presetFor({ ...PRESETS.ocean.dark, accent: PRESETS.ocean.dark.accent.toUpperCase() }, 'dark')).toBe('ocean')
    expect(presetFor({ ...PRESETS.ocean.light, background: '#123456' }, 'light')).toBe('custom')
    expect(readableColor('#000000', '#ffffff')).toBe('#000000')
  })

  const combinations = PRESET_IDS.flatMap((id) => (['light', 'dark'] as const).map((theme) => ({ name: `${id} ${theme}`, palette: PRESETS[id][theme] })))
  for (const background of ['#000000', '#ffffff', '#777777', '#ff00ff', '#00ff00']) {
    const palette: Palette = { ...PRESETS.meridiano.light }
    for (const key of PALETTE_KEYS) palette[key] = background
    combinations.push({ name: `todos iguales ${background}`, palette })
    combinations.push({ name: `fondos opuestos ${background}`, palette: { ...palette, surface: '#ffffff', hero: '#ffffff' } })
  }

  it.each(combinations)('genera texto legible para $name', ({ palette }) => {
    const tokens = paletteTokens(palette)
    const pairs = [
      ['text', 'page'], ['muted', 'page'], ['accent-text', 'page'], ['highlight', 'page'],
      ['surface-text', 'surface'], ['surface-muted', 'surface'], ['surface-accent', 'surface'], ['danger', 'surface'],
      ['on-primary', 'primary'], ['on-primary-hover', 'primary-hover'],
      ['on-hero', 'hero'], ['hero-muted', 'hero'], ['hero-highlight', 'hero'],
      ['on-soft', 'soft'], ['soft-muted', 'soft'], ['on-hover', 'hover'], ['on-warning', 'warning'],
    ]
    for (const [foreground, background] of pairs) {
      expect(contrastRatio(tokens[`--p-${foreground}`], tokens[`--p-${background}`]), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5)
    }
    expect(contrastRatio(tokens['--p-field-border'], palette.surface)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(tokens['--p-focus'], palette.surface)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(tokens['--p-page-focus'], palette.background)).toBeGreaterThanOrEqual(3)
    expect(contrastRatio(tokens['--p-soft-focus'], tokens['--p-soft'])).toBeGreaterThanOrEqual(3)
    expect(tokens['--p-page']).toBe(palette.background)
    expect(tokens['--p-surface']).toBe(palette.surface)
    expect(tokens['--p-primary']).toBe(palette.accent)
    expect(tokens['--p-hero']).toBe(palette.hero)
  })
})
