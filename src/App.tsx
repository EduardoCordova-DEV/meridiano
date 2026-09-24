import { useState } from 'react'
import { ClockDialog } from './ClockDialog'
import { CelestialBackdrop } from './CelestialBackdrop'
import { EarthBackdrop } from './EarthBackdrop'
import { SettingsDialog } from './SettingsDialog'
import { TimeComparison } from './TimeComparison'
import { TransferDialog } from './TransferDialog'
import { useCurrentInstant, useDocumentLanguage, usePreferences, useTheme } from './hooks'
import { Icon } from './icons'
import { messages } from './i18n'
import { sharedPreset } from './palette'
import { BASE_ZONE, ConversionError, getClockDetails, MAX_DATE, mexicoInputAt, mexicoInputToInstant, MIN_DATE, shiftMexicoDate } from './time'
import type { ConversionErrorCode } from './time'
import type { HourCycle, Language, PalettePreview, Personalization, WorldClock } from './types'
import { zoneInfo } from './zones'
import { zoneNames } from './zone-names'
import { useClockPagination } from './useClockPagination'

type Notice =
  | { kind: 'now' | 'updated' | 'personalized' }
  | { kind: 'converted'; date: string; time: string }
  | { kind: 'added' | 'removed'; zone: string }

function noticeText(notice: Notice | null, language: Language): string {
  const t = messages(language)
  if (!notice) return ''
  switch (notice.kind) {
    case 'now': return t.nowNotice
    case 'updated': return t.clockUpdated
    case 'personalized': return t.paletteApplied
    case 'converted': return t.convertedNotice(notice.date, notice.time)
    case 'added': return t.clockAdded(zoneInfo(notice.zone, language).city)
    case 'removed': return t.clockRemoved(zoneInfo(notice.zone, language).city)
  }
}

function TimeDisplay({ details, large = false }: { details: ReturnType<typeof getClockDetails>; large?: boolean }) {
  return <div className={`time-display${large ? ' time-display-large' : ''}`}><span>{details.time}</span><span className="seconds">:{details.seconds}</span>{details.period && <span className="period">{details.period}</span>}</div>
}

function ClockCard({ clock, instant, hourCycle, language, onEdit, onRemove }: { clock: WorldClock; instant: number; hourCycle: HourCycle; language: Language; onEdit: () => void; onRemove: () => void }) {
  const t = messages(language)
  const place = zoneInfo(clock.zone, language)
  const details = getClockDetails(instant, clock.zone, hourCycle, language)
  return (
    <article className="clock-card" data-daytime={details.isDay} aria-label={t.clockName(place.city, clock.label)}>
      <div className="card-top">
        <span className="sr-only">{details.isDay ? t.daytime : t.nighttime}</span>
        {clock.caseNumber && <div className="case-reference"><span className="case-badge">{clock.caseNumber}</span></div>}
        <div className="card-actions"><button className="icon-button" aria-label={t.editClockName(place.city)} onClick={onEdit}><Icon name="edit" size={16} /></button><button className="icon-button" aria-label={t.removeClockName(place.city)} onClick={onRemove}><Icon name="close" size={17} /></button></div>
      </div>
      <p className="client-label">{clock.label || place.country}</p>
      <h3>{place.city}</h3>
      <p className="iana-zone">{clock.zone}</p>
      <p className="iana-zone">{zoneNames(clock.zone).labels[language]}</p>
      <TimeDisplay details={details} />
      <p className="card-date">{details.date}</p>
      <div className="card-footer"><span className="difference">{details.difference}</span><span className={`day-badge${details.dayDifference ? ' different-day' : ''}`}>{details.dayLabel}</span></div>
      <p className="card-offset"><span>{details.zoneName}</span> · <span>{details.offset}</span></p>
      <CelestialBackdrop isDay={details.isDay} language={language} />
    </article>
  )
}

function ClockCards({ clocks, instant, hourCycle, language, revealId, onEdit, onRemove }: {
  clocks: WorldClock[]; instant: number; hourCycle: HourCycle; language: Language; revealId: string | null
  onEdit: (clock: WorldClock) => void; onRemove: (clock: WorldClock) => void
}) {
  const t = messages(language)
  const pagination = useClockPagination(clocks, revealId)
  return <div ref={pagination.container} className="clock-pages">
    <div className="clock-grid">
      {pagination.visible.map((clock) => <ClockCard key={clock.id} clock={clock} instant={instant} hourCycle={hourCycle} language={language} onEdit={() => onEdit(clock)} onRemove={() => onRemove(clock)} />)}
    </div>
    {pagination.pages > 1 && <nav className="clock-pagination" aria-label={t.clockPages}>
      <button type="button" className="icon-button" aria-label={t.previousClocks} disabled={pagination.page === 0} onClick={() => pagination.goTo(pagination.page - 1)}><Icon name="arrow" size={16} style={{ transform: 'rotate(180deg)' }} /></button>
      <span role="status">{t.clockPage(pagination.page + 1, pagination.pages, pagination.start + 1, pagination.start + pagination.visible.length, clocks.length)}</span>
      <button type="button" className="icon-button" aria-label={t.nextClocks} disabled={pagination.page === pagination.pages - 1} onClick={() => pagination.goTo(pagination.page + 1)}><Icon name="arrow" size={16} /></button>
    </nav>}
  </div>
}

export default function App() {
  const { preferences, issue, update, retrySave, replace } = usePreferences()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [palettePreview, setPalettePreview] = useState<PalettePreview | null>(null)
  const theme = useTheme(preferences.theme, preferences.personalization, palettePreview, preferences.palettePreset)
  const language = preferences.language ?? 'es'
  const clockView = preferences.clockView ?? 'cards'
  const t = messages(language)
  useDocumentLanguage(language)
  const [mode, setMode] = useState<'now' | 'convert'>('now')
  const [selectedInstant, setSelectedInstant] = useState(Date.now)
  const now = useCurrentInstant(mode === 'now')
  const instant = mode === 'now' ? now : selectedInstant
  const [draft, setDraft] = useState(() => mexicoInputAt(Date.now()))
  const [conversionError, setConversionError] = useState<ConversionErrorCode | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [dialog, setDialog] = useState<{ clock: WorldClock | null } | null>(null)
  const [revealClockId, setRevealClockId] = useState<string | null>(null)
  const details = getClockDetails(instant, BASE_ZONE, preferences.hourCycle, language)
  const applied = mexicoInputAt(selectedInstant)
  const hasPendingChanges = mode === 'convert' && (draft.date !== applied.date || draft.time !== applied.time)

  function enterConverter() {
    if (mode === 'convert') return
    const input = mexicoInputAt(now)
    setDraft(input)
    setSelectedInstant(mexicoInputToInstant(input.date, input.time))
    setConversionError(null)
    setMode('convert')
  }

  function returnToNow() {
    setMode('now')
    setConversionError(null)
    setNotice({ kind: 'now' })
  }

  function selectInstant(result: number) {
    const input = mexicoInputAt(result)
    setSelectedInstant(result)
    setDraft(input)
    setMode('convert')
    setConversionError(null)
    setNotice({ kind: 'converted', ...input })
  }

  function applyInput(date: string, time: string) {
    try {
      selectInstant(mexicoInputToInstant(date, time))
    } catch (error) {
      if (!(error instanceof ConversionError)) console.error('Unexpected time conversion error', error)
      setConversionError(error instanceof ConversionError ? error.code : 'conversionFailed')
    }
  }

  function convert(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    applyInput(draft.date, draft.time)
  }

  function navigateDay(days: -1 | 1) {
    const input = mexicoInputAt(instant)
    applyInput(shiftMexicoDate(input.date, days), input.time)
  }

  function removeClock(clock: WorldClock) {
    update((previous) => ({ ...previous, clocks: previous.clocks.filter((item) => item.id !== clock.id) }))
    setNotice({ kind: 'removed', zone: clock.zone })
  }

  function saveClock(zone: string, label: string, caseNumber: string) {
    const existing = dialog?.clock
    const saved: WorldClock = { id: existing?.id ?? crypto.randomUUID(), zone, label, ...(caseNumber ? { caseNumber } : {}) }
    update((previous) => ({
      ...previous,
      clocks: existing
        ? previous.clocks.map((clock) => clock.id === existing.id ? saved : clock)
        : [...previous.clocks, saved],
    }))
    setRevealClockId(saved.id)
    setDialog(null)
    setNotice(existing ? { kind: 'updated' } : { kind: 'added', zone })
  }

  function closeSettings() {
    setSettingsOpen(false)
    setPalettePreview(null)
  }

  function savePersonalization(personalization: Personalization) {
    update((previous) => {
      const next = { ...previous, palettePreset: sharedPreset(personalization) }
      if (Object.keys(personalization).length) next.personalization = personalization
      else delete next.personalization
      return next
    })
    closeSettings()
    setNotice({ kind: 'personalized' })
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">{t.skipContent}</a>
      <div className="desktop-titlebar" aria-hidden="true"><Icon name="globe" size={15} /><span>Meridiano Desk App</span></div>
      <header className="site-header">
        <a className="brand" href="./" aria-label={t.homeLink}><span className="brand-mark"><Icon name="globe" size={29} /></span><span>meridiano<span className="brand-dot">.</span></span></a>
        <span className="header-caption">{t.tagline}</span>
        <div className="header-actions">
          <span className="private-badge"><Icon name="shield" size={15} />{t.private}</span>
          <button type="button" className="theme-toggle" onClick={() => setSettingsOpen(true)} aria-haspopup="dialog"><Icon name="settings" size={17} /><span>{t.settings}</span></button>
          <button type="button" className="theme-toggle" aria-label={theme === 'dark' ? t.switchToLight : t.switchToDark} title={theme === 'dark' ? t.darkActive : t.lightActive} onClick={() => update((previous) => ({ ...previous, theme: theme === 'dark' ? 'light' : 'dark' }))}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={17} />
            <span>{theme === 'dark' ? t.lightMode : t.darkMode}</span>
          </button>
          <button type="button" className="theme-toggle language-toggle" aria-label={`ES / EN: ${t.switchLanguage}`} title={t.languageActive} onClick={() => update((previous) => ({ ...previous, language: language === 'es' ? 'en' : 'es' }))}>
            <span lang="es" className={language === 'es' ? 'language-active' : ''}>ES</span><span aria-hidden="true">/</span><span lang="en" className={language === 'en' ? 'language-active' : ''}>EN</span>
          </button>
        </div>
      </header>

      <main id="main">
        <section className="page-heading" aria-labelledby="page-title">
          <div><p className="eyebrow">{t.workspace}</p><h1 id="page-title">{t.headlineFirst}<br className="mobile-break" /> {t.headlineSecond}</h1><p>{t.introduction}</p></div>
          <button className="button button-primary" onClick={() => setDialog({ clock: null })}><Icon name="plus" size={18} />{t.addClock}</button>
        </section>

        {issue && <section className="storage-warning" role="alert"><Icon name="shield" /><div><strong>{t.storageHeading}</strong><p>{t[issue]} {t.storageOverwrite}</p><button className="text-button" onClick={retrySave}>{t.storageSave}</button></div></section>}

        <div className="desk-workspace">
        <div className="overview-grid">
          <section className="home-clock" aria-labelledby="home-title">
            <div className="home-clock-top"><span className="eyebrow light">{t.startingPoint}</span></div>
            <div className="home-city"><h2 id="home-title">{t.mexicoCity}</h2><span>MX</span></div>
            <p className="home-zone">{BASE_ZONE} <span>· {details.offset}</span></p>
            <div role="timer" aria-label={t.mexicoTimer} aria-live="off"><TimeDisplay details={details} large /></div>
            <p className="home-date">{details.date}</p>
            <div className="home-bottom"><span><Icon name="clock" size={15} />{mode === 'now' ? t.baseReference : t.sharedInstant}</span><span className="home-coordinate">{t.coordinates}</span></div>
            <EarthBackdrop active={mode === 'now'} language={language} />
          </section>

          <section className="converter-panel" aria-labelledby="converter-title">
            <div className="panel-title"><span className="small-icon"><Icon name="clock" size={18} /></span><h2 id="converter-title">{t.findMoment}</h2></div>
            <div className="segmented mode-control" role="group" aria-label={t.clockMode}><button aria-pressed={mode === 'now'} onClick={returnToNow}>{t.now}</button><button aria-pressed={mode === 'convert'} onClick={enterConverter}>{t.convertMode}</button></div>
            {mode === 'now' ? <div className="now-content"><h3>{t.liveWorld}</h3><p>{t.nowDescription}</p><button className="text-button" onClick={enterConverter}>{t.planTime} <Icon name="arrow" size={16} /></button><div className="reference-note"><span className="status-dot" />{t.deviceNote}</div></div> :
              <form className="converter-form" onSubmit={convert} noValidate>
                <p>{t.enterTime} <strong>{t.mexicoCity}</strong>.</p>
                <p id="conversion-note" className="sr-only">{t.precisionDescription}</p>
                <div className="datetime-fields"><div><label htmlFor="convert-date">{t.dateLabel}</label><input id="convert-date" type="date" min={MIN_DATE} max={MAX_DATE} required value={draft.date} onChange={(event) => { setDraft({ ...draft, date: event.target.value }); setConversionError(null) }} aria-invalid={Boolean(conversionError)} aria-describedby={conversionError ? 'conversion-error' : 'conversion-note'} /></div><div><label htmlFor="convert-time">{t.timeLabel}</label><input id="convert-time" type="time" step={60} required value={draft.time} onChange={(event) => { setDraft({ ...draft, time: event.target.value }); setConversionError(null) }} aria-invalid={Boolean(conversionError)} aria-describedby={conversionError ? 'conversion-error' : 'conversion-note'} /></div></div>
                {conversionError && <p id="conversion-error" className="field-error" role="alert">{t[conversionError]}</p>}
                <button className="button button-primary convert-button" type="submit">{t.convertAll}<Icon name="arrow" size={16} /></button>
                <p className="conversion-state" role="status">{hasPendingChanges ? t.pendingChanges : t.showingConversion(applied.date, applied.time)}</p>
                <button type="button" className="text-button return-now" onClick={returnToNow}>{t.returnNow}</button>
              </form>}
          </section>
        </div>

        <section className="world-section" aria-labelledby="world-title">
          <div className="section-heading">
            <div><h2 id="world-title">{t.connections} <span className="count-badge">{preferences.clocks.length}</span></h2><p>{mode === 'now' ? t.connectionsNow : t.connectionsConverted}</p></div>
            <div className="world-controls">
              <div className="segmented" role="group" aria-label={t.clockView}>{(['cards', 'timeline'] as const).map((view) => <button type="button" key={view} aria-pressed={clockView === view} onClick={() => update((previous) => ({ ...previous, clockView: view }))}>{view === 'cards' ? t.cardsView : t.timelineView}</button>)}</div>
              <div className="format-control"><span>{t.format}</span><div className="segmented" role="group" aria-label={t.hourFormat}>{(['12', '24'] as const).map((format) => <button key={format} aria-pressed={preferences.hourCycle === format} onClick={() => update((previous) => ({ ...previous, hourCycle: format }))}>{format} h</button>)}</div></div>
            </div>
          </div>
          {clockView === 'timeline' && <TimeComparison clocks={preferences.clocks} instant={instant} hourCycle={preferences.hourCycle} language={language} live={mode === 'now'} error={conversionError} onSelect={selectInstant} onNavigate={navigateDay} onNow={returnToNow} onAdd={() => setDialog({ clock: null })} onEdit={(clock) => setDialog({ clock })} onRemove={removeClock} />}
          {clockView === 'cards' && (preferences.clocks.length ? <ClockCards clocks={preferences.clocks} instant={instant} hourCycle={preferences.hourCycle} language={language} revealId={revealClockId} onEdit={(clock) => setDialog({ clock })} onRemove={removeClock} /> : <div className="empty-state"><Icon name="globe" size={38} /><h3>{t.emptyTitle}</h3><p>{t.emptyDescription}</p><button className="button button-primary" onClick={() => setDialog({ clock: null })}><Icon name="plus" size={18} />{t.addFirstClock}</button></div>)}
        </section>
        </div>
      </main>

      <footer className="site-footer"><div><Icon name="shield" size={17} /><p>{t.privacyDescription}<br />{t.privacyWarning}</p></div><span>{t.footerTagline}</span></footer>
      <p className="sr-only" role="status" aria-live="polite">{noticeText(notice, language)}</p>
      {dialog && <ClockDialog clock={dialog.clock} instant={instant} language={language} onSave={saveClock} onClose={() => setDialog(null)} />}
      {settingsOpen && <SettingsDialog language={language} theme={theme} personalization={preferences.personalization} preset={preferences.palettePreset} issue={issue} onPreview={setPalettePreview} onSave={savePersonalization} onClose={closeSettings} onTransfer={() => { closeSettings(); setTransferOpen(true) }} />}
      {transferOpen && <TransferDialog language={language} preferences={preferences} issue={issue} onImport={replace} onClose={() => setTransferOpen(false)} />}
    </div>
  )
}
