import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { loadPreferences, parsePreferences, savePreferences } from './storage'
import { messages } from './i18n'
import { legacyPreset, palettesForPreset, paletteTokens, PALETTE_TOKEN_NAMES, PRESETS } from './palette'
import type { PalettePreset } from './palette'
import type { Language, PalettePreview, Personalization, Preferences, Theme } from './types'

export function useModalDialog(initialFocus: RefObject<HTMLElement | null>) {
  const dialog = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const element = dialog.current!
    const opener = document.activeElement
    element.showModal()
    initialFocus.current?.focus()
    return () => {
      element.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    }
  }, [initialFocus])
  return dialog
}

export function useDocumentLanguage(language: Language) {
  useLayoutEffect(() => {
    const t = messages(language)
    document.documentElement.lang = language
    document.title = t.documentTitle
    document.querySelector('meta[name="description"]')?.setAttribute('content', t.documentDescription)
  }, [language])
}

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function useTheme(preference: Theme | undefined, personalization?: Personalization, preview?: PalettePreview | null, preset?: PalettePreset): Theme {
  const [deviceTheme, setSystemTheme] = useState<Theme>(systemTheme)
  const theme = preview?.theme ?? preference ?? deviceTheme
  const savedPalette = preset && preset !== 'custom'
    ? (preset === 'meridiano' ? undefined : PRESETS[preset][theme])
    : personalization?.[theme]
  const palette = preview ? preview.palette : savedPalette
  const tokens = useMemo(() => palette ? paletteTokens(palette) : {}, [palette])

  useEffect(() => {
    if (preference) return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setSystemTheme(media.matches ? 'dark' : 'light')
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [preference])

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    for (const name of PALETTE_TOKEN_NAMES) {
      if (tokens[name]) document.documentElement.style.setProperty(name, tokens[name])
      else document.documentElement.style.removeProperty(name)
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette?.background ?? (theme === 'dark' ? '#111b19' : '#f7f8f4'))
  }, [theme, palette, tokens])

  return theme
}

function normalizeLegacyPalette(preferences: Preferences): Preferences {
  if (!preferences.personalization || preferences.palettePreset !== undefined) return preferences
  // Pair legacy presets in memory; manual colors and stored originals stay protected.
  const palettePreset = legacyPreset(preferences.personalization, preferences.theme ?? systemTheme())
  return {
    ...preferences,
    palettePreset,
    personalization: palettePreset === 'custom' ? preferences.personalization : palettesForPreset(palettePreset),
  }
}

export function usePreferences() {
  const [state, setState] = useState(() => {
    const loaded = loadPreferences()
    return { ...loaded, preferences: normalizeLegacyPalette(loaded.preferences) }
  })
  const current = useRef(state)

  const update = useCallback((transform: (preferences: Preferences) => Preferences) => {
    const preferences = transform(current.current.preferences)
    // A failed read must never trigger an automatic overwrite of the original data.
    const issue = current.current.issue ?? savePreferences(preferences)
    current.current = { preferences, issue }
    setState(current.current)
  }, [])

  const retrySave = useCallback(() => {
    current.current = { ...current.current, issue: savePreferences(current.current.preferences) }
    setState(current.current)
  }, [])

  const replace = useCallback((candidate: Preferences): boolean => {
    const preferences = parsePreferences(JSON.stringify(candidate))
    const issue = savePreferences(preferences)
    // An import is transactional: a failed write preserves the active preferences too.
    current.current = issue
      ? { ...current.current, issue }
      : { preferences: normalizeLegacyPalette(preferences), issue: null }
    setState(current.current)
    return issue === null
  }, [])

  return { ...state, update, retrySave, replace }
}

export function useCurrentInstant(live: boolean) {
  const [instant, setInstant] = useState(Date.now)
  useEffect(() => {
    if (!live) return
    const refresh = () => setInstant(Date.now())
    refresh()
    const interval = window.setInterval(refresh, 1000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [live])
  return instant
}
