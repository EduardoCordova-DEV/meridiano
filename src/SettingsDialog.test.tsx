import { StrictMode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { messages } from './i18n'
import { PRESET_IDS, PRESETS } from './palette'
import { defaultPreferences, parsePreferences, STORAGE_KEY } from './storage'

function openSettings() {
  const button = screen.getByRole('button', { name: 'Ajustes' })
  button.focus()
  fireEvent.click(button)
  return within(screen.getByRole('dialog', { name: 'Personalización' }))
}

const readSaved = () => parsePreferences(window.localStorage.getItem(STORAGE_KEY)!)
const pageColor = () => document.documentElement.style.getPropertyValue('--p-page')

describe('personalización', () => {
  it.each([
    ['es', 'light'], ['es', 'dark'], ['en', 'light'], ['en', 'dark'],
  ] as const)('ofrece y conserva React Theme en %s, modo %s, sin cambiar preferencias existentes', (language, theme) => {
    const original = { ...defaultPreferences(), language, theme, personalization: { light: PRESETS.ocean.light, dark: PRESETS.rose.dark } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(original))
    const write = vi.spyOn(Storage.prototype, 'setItem')
    const t = messages(language)
    const first = render(<App />)
    expect(pageColor()).toBe(original.personalization[theme].background)
    expect(write).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: t.settings }))
    const dialog = within(screen.getByRole('dialog', { name: t.personalization }))
    fireEvent.click(dialog.getByRole('button', { name: 'React Theme' }))
    expect(pageColor()).toBe(PRESETS.react[theme].background)
    expect(write).not.toHaveBeenCalled()
    const opposite = theme === 'light' ? 'dark' : 'light'
    fireEvent.click(dialog.getByRole('button', { name: opposite === 'dark' ? t.darkMode : t.lightMode }))
    expect(dialog.getByRole('button', { name: 'React Theme' })).toHaveAttribute('aria-pressed', 'true')
    expect(pageColor()).toBe(PRESETS.react[opposite].background)
    fireEvent.click(dialog.getByRole('button', { name: t.saveChanges }))
    expect(readSaved()).toEqual({ ...original, personalization: PRESETS.react, palettePreset: 'react' })
    fireEvent.click(screen.getByRole('button', { name: theme === 'dark' ? t.switchToLight : t.switchToDark }))
    expect(pageColor()).toBe(PRESETS.react[opposite].background)
    fireEvent.click(screen.getByRole('button', { name: theme === 'dark' ? t.switchToDark : t.switchToLight }))
    first.unmount()
    render(<App />)
    expect(pageColor()).toBe(PRESETS.react[theme].background)
    fireEvent.click(screen.getByRole('button', { name: t.settings }))
    expect(screen.getByRole('button', { name: 'React Theme' })).toHaveAttribute('aria-pressed', 'true')
  })

  it.each(PRESET_IDS)('conserva la paleta %s al alternar oscuro/claro en ambos sentidos', (id) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...defaultPreferences(), theme: 'dark' }))
    render(<App />)
    const dialog = openSettings()
    fireEvent.click(dialog.getByRole('button', { name: messages('es').presetNames[id] }))
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(readSaved().palettePreset).toBe(id)
    for (const theme of ['light', 'dark'] as const) {
      fireEvent.click(screen.getByRole('button', { name: theme === 'light' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro' }))
      expect(pageColor()).toBe(id === 'meridiano' ? '' : PRESETS[id][theme].background)
      expect(readSaved().theme).toBe(theme)
      expect(readSaved().palettePreset).toBe(id)
    }
  })

  it.each(['light', 'dark'] as const)('recupera React guardado solo en oscuro aunque el modo actual sea %s, sin escribir al montar', (theme) => {
    const original = { ...defaultPreferences(), theme, clocks: [], personalization: { dark: PRESETS.react.dark } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(original))
    const write = vi.spyOn(Storage.prototype, 'setItem')
    render(<StrictMode><App /></StrictMode>)
    expect(pageColor()).toBe(PRESETS.react[theme].background)
    expect(write).not.toHaveBeenCalled()
    expect(readSaved()).toEqual(original)
    fireEvent.click(screen.getByRole('button', { name: theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro' }))
    expect(readSaved()).toEqual({ ...original, theme: theme === 'light' ? 'dark' : 'light', personalization: PRESETS.react, palettePreset: 'react' })
  })

  it('abre datos anteriores sin escribir y cancela la vista previa restaurando colores, tema y foco', () => {
    const original = { ...defaultPreferences(), clocks: [] }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(original))
    const write = vi.spyOn(Storage.prototype, 'setItem')
    render(<StrictMode><App /></StrictMode>)
    const dialog = openSettings()
    expect(dialog.getByRole('button', { name: 'Cerrar diálogo' })).toHaveFocus()
    fireEvent.click(dialog.getByRole('button', { name: 'Océano' }))
    expect(pageColor()).toBe(PRESETS.ocean.light.background)
    fireEvent.click(dialog.getByRole('button', { name: 'Modo oscuro' }))
    fireEvent.click(dialog.getByRole('button', { name: 'Orquídea' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(pageColor()).toBe(PRESETS.orchid.dark.background)
    fireEvent.click(dialog.getByRole('button', { name: 'Cancelar' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(pageColor()).toBe('')
    expect(screen.getByRole('button', { name: 'Ajustes' })).toHaveFocus()
    expect(write).not.toHaveBeenCalled()
    expect(readSaved()).toEqual(original)
  })

  it('guarda colores manuales por modo y conserva conversiones, etiquetas, formato e idioma', () => {
    const original = { ...defaultPreferences(), theme: 'light' as const, language: 'es' as const, clocks: [{ id: 'client', zone: 'Asia/Kathmandu', label: 'Mi cliente' }] }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(original))
    const first = render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Convertir horario' }))
    fireEvent.change(screen.getByLabelText('Fecha en CDMX'), { target: { value: '2026-12-31' } })
    fireEvent.change(screen.getByLabelText('Hora en CDMX (24 h)'), { target: { value: '23:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Convertir en todos los relojes' }))
    const dialog = openSettings()
    fireEvent.click(dialog.getByRole('button', { name: 'Océano' }))
    fireEvent.change(dialog.getByLabelText('Fondo del dashboard HEX'), { target: { value: '#123456' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Modo oscuro' }))
    fireEvent.change(dialog.getByLabelText('Acento y botones HEX'), { target: { value: '#abcdef' } })
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByLabelText('Fecha en CDMX')).toHaveValue('2026-12-31')
    expect(screen.getByRole('article')).toHaveTextContent('11:15')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(readSaved()).toEqual({ ...original, personalization: { light: { ...PRESETS.ocean.light, background: '#123456' }, dark: { ...PRESETS.ocean.dark, accent: '#abcdef' } }, palettePreset: 'custom' })
    first.unmount()
    render(<App />)
    expect(pageColor()).toBe('#123456')
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }))
    expect(pageColor()).toBe(PRESETS.ocean.dark.background)
    expect(document.documentElement.style.getPropertyValue('--p-primary')).toBe('#abcdef')
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo claro' }))
    expect(pageColor()).toBe('#123456')
    expect(screen.getByText('Mi cliente')).toBeInTheDocument()
  })

  it('rechaza HEX incompleto sin aplicar CSS inválido y no olvida errores de otro modo', () => {
    render(<App />)
    const dialog = openSettings()
    fireEvent.click(dialog.getByRole('button', { name: 'Océano' }))
    fireEvent.change(dialog.getByLabelText('Fondo del dashboard HEX'), { target: { value: '#123' } })
    expect(dialog.getByLabelText('Fondo del dashboard HEX')).toHaveAttribute('aria-invalid', 'true')
    expect(dialog.getByRole('alert')).toHaveTextContent('modo claro')
    expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    expect(pageColor()).toBe(PRESETS.ocean.light.background)
    fireEvent.click(dialog.getByRole('button', { name: 'Modo oscuro' }))
    expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    fireEvent.click(dialog.getByRole('button', { name: 'Modo claro' }))
    fireEvent.change(dialog.getByLabelText('Elegir color: Fondo del dashboard'), { target: { value: '#345678' } })
    expect(dialog.getByLabelText('Fondo del dashboard HEX')).toHaveValue('#345678')
    expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled()
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(readSaved().personalization?.light?.background).toBe('#345678')
  })

  it('restaura solo el modo editado y limpia todos los tokens al restablecer el último', () => {
    const original = { ...defaultPreferences(), theme: 'light' as const, palettePreset: 'custom' as const, personalization: { light: PRESETS.ocean.light, dark: PRESETS.rose.dark } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(original))
    render(<App />)
    let dialog = openSettings()
    fireEvent.click(dialog.getByRole('button', { name: 'Restaurar colores de este modo' }))
    expect(pageColor()).toBe('')
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(readSaved()).toEqual({ ...original, personalization: { dark: PRESETS.rose.dark } })
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo claro' }))
    expect(pageColor()).toBe('')
    dialog = openSettings()
    fireEvent.click(dialog.getByRole('button', { name: 'Modo oscuro' }))
    fireEvent.click(dialog.getByRole('button', { name: 'Meridiano' }))
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(readSaved()).not.toHaveProperty('personalization')
    expect(document.documentElement.style.length).toBe(0)
  })

  it('Escape y cerrar descartan ediciones de una paleta guardada', () => {
    const original = { ...defaultPreferences(), personalization: { light: PRESETS.ocean.light } }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(original))
    render(<App />)
    let dialog = openSettings()
    fireEvent.click(dialog.getByRole('button', { name: 'Atardecer' }))
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }))
    expect(pageColor()).toBe(PRESETS.ocean.light.background)
    dialog = openSettings()
    fireEvent.click(dialog.getByRole('button', { name: 'Rosa' }))
    fireEvent.click(dialog.getByRole('button', { name: 'Cerrar diálogo' }))
    expect(readSaved()).toEqual(original)
    expect(pageColor()).toBe(PRESETS.ocean.light.background)
  })

  it('muestra fallos de guardado y mantiene la paleta en memoria', () => {
    render(<App />)
    const dialog = openSettings()
    fireEvent.click(dialog.getByRole('button', { name: 'Pizarra' }))
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Blocked', 'SecurityError') })
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron guardar')
    expect(pageColor()).toBe(PRESETS.slate.light.background)
    const reopened = openSettings()
    expect(reopened.getByRole('alert')).toHaveTextContent('No se pudieron guardar')
  })

  it('conserva los originales de paletas inválidas hasta guardado explícito de recuperación', () => {
    const original = JSON.stringify({ ...defaultPreferences(), clocks: [], personalization: { light: 'broken' } })
    window.localStorage.setItem(STORAGE_KEY, original)
    render(<App />)
    expect(screen.getByRole('alert')).toHaveTextContent('Conservamos tus relojes')
    const dialog = openSettings()
    expect(dialog.getByRole('alert')).toHaveTextContent('Los colores guardados no son válidos')
    fireEvent.click(dialog.getByRole('button', { name: 'Océano' }))
    fireEvent.click(dialog.getByRole('button', { name: 'Guardar cambios' }))
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe(original)
    fireEvent.click(screen.getByRole('button', { name: 'Guardar esta configuración en la app' }))
    expect(readSaved().clocks).toEqual([])
    expect(readSaved().personalization?.light).toEqual(PRESETS.ocean.light)
  })

  it('traduce los ajustes y conserva la paleta al cambiar de idioma', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'ES / EN: Cambiar a inglés' }))
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = within(screen.getByRole('dialog', { name: 'Personalization' }))
    fireEvent.click(dialog.getByRole('button', { name: 'Orchid' }))
    fireEvent.click(dialog.getByRole('button', { name: 'Save changes' }))
    fireEvent.click(screen.getByRole('button', { name: 'ES / EN: Switch to Spanish' }))
    expect(pageColor()).toBe(PRESETS.orchid.light.background)
    expect(readSaved().language).toBe('es')
  })
})
