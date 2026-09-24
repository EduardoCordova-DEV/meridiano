import type { Palette, Personalization, Theme } from './types'

export const PALETTE_KEYS = ['background', 'surface', 'text', 'muted', 'accent', 'hero', 'border', 'highlight', 'danger'] as const
export type PaletteKey = typeof PALETTE_KEYS[number]
export const PRESET_IDS = ['meridiano', 'ocean', 'orchid', 'sunset', 'slate', 'rose', 'react', 'xbox25'] as const
export type PresetId = typeof PRESET_IDS[number]
export type PalettePreset = PresetId | 'custom'

export const PRESETS: Record<PresetId, Record<Theme, Palette>> = {
  meridiano: {
    light: { background: '#f7f8f4', surface: '#ffffff', text: '#253d38', muted: '#66756e', accent: '#164d46', hero: '#164d46', border: '#e1e6dc', highlight: '#b77638', danger: '#a23924' },
    dark: { background: '#111b19', surface: '#1c2824', text: '#e3ece4', muted: '#abbab0', accent: '#9bd4bc', hero: '#163e38', border: '#3c4d43', highlight: '#e2b477', danger: '#f8ac99' },
  },
  ocean: {
    light: { background: '#f2f7fc', surface: '#ffffff', text: '#18324c', muted: '#587086', accent: '#1765a3', hero: '#123d64', border: '#d3e1ed', highlight: '#c48624', danger: '#b3384d' },
    dark: { background: '#0d1724', surface: '#182838', text: '#e5f1fc', muted: '#a2b8cd', accent: '#80c5f4', hero: '#153e61', border: '#38536c', highlight: '#e6ba67', danger: '#ffaaa9' },
  },
  orchid: {
    light: { background: '#f8f4fc', surface: '#ffffff', text: '#362846', muted: '#786287', accent: '#7741a0', hero: '#48265f', border: '#e2d7eb', highlight: '#b97632', danger: '#b9345b' },
    dark: { background: '#1b1425', surface: '#2a2037', text: '#f1e7fc', muted: '#c1afd0', accent: '#d1a1f1', hero: '#48295e', border: '#574266', highlight: '#e6b26d', danger: '#ffa8bc' },
  },
  sunset: {
    light: { background: '#fcf6ef', surface: '#fffdf9', text: '#492f24', muted: '#81685a', accent: '#a44421', hero: '#74351f', border: '#e9d8c8', highlight: '#a77715', danger: '#b12645' },
    dark: { background: '#211712', surface: '#33251e', text: '#faeadb', muted: '#c9af9a', accent: '#f4ae87', hero: '#643422', border: '#654a37', highlight: '#eac16b', danger: '#ffa4b3' },
  },
  slate: {
    light: { background: '#f4f5f7', surface: '#ffffff', text: '#27313e', muted: '#67717f', accent: '#43566e', hero: '#293748', border: '#dce0e6', highlight: '#8a7125', danger: '#b53342' },
    dark: { background: '#161a20', surface: '#242a33', text: '#e9edf4', muted: '#b0bac8', accent: '#b3c7e2', hero: '#303e50', border: '#485464', highlight: '#d4bc7b', danger: '#ffadb2' },
  },
  rose: {
    light: { background: '#fcf3f5', surface: '#fffdfd', text: '#4a2936', muted: '#856775', accent: '#a63561', hero: '#642741', border: '#ead6de', highlight: '#ae742a', danger: '#ac2735' },
    dark: { background: '#23141c', surface: '#35232d', text: '#fce7f0', muted: '#cbb0bd', accent: '#f5a4c4', hero: '#602b43', border: '#654351', highlight: '#ecc086', danger: '#ffa2a8' },
  },
  react: {
    light: { background: '#f6f7f9', surface: '#ffffff', text: '#23272f', muted: '#5e687e', accent: '#149eca', hero: '#23272f', border: '#e5e7eb', highlight: '#087ea4', danger: '#c02d28' },
    dark: { background: '#23272f', surface: '#343a46', text: '#f6f7f9', muted: '#99a1b3', accent: '#58c4dc', hero: '#1b1f27', border: '#4b5263', highlight: '#58c4dc', danger: '#ff8b7b' },
  },
  xbox25: {
    light: { background: '#eef2ed', surface: '#ffffff', text: '#172416', muted: '#52634f', accent: '#107c10', hero: '#102b10', border: '#cbd7c7', highlight: '#426e27', danger: '#b32637' },
    dark: { background: '#090e0a', surface: '#161e17', text: '#f0f4ee', muted: '#a8b5a5', accent: '#9bf00b', hero: '#102b10', border: '#344331', highlight: '#c7d4c1', danger: '#ff9e9e' },
  },
}

export const isHexColor = (value: unknown): value is string => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value)

function isPalette(value: unknown): value is Palette {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return PALETTE_KEYS.every((key) => key in value && isHexColor(Reflect.get(value, key))) &&
    Object.keys(value).every((key) => PALETTE_KEYS.some((candidate) => candidate === key))
}

export function isPersonalization(value: unknown): value is Personalization {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  return Object.entries(value).every(([theme, palette]) => (theme === 'light' || theme === 'dark') && isPalette(palette))
}

export function presetFor(palette: Palette | undefined, theme: Theme): PresetId | 'custom' {
  if (!palette) return 'meridiano'
  return PRESET_IDS.find((id) => PALETTE_KEYS.every((key) =>
    PRESETS[id][theme][key].toLowerCase() === palette[key].toLowerCase(),
  )) ?? 'custom'
}

export function isPalettePreset(value: unknown): value is PalettePreset {
  return value === 'custom' || PRESET_IDS.some((id) => id === value)
}

export function palettesForPreset(preset: PresetId): Personalization {
  return preset === 'meridiano' ? {} : {
    light: { ...PRESETS[preset].light },
    dark: { ...PRESETS[preset].dark },
  }
}

export function sharedPreset(personalization: Personalization): PalettePreset {
  const light = presetFor(personalization.light, 'light')
  return light === presetFor(personalization.dark, 'dark') ? light : 'custom'
}

export function legacyPreset(personalization: Personalization, theme: Theme): PalettePreset {
  const opposite = theme === 'light' ? 'dark' : 'light'
  if (presetFor(personalization.light, 'light') === 'custom' || presetFor(personalization.dark, 'dark') === 'custom') return 'custom'
  return personalization[theme] ? presetFor(personalization[theme], theme) : presetFor(personalization[opposite], opposite)
}

function rgb(color: string) {
  return [1, 3, 5].map((start) => Number.parseInt(color.slice(start, start + 2), 16))
}

function luminance(color: string) {
  const [red, green, blue] = rgb(color).map((value) => {
    const channel = value / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

export function contrastRatio(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)]
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05)
}

function mix(first: string, second: string, amount: number) {
  const target = rgb(second)
  return `#${rgb(first).map((value, index) =>
    Math.round(value + (target[index] - value) * amount).toString(16).padStart(2, '0'),
  ).join('')}`
}

function onColor(background: string) {
  return contrastRatio('#ffffff', background) > contrastRatio('#000000', background) ? '#ffffff' : '#000000'
}

export function readableColor(preferred: string, background: string, minimum = 4.5) {
  if (contrastRatio(preferred, background) >= minimum) return preferred
  const target = onColor(background)
  // Find the closest readable tone rather than replacing every custom color with black/white.
  for (let step = 1; step <= 100; step++) {
    const candidate = mix(preferred, target, step / 100)
    if (contrastRatio(candidate, background) >= minimum) return candidate
  }
  return target
}

export function paletteTokens(palette: Palette): Record<string, string> {
  const soft = mix(palette.surface, palette.accent, 0.07)
  const hover = mix(palette.surface, palette.accent, 0.15)
  const primaryHover = mix(palette.accent, onColor(palette.accent), 0.1)
  const warning = mix(palette.surface, palette.highlight, 0.16)
  return {
    '--p-page': palette.background,
    '--p-surface': palette.surface,
    '--p-text': readableColor(palette.text, palette.background),
    '--p-muted': readableColor(palette.muted, palette.background),
    '--p-surface-text': readableColor(palette.text, palette.surface),
    '--p-surface-muted': readableColor(palette.muted, palette.surface),
    '--p-accent-text': readableColor(palette.accent, palette.background),
    '--p-surface-accent': readableColor(palette.accent, palette.surface),
    '--p-primary': palette.accent,
    '--p-on-primary': onColor(palette.accent),
    '--p-primary-hover': primaryHover,
    '--p-on-primary-hover': onColor(primaryHover),
    '--p-hero': palette.hero,
    '--p-on-hero': onColor(palette.hero),
    '--p-hero-muted': readableColor(mix(onColor(palette.hero), palette.hero, 0.25), palette.hero),
    '--p-hero-highlight': readableColor(palette.highlight, palette.hero),
    '--p-hero-border': mix(palette.hero, onColor(palette.hero), 0.3),
    '--p-orbit': mix(palette.hero, onColor(palette.hero), 0.08),
    '--p-soft': soft,
    '--p-on-soft': readableColor(palette.text, soft),
    '--p-soft-muted': readableColor(palette.muted, soft),
    '--p-hover': hover,
    '--p-on-hover': readableColor(palette.text, hover),
    '--p-border': palette.border,
    '--p-field-border': readableColor(palette.border, palette.surface, 3),
    '--p-field-scheme': luminance(palette.surface) > 0.179 ? 'light' : 'dark',
    '--p-warning': warning,
    '--p-on-warning': readableColor(palette.highlight, warning),
    '--p-warning-border': readableColor(palette.highlight, warning, 3),
    '--p-highlight': readableColor(palette.highlight, palette.background),
    '--p-danger': readableColor(palette.danger, palette.surface),
    '--p-focus': readableColor(palette.highlight, palette.surface, 3),
    '--p-page-focus': readableColor(palette.highlight, palette.background, 3),
    '--p-soft-focus': readableColor(palette.highlight, soft, 3),
    '--p-shadow': `${mix(palette.background, '#000000', 0.7)}26`,
    '--p-backdrop': `${mix(palette.background, '#000000', 0.5)}b3`,
  }
}

export const PALETTE_TOKEN_NAMES = Object.keys(paletteTokens(PRESETS.meridiano.light))
