import { useEffect, useRef, useState } from 'react'
import { useModalDialog } from './hooks'
import { Icon } from './icons'
import { messages } from './i18n'
import { isHexColor, PALETTE_KEYS, palettesForPreset, PRESET_IDS, PRESETS, presetFor } from './palette'
import type { PalettePreset } from './palette'
import type { StorageIssue } from './storage'
import type { Language, PalettePreview, Personalization, Theme } from './types'

interface Props {
  language: Language
  theme: Theme
  personalization: Personalization | undefined
  preset: PalettePreset | undefined
  issue: StorageIssue | null
  onPreview: (preview: PalettePreview) => void
  onSave: (personalization: Personalization) => void
  onClose: () => void
  onTransfer: () => void
}

export function SettingsDialog({ language, theme, personalization, preset, issue, onPreview, onSave, onClose, onTransfer }: Props) {
  const t = messages(language)
  const [editingTheme, setEditingTheme] = useState(theme)
  const [draft, setDraft] = useState<Personalization>(() =>
    preset && preset !== 'custom' ? palettesForPreset(preset) : { ...personalization },
  )
  const initialFocus = useRef<HTMLButtonElement>(null)
  const dialog = useModalDialog(initialFocus)
  const palette = draft[editingTheme]
  const colors = palette ?? PRESETS.meridiano[editingTheme]
  const selectedPreset = presetFor(palette, editingTheme)
  const invalidTheme = (['light', 'dark'] as const).find((mode) => {
    const candidate = draft[mode]
    return candidate && PALETTE_KEYS.some((key) => !isHexColor(candidate[key]))
  })

  useEffect(() => {
    // Keep the last valid preview while an incomplete HEX value is being typed.
    if (PALETTE_KEYS.every((key) => isHexColor(colors[key]))) onPreview({ theme: editingTheme, palette })
  }, [editingTheme, palette, colors, onPreview])

  function resetPalette() {
    setDraft((previous) => {
      const next = { ...previous }
      delete next[editingTheme]
      return next
    })
  }

  return (
    <dialog ref={dialog} className="clock-dialog settings-dialog" aria-labelledby="settings-title" aria-describedby="settings-description" onCancel={(event) => { event.preventDefault(); onClose() }}>
      <div className="dialog-heading">
        <div><p className="eyebrow">{t.settings} /</p><h2 id="settings-title">{t.personalization}</h2></div>
        <button ref={initialFocus} type="button" className="icon-button" aria-label={t.closeDialog} onClick={onClose}><Icon name="close" /></button>
      </div>
      <p id="settings-description" className="dialog-description">{t.personalizationDescription}</p>
      <div className="transfer-entry">
        <button type="button" className="button button-secondary" onClick={onTransfer}>{t.transferTitle}</button>
        <p className="palette-hint">{t.transferOpenHint}</p>
      </div>
      {issue && <div className="storage-warning" role="alert"><p>{t[issue]}</p></div>}
      <form noValidate onSubmit={(event) => { event.preventDefault(); if (!invalidTheme) onSave(draft) }}>
        <fieldset className="palette-section">
          <legend>{t.editingTheme}</legend>
          <div className="segmented palette-modes">
            {(['light', 'dark'] as const).map((mode) => <button key={mode} type="button" aria-pressed={editingTheme === mode} onClick={() => setEditingTheme(mode)}><Icon name={mode === 'light' ? 'sun' : 'moon'} size={16} />{mode === 'light' ? t.lightMode : t.darkMode}</button>)}
          </div>
          <p className="palette-hint">{t.themePaletteHint}</p>
        </fieldset>
        <fieldset className="palette-section">
          <legend>{t.palettePresets}</legend>
          <div className="palette-presets">
            {PRESET_IDS.map((id) => <button key={id} type="button" className="palette-preset" aria-pressed={selectedPreset === id} onClick={() => setDraft(palettesForPreset(id))}>
              <span className="palette-swatches" aria-hidden="true">{(['background', 'surface', 'accent', 'hero', 'highlight'] as const).map((key) => <span key={key} style={{ backgroundColor: PRESETS[id][editingTheme][key] }} />)}</span>
              <span>{t.presetNames[id]}{selectedPreset === id && <span aria-hidden="true"> ✓</span>}</span>
            </button>)}
          </div>
        </fieldset>
        <section className="palette-live-preview" aria-label={t.palettePreview}>
          <div className="palette-preview-hero"><span>{t.mexicoCity}</span><strong>09:41</strong><span>America/Mexico_City</span></div>
          <div className="palette-preview-card"><span>{t.previewClient}</span><strong>16:41</strong><span className="palette-preview-action">{t.previewAction}</span></div>
        </section>
        <fieldset className="palette-section">
          <legend>{t.customColors}{selectedPreset === 'custom' && <span className="palette-custom-label"> · {t.customPalette}</span>}</legend>
          <p className="palette-hint">{t.contrastHint}</p>
          <div className="palette-fields">
            {PALETTE_KEYS.map((key) => {
              const invalid = !isHexColor(colors[key])
              const errorId = `palette-${key}-error`
              return <div className="palette-field" key={key}>
                <label htmlFor={`palette-${key}`}>{t.paletteLabels[key]}</label>
                <div className="palette-color-inputs">
                  <input type="color" aria-label={t.chooseColor(t.paletteLabels[key])} value={invalid ? PRESETS.meridiano[editingTheme][key] : colors[key]} onChange={(event) => setDraft((previous) => ({ ...previous, [editingTheme]: { ...colors, [key]: event.target.value } }))} />
                  <input id={`palette-${key}`} type="text" value={colors[key]} maxLength={7} spellCheck={false} autoComplete="off" aria-label={`${t.paletteLabels[key]} HEX`} aria-invalid={invalid} aria-describedby={invalid ? errorId : undefined} onChange={(event) => setDraft((previous) => ({ ...previous, [editingTheme]: { ...colors, [key]: event.target.value } }))} />
                </div>
                {invalid && <p id={errorId} className="field-error">{t.hexError}</p>}
              </div>
            })}
          </div>
        </fieldset>
        <button type="button" className="text-button palette-reset" onClick={resetPalette}>{t.resetPalette}</button>
        {invalidTheme && <p className="field-error" role="alert">{t.paletteInvalid(invalidTheme === 'light' ? t.lightMode : t.darkMode)}</p>}
        <div className="palette-save-area">
          <p className="palette-hint">{t.palettePreviewHint}</p>
          <div className="dialog-actions"><button className="button button-secondary" type="button" onClick={onClose}>{t.cancel}</button><button className="button button-primary" type="submit" disabled={Boolean(invalidTheme)}>{t.saveChanges}</button></div>
        </div>
      </form>
    </dialog>
  )
}
