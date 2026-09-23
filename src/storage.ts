import { isValidZone } from './time'
import { messages } from './i18n'
import { isPalettePreset, isPersonalization } from './palette'
import type { Preferences } from './types'

export const STORAGE_KEY = 'meridiano.preferences.v1'

export function defaultPreferences(): Preferences {
  return {
    version: 1,
    hourCycle: '24',
    clocks: [
      { id: 'example-new-york', zone: 'America/New_York', label: '' },
      { id: 'example-london', zone: 'Europe/London', label: '' },
      { id: 'example-tokyo', zone: 'Asia/Tokyo', label: '' },
    ],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

class InvalidPersonalizationError extends Error {
  constructor(readonly preferences: Preferences) {
    super('Invalid personalization')
  }
}

export function parsePreferences(raw: string): Preferences {
  const data: unknown = JSON.parse(raw)
  if (!isRecord(data) || data.version !== 1 || !Array.isArray(data.clocks) ||
      (data.hourCycle !== '12' && data.hourCycle !== '24') ||
      (data.theme !== undefined && data.theme !== 'light' && data.theme !== 'dark') ||
      (data.clockView !== undefined && data.clockView !== 'cards' && data.clockView !== 'timeline') ||
      (data.language !== undefined && data.language !== 'es' && data.language !== 'en')) {
    throw new Error(messages('es').invalidPreferences)
  }
  const ids = new Set<string>()
  const clocks = data.clocks.map((clock: unknown) => {
    if (!isRecord(clock) || typeof clock.id !== 'string' || !clock.id || clock.id.length > 80 ||
        ids.has(clock.id) || typeof clock.zone !== 'string' || !isValidZone(clock.zone) ||
        typeof clock.label !== 'string' || clock.label.length > 60 ||
        (clock.caseNumber !== undefined && (typeof clock.caseNumber !== 'string' || clock.caseNumber.length > 60))) {
      throw new Error(messages('es').invalidClocks)
    }
    ids.add(clock.id)
    const caseNumber = clock.caseNumber?.trim()
    return { id: clock.id, zone: clock.zone, label: clock.label, ...(caseNumber ? { caseNumber } : {}) }
  })
  const preferences: Preferences = {
    version: 1,
    hourCycle: data.hourCycle,
    clocks,
    ...(data.theme === undefined ? {} : { theme: data.theme }),
    ...(data.language === undefined ? {} : { language: data.language }),
    ...(data.clockView === undefined ? {} : { clockView: data.clockView }),
  }
  if (data.personalization !== undefined) {
    if (!isPersonalization(data.personalization)) throw new InvalidPersonalizationError(preferences)
    preferences.personalization = {
      ...(data.personalization.light ? { light: { ...data.personalization.light } } : {}),
      ...(data.personalization.dark ? { dark: { ...data.personalization.dark } } : {}),
    }
  }
  if (data.palettePreset !== undefined) {
    if (!isPalettePreset(data.palettePreset)) {
      delete preferences.personalization
      throw new InvalidPersonalizationError(preferences)
    }
    preferences.palettePreset = data.palettePreset
  }
  return preferences
}

export type StorageIssue = 'storageReadError' | 'storageInvalidError' | 'storageWriteError' | 'storagePaletteError'

export interface StorageState {
  preferences: Preferences
  issue: StorageIssue | null
}

export function loadPreferences(): StorageState {
  let raw: string | null
  try {
    raw = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return {
      preferences: defaultPreferences(),
      issue: 'storageReadError',
    }
  }
  if (raw === null) return { preferences: defaultPreferences(), issue: null }
  try {
    return { preferences: parsePreferences(raw), issue: null }
  } catch (error) {
    if (error instanceof InvalidPersonalizationError) {
      return { preferences: error.preferences, issue: 'storagePaletteError' }
    }
    return {
      preferences: defaultPreferences(),
      issue: 'storageInvalidError',
    }
  }
}

export function savePreferences(preferences: Preferences): StorageIssue | null {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
    return null
  } catch {
    return 'storageWriteError'
  }
}
