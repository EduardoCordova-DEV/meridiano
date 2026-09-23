import { useLayoutEffect, useMemo, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { Icon } from './icons'
import { messages } from './i18n'
import { BASE_ZONE, getClockDetails, MAX_DATE, mexicoDaySlots, mexicoInputAt, MIN_DATE } from './time'
import type { ConversionErrorCode } from './time'
import type { HourCycle, Language, WorldClock } from './types'
import { zoneInfo } from './zones'
import { zoneNames } from './zone-names'

type ClockDetails = ReturnType<typeof getClockDetails>
const timeLabel = (details: ClockDetails) => `${details.time}${details.period ? ` ${details.period}` : ''}`
const fullLabel = (details: ClockDetails) => `${timeLabel(details)}, ${details.date}, ${details.offset}`

interface Props {
  clocks: WorldClock[]
  instant: number
  hourCycle: HourCycle
  language: Language
  live: boolean
  error: ConversionErrorCode | null
  onSelect: (instant: number) => void
  onNavigate: (days: -1 | 1) => void
  onNow: () => void
  onAdd: () => void
  onEdit: (clock: WorldClock) => void
  onRemove: (clock: WorldClock) => void
}

interface RowProps extends Pick<Props, 'instant' | 'hourCycle' | 'language' | 'onSelect'> {
  clock?: WorldClock
  slots: number[]
  baseHours: ClockDetails[]
  activeIndex: number
  onEdit?: () => void
  onRemove?: () => void
}

function CityRow({ clock, instant, slots, baseHours, activeIndex, hourCycle, language, onSelect, onEdit, onRemove }: RowProps) {
  const t = messages(language)
  const zone = clock?.zone ?? BASE_ZONE
  const place = zoneInfo(zone, language)
  const current = getClockDetails(instant, zone, hourCycle, language)
  const hours = useMemo(() => slots.map((slot) => getClockDetails(slot, zone, hourCycle, language)), [slots, zone, hourCycle, language])
  const row = useRef<HTMLTableRowElement>(null)

  function move(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let target: number
    switch (event.key) {
      case 'ArrowLeft': target = Math.max(0, index - 1); break
      case 'ArrowRight': target = Math.min(slots.length - 1, index + 1); break
      case 'Home': target = 0; break
      case 'End': target = slots.length - 1; break
      default: return
    }
    event.preventDefault()
    onSelect(slots[target])
    row.current?.querySelector<HTMLButtonElement>(`button[data-slot-index="${target}"]`)?.focus({ preventScroll: true })
  }

  return (
    <tr ref={row} data-zone={zone} className={clock ? '' : 'timeline-base-row'}>
      <th scope="row" className="timeline-location">
        <div className="timeline-city-heading"><strong>{place.city}</strong>{clock && <span className="timeline-row-actions"><button type="button" className="icon-button" aria-label={t.editClockName(place.city)} onClick={onEdit}><Icon name="edit" size={13} /></button><button type="button" className="icon-button" aria-label={t.removeClockName(place.city)} onClick={onRemove}><Icon name="close" size={14} /></button></span>}</div>
        {clock?.caseNumber && <div className="case-reference"><span className="case-label">{t.caseLabel}</span><span className="case-badge">{clock.caseNumber}</span></div>}
        <span className="timeline-client">{clock ? clock.label || place.country : t.baseCity}</span>
        <span className="timeline-zone">{zone}</span>
        <span className="timeline-zone">{zoneNames(zone).labels[language]}</span>
        <span className="timeline-offset">{current.zoneName} · {current.offset}</span>
        <span className="timeline-current-time">{timeLabel(current)} <small>{current.dayDifference ? current.dayLabel : ''}</small></span>
        <span className="timeline-local-date">{current.date}</span>
      </th>
      {hours.map((details, index) => {
        const band = details.isBusinessHour ? 'work' : details.isDay ? 'day' : 'night'
        const bandLabel = details.isBusinessHour ? t.timelineWork : details.isDay ? t.timelineDay : t.timelineNight
        const label = `${t.chooseTimelineTime(place.city, fullLabel(details), fullLabel(baseHours[index]))}. ${bandLabel}`
        return <td key={slots[index]}>
          <button type="button" className={`timeline-cell timeline-${band}${index === activeIndex ? ' timeline-active' : ''}`} data-slot-index={index} aria-label={label} title={label} aria-pressed={index === activeIndex} tabIndex={index === activeIndex ? 0 : -1} onClick={() => onSelect(slots[index])} onKeyDown={(event) => move(event, index)}>
            <span className="timeline-hour">{details.time}</span>
            {details.period && <span className="timeline-period">{details.period}</span>}
            <span className="timeline-day-offset">{details.dayDifference ? details.dayLabel : '\u00a0'}</span>
          </button>
        </td>
      })}
    </tr>
  )
}

export function TimeComparison({ clocks, instant, hourCycle, language, live, error, onSelect, onNavigate, onNow, onAdd, onEdit, onRemove }: Props) {
  const t = messages(language)
  const date = mexicoInputAt(instant).date
  const slots = useMemo(() => mexicoDaySlots(date), [date])
  const baseHours = useMemo(() => slots.map((slot) => getClockDetails(slot, BASE_ZONE, hourCycle, language)), [slots, hourCycle, language])
  const activeIndex = slots.reduce((active, slot, index) => slot <= instant ? index : active, 0)
  const scroll = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const container = scroll.current!
    const selected = container.querySelector<HTMLButtonElement>(`button[data-slot-index="${activeIndex}"]`)
    const location = container.querySelector<HTMLElement>('.timeline-location')
    if (!selected || !location) return
    const target = selected.getBoundingClientRect()
    const viewport = container.getBoundingClientRect()
    const labelWidth = location.getBoundingClientRect().width
    container.scrollLeft += target.left + target.width / 2 - viewport.left - (container.clientWidth + labelWidth) / 2
  }, [activeIndex, slots])

  const rowProps = { instant, slots, baseHours, activeIndex, hourCycle, language, onSelect }
  return (
    <section className="timeline-panel" aria-labelledby="timeline-title">
      <div className="timeline-toolbar">
        <div><h3 id="timeline-title">{t.timelineTitle}</h3><p>{t.mexicoCity} · {baseHours[0].date}</p></div>
        <div className="timeline-navigation">
          <button type="button" className="button button-secondary" aria-label={t.previousDate} title={t.previousDate} disabled={date <= MIN_DATE} onClick={() => onNavigate(-1)}><Icon name="arrow" size={16} style={{ transform: 'rotate(180deg)' }} /></button>
          <button type="button" className="button button-secondary" aria-label={t.nextDate} title={t.nextDate} disabled={date >= MAX_DATE} onClick={() => onNavigate(1)}><Icon name="arrow" size={16} /></button>
          {!live && <button type="button" className="text-button" onClick={onNow}>{t.returnNow}</button>}
        </div>
      </div>
      <p className="timeline-instructions">{t.timelineDescription}</p>
      {slots.length !== 24 && <p className="timeline-dst-note">{t.timelineDst(slots.length)}</p>}
      {error && <p className="field-error" role="alert">{t[error]}</p>}
      <div ref={scroll} className="timeline-scroll" tabIndex={0} role="region" aria-label={t.timelineScroll} aria-describedby="timeline-keyboard">
        <table className="timeline-table" style={{ minWidth: 190 + slots.length * 38 }}>
          <caption className="sr-only">{t.timelineTable}. {t.mexicoHours}: {baseHours[0].date}.</caption>
          <colgroup><col style={{ width: 190 }} /><col span={slots.length} /></colgroup>
          <thead><tr><th scope="col" className="timeline-location">{t.citiesAndZones}<small>{t.mexicoHours} →</small></th>{baseHours.map((hour, index) => <th scope="col" key={slots[index]} title={fullLabel(hour)}><span>{hour.time}</span>{hour.period && <small>{hour.period}</small>}{slots.length !== 24 && <small>{hour.offset}</small>}</th>)}</tr></thead>
          <tbody>
            <CityRow {...rowProps} />
            {clocks.map((clock) => <CityRow key={clock.id} {...rowProps} clock={clock} onEdit={() => onEdit(clock)} onRemove={() => onRemove(clock)} />)}
          </tbody>
        </table>
      </div>
      <div className="timeline-legend"><span><i className="timeline-work" />{t.timelineWork}</span><span><i className="timeline-day" />{t.timelineDay}</span><span><i className="timeline-night" />{t.timelineNight}</span></div>
      <p className="timeline-footnote">{t.timelineLegend} {t.timelineZoneNote}</p>
      <p id="timeline-keyboard" className="timeline-footnote">{t.timelineKeyboard}</p>
      <button type="button" className="text-button timeline-add" onClick={onAdd}><Icon name="plus" size={16} />{t.addClientClock}</button>
    </section>
  )
}
