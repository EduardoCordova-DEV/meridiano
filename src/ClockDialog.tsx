import { useRef, useState } from 'react'
import { useModalDialog } from './hooks'
import { Icon } from './icons'
import { messages } from './i18n'
import { getClockDetails } from './time'
import type { Language, WorldClock } from './types'
import { searchZones, zoneInfo } from './zones'
import { zoneNames } from './zone-names'

interface ClockDialogProps {
  clock: WorldClock | null
  instant: number
  language: Language
  onSave: (zone: string, label: string, caseNumber: string) => void
  onClose: () => void
}

export function ClockDialog({ clock, instant, language, onSave, onClose }: ClockDialogProps) {
  const t = messages(language)
  const search = useRef<HTMLInputElement>(null)
  const dialog = useModalDialog(search)
  const [query, setQuery] = useState('')
  const [zone, setZone] = useState(clock?.zone ?? '')
  const [label, setLabel] = useState(clock?.label ?? '')
  const [caseNumber, setCaseNumber] = useState(clock?.caseNumber ?? '')
  const [error, setError] = useState(false)
  const options = searchZones(query, language, instant)
  const groups = new Map<string, typeof options>()
  for (const option of options) {
    const name = zoneNames(option.zone).labels[language]
    const group = groups.get(name)
    if (group) group.push(option)
    else groups.set(name, [option])
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!zone) {
      setError(true)
      return
    }
    onSave(zone, label.trim(), caseNumber.trim())
  }

  return (
    <dialog ref={dialog} className="clock-dialog" aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); onClose() }}>
      <div className="dialog-heading">
        <div><p className="eyebrow">{t.connectedWorld}</p><h2 id="dialog-title">{clock ? t.editClock : t.newConnection}</h2></div>
        <button type="button" className="icon-button" aria-label={t.closeDialog} onClick={onClose}><Icon name="close" /></button>
      </div>
      <p className="dialog-description">{t.searchDescription}</p>
      <form onSubmit={submit}>
        <label htmlFor="zone-search">{t.searchLocation}</label>
        <div className="search-field"><Icon name="search" /><input ref={search} id="zone-search" type="search" placeholder={t.searchPlaceholder} value={query} onChange={(event) => setQuery(event.target.value)} aria-describedby="offset-search-note named-zone-note" /></div>
        <p id="offset-search-note" className="field-hint offset-search-note">{t.offsetSearchNote}</p>
        <p id="named-zone-note" className="field-hint offset-search-note">{t.namedZoneNote}</p>
        <label htmlFor="zone-select">{t.cityOrZone} <span className="field-hint">{t.availableZones(options.length)}</span></label>
        <select id="zone-select" className="zone-select" size={5} value={options.some((item) => item.zone === zone) ? zone : ''} onChange={(event) => { setZone(event.target.value); setError(false) }} aria-describedby="selected-zone zone-error">
          <option value="" disabled>{t.selectZone}</option>
          {[...groups].map(([name, items]) => <optgroup key={name} label={name} aria-label={name}>{items.map((item) => <option key={item.zone} value={item.zone}>{item.city} · {item.country} — {item.zone}</option>)}</optgroup>)}
        </select>
        {options.length === 0 && <p className="field-hint" role="status">{t.noResults}</p>}
        <p id="selected-zone" className="selected-zone">{zone ? <>{t.selected} <strong>{zoneInfo(zone, language).city}</strong> · {zone}<br />{zoneNames(zone).labels[language]}<br />{getClockDetails(instant, zone, '24', language).offset} {t.offsetAtInstant}</> : t.selectFromList}</p>
        <div className="case-number-field">
          <label htmlFor="case-number">{t.caseNumber} <span className="field-hint">{t.optional}</span></label>
          <input id="case-number" type="text" maxLength={60} value={caseNumber} onChange={(event) => setCaseNumber(event.target.value)} placeholder={t.caseNumberPlaceholder} autoComplete="off" spellCheck={false} />
        </div>
        <label htmlFor="client-label">{t.clientLabel} <span className="field-hint">{t.optional}</span></label>
        <input id="client-label" maxLength={60} value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t.labelPlaceholder} />
        <p id="zone-error" className="field-error" role={error ? 'alert' : undefined}>{error ? t.selectZoneError : ''}</p>
        <div className="dialog-actions"><button type="button" className="button button-secondary" onClick={onClose}>{t.cancel}</button><button type="submit" className="button button-primary">{clock ? t.saveChanges : t.addClock}<Icon name="arrow" size={17} /></button></div>
      </form>
    </dialog>
  )
}
