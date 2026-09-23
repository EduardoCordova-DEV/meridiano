import { Temporal } from '@js-temporal/polyfill'
import { LOCALES, messages } from './i18n'
import type { HourCycle, Language } from './types'

export const BASE_ZONE = 'America/Mexico_City'
export const MIN_DATE = '1970-01-01'
export const MAX_DATE = '2100-12-31'

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(zone: string, mode: HourCycle | 'date', language: Language) {
  const key = `${zone}:${mode}:${language}`
  let value = formatters.get(key)
  if (!value) {
    value = new Intl.DateTimeFormat(LOCALES[language], {
      timeZone: zone,
      ...(mode === 'date'
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' } as const
        : { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: mode === '24' ? 'h23' : 'h12', timeZoneName: 'short' } as const),
    })
    formatters.set(key, value)
  }
  return value
}

export function isValidZone(zone: string): boolean {
  if (zone !== 'UTC' && !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)+$/.test(zone)) return false
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format(0)
    return true
  } catch (error) {
    if (!(error instanceof RangeError)) throw error
    return false
  }
}

export type ConversionErrorCode = 'incompleteDateTime' | 'dateOutOfRange' | 'invalidDateTime' | 'ambiguousDateTime' | 'conversionFailed'

export class ConversionError extends Error {
  constructor(readonly code: ConversionErrorCode) {
    super(messages('es')[code])
    this.name = 'ConversionError'
  }
}

export function mexicoInputToInstant(date: string, time: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    throw new ConversionError('incompleteDateTime')
  }
  if (date < MIN_DATE || date > MAX_DATE) {
    throw new ConversionError('dateOutOfRange')
  }
  let local: Temporal.PlainDateTime
  try {
    local = Temporal.PlainDateTime.from(`${date}T${time}`, { overflow: 'reject' })
  } catch (error) {
    if (!(error instanceof RangeError)) throw error
    throw new ConversionError('invalidDateTime')
  }
  try {
    return local.toZonedDateTime(BASE_ZONE, { disambiguation: 'reject' }).epochMilliseconds
  } catch (error) {
    if (!(error instanceof RangeError)) throw error
    throw new ConversionError('ambiguousDateTime')
  }
}

export function mexicoInputAt(instant: number) {
  const local = Temporal.Instant.fromEpochMilliseconds(instant).toZonedDateTimeISO(BASE_ZONE)
  return {
    date: local.toPlainDate().toString(),
    time: `${String(local.hour).padStart(2, '0')}:${String(local.minute).padStart(2, '0')}`,
  }
}

export function offsetMinutesAt(instant: number, zone: string): number {
  return Temporal.Instant.fromEpochMilliseconds(instant).toZonedDateTimeISO(zone).offsetNanoseconds / 60_000_000_000
}

export function mexicoDaySlots(date: string): number[] {
  const day = Temporal.PlainDate.from(date)
  const start = day.toZonedDateTime(BASE_ZONE).epochMilliseconds
  const end = day.add({ days: 1 }).toZonedDateTime(BASE_ZONE).epochMilliseconds
  const slots: number[] = []
  // Advance real instants, not wall-clock labels: historical days can have 23 or 25 hours.
  for (let instant = start; instant < end; instant += 3_600_000) slots.push(instant)
  return slots
}

export function shiftMexicoDate(date: string, days: -1 | 1): string {
  return Temporal.PlainDate.from(date).add({ days }).toString()
}

function durationLabel(minutes: number) {
  const absolute = Math.abs(minutes)
  const hours = Math.floor(absolute / 60)
  const remainder = Math.round(absolute % 60)
  return [hours ? `${hours} h` : '', remainder ? `${remainder} min` : ''].filter(Boolean).join(' ')
}

export function differenceLabel(minutes: number, language: Language = 'es'): string {
  const t = messages(language)
  if (minutes === 0) return t.sameTime
  return `${minutes > 0 ? '+' : '−'}${durationLabel(minutes)} ${t.compareBase}`
}

export function utcOffsetLabel(minutes: number): string {
  const absolute = Math.abs(minutes)
  return `UTC${minutes < 0 ? '−' : '+'}${String(Math.floor(absolute / 60)).padStart(2, '0')}:${String(Math.round(absolute % 60)).padStart(2, '0')}`
}

export function getClockDetails(instant: number, zone: string, hourCycle: HourCycle, language: Language = 'es') {
  const t = messages(language)
  const temporal = Temporal.Instant.fromEpochMilliseconds(instant)
  const local = temporal.toZonedDateTimeISO(zone)
  const base = temporal.toZonedDateTimeISO(BASE_ZONE)
  const parts = formatter(zone, hourCycle, language).formatToParts(instant)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''
  const dayDifference = local.toPlainDate().since(base.toPlainDate(), { largestUnit: 'day' }).days
  const offsetMinutes = local.offsetNanoseconds / 60_000_000_000
  return {
    time: `${part('hour')}:${part('minute')}`,
    seconds: part('second'),
    period: part('dayPeriod'),
    zoneName: part('timeZoneName'),
    date: formatter(zone, 'date', language).format(instant),
    isoDate: local.toPlainDate().toString(),
    dayDifference,
    dayLabel: dayDifference === 0 ? t.sameDay : t.dayDifference(dayDifference),
    offset: utcOffsetLabel(offsetMinutes),
    difference: differenceLabel((local.offsetNanoseconds - base.offsetNanoseconds) / 60_000_000_000, language),
    isDay: local.hour >= 7 && local.hour < 19,
    isBusinessHour: local.hour >= 9 && local.hour < 18,
  }
}
