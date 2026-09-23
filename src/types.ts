import type { PalettePreset } from './palette'

export type HourCycle = '12' | '24'
export type Theme = 'light' | 'dark'
export type Language = 'es' | 'en'
export type ClockView = 'cards' | 'timeline'

export interface Palette {
  background: string
  surface: string
  text: string
  muted: string
  accent: string
  hero: string
  border: string
  highlight: string
  danger: string
}

export type Personalization = Partial<Record<Theme, Palette>>

export interface PalettePreview {
  theme: Theme
  palette: Palette | undefined
}

export interface WorldClock {
  id: string
  zone: string
  label: string
  caseNumber?: string
}

export interface Preferences {
  version: 1
  clocks: WorldClock[]
  hourCycle: HourCycle
  theme?: Theme
  language?: Language
  personalization?: Personalization
  palettePreset?: PalettePreset
  clockView?: ClockView
}
