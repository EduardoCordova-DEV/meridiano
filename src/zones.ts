import { messages } from './i18n'
import { isValidZone, offsetMinutesAt } from './time'
import type { Language } from './types'
import zoneTable from './zone.tab?raw'
import { TIME_ZONE_ABBREVIATIONS, zoneNames } from './zone-names'

export interface ZoneOption {
  zone: string
  city: string
  country: string
}

interface CatalogZone extends ZoneOption {
  cityEn: string
  countryEn: string
}

const COMMON_ZONES: CatalogZone[] = [
  { zone: 'America/Mexico_City', city: 'Ciudad de México', country: 'México', cityEn: 'Mexico City', countryEn: 'Mexico' },
  { zone: 'America/Tijuana', city: 'Tijuana', country: 'México', cityEn: 'Tijuana', countryEn: 'Mexico' },
  { zone: 'America/Cancun', city: 'Cancún', country: 'México', cityEn: 'Cancun', countryEn: 'Mexico' },
  { zone: 'America/Hermosillo', city: 'Hermosillo', country: 'México', cityEn: 'Hermosillo', countryEn: 'Mexico' },
  { zone: 'America/New_York', city: 'Nueva York', country: 'Estados Unidos', cityEn: 'New York', countryEn: 'United States' },
  { zone: 'America/Chicago', city: 'Chicago', country: 'Estados Unidos', cityEn: 'Chicago', countryEn: 'United States' },
  { zone: 'America/Denver', city: 'Denver', country: 'Estados Unidos', cityEn: 'Denver', countryEn: 'United States' },
  { zone: 'America/Los_Angeles', city: 'Los Ángeles', country: 'Estados Unidos', cityEn: 'Los Angeles', countryEn: 'United States' },
  { zone: 'America/Phoenix', city: 'Phoenix', country: 'Estados Unidos', cityEn: 'Phoenix', countryEn: 'United States' },
  { zone: 'America/Anchorage', city: 'Anchorage', country: 'Estados Unidos', cityEn: 'Anchorage', countryEn: 'United States' },
  { zone: 'Pacific/Honolulu', city: 'Honolulu', country: 'Estados Unidos', cityEn: 'Honolulu', countryEn: 'United States' },
  { zone: 'America/Toronto', city: 'Toronto', country: 'Canadá', cityEn: 'Toronto', countryEn: 'Canada' },
  { zone: 'America/Vancouver', city: 'Vancouver', country: 'Canadá', cityEn: 'Vancouver', countryEn: 'Canada' },
  { zone: 'America/St_Johns', city: 'San Juan de Terranova', country: 'Canadá', cityEn: "St. John's", countryEn: 'Canada' },
  { zone: 'America/Guatemala', city: 'Ciudad de Guatemala', country: 'Guatemala', cityEn: 'Guatemala City', countryEn: 'Guatemala' },
  { zone: 'America/Costa_Rica', city: 'San José', country: 'Costa Rica', cityEn: 'San Jose', countryEn: 'Costa Rica' },
  { zone: 'America/Panama', city: 'Ciudad de Panamá', country: 'Panamá', cityEn: 'Panama City', countryEn: 'Panama' },
  { zone: 'America/Bogota', city: 'Bogotá', country: 'Colombia', cityEn: 'Bogota', countryEn: 'Colombia' },
  { zone: 'America/Lima', city: 'Lima', country: 'Perú', cityEn: 'Lima', countryEn: 'Peru' },
  { zone: 'America/Caracas', city: 'Caracas', country: 'Venezuela', cityEn: 'Caracas', countryEn: 'Venezuela' },
  { zone: 'America/Santiago', city: 'Santiago', country: 'Chile', cityEn: 'Santiago', countryEn: 'Chile' },
  { zone: 'America/Argentina/Buenos_Aires', city: 'Buenos Aires', country: 'Argentina', cityEn: 'Buenos Aires', countryEn: 'Argentina' },
  { zone: 'America/Sao_Paulo', city: 'São Paulo', country: 'Brasil', cityEn: 'São Paulo', countryEn: 'Brazil' },
  { zone: 'Europe/London', city: 'Londres', country: 'Reino Unido', cityEn: 'London', countryEn: 'United Kingdom' },
  { zone: 'Europe/Madrid', city: 'Madrid', country: 'España', cityEn: 'Madrid', countryEn: 'Spain' },
  { zone: 'Europe/Paris', city: 'París', country: 'Francia', cityEn: 'Paris', countryEn: 'France' },
  { zone: 'Europe/Berlin', city: 'Berlín', country: 'Alemania', cityEn: 'Berlin', countryEn: 'Germany' },
  { zone: 'Europe/Rome', city: 'Roma', country: 'Italia', cityEn: 'Rome', countryEn: 'Italy' },
  { zone: 'Europe/Lisbon', city: 'Lisboa', country: 'Portugal', cityEn: 'Lisbon', countryEn: 'Portugal' },
  { zone: 'Europe/Amsterdam', city: 'Ámsterdam', country: 'Países Bajos', cityEn: 'Amsterdam', countryEn: 'Netherlands' },
  { zone: 'Europe/Athens', city: 'Atenas', country: 'Grecia', cityEn: 'Athens', countryEn: 'Greece' },
  { zone: 'Europe/Bucharest', city: 'Bucarest', country: 'Rumanía', cityEn: 'Bucharest', countryEn: 'Romania' },
  { zone: 'Europe/Istanbul', city: 'Estambul', country: 'Turquía', cityEn: 'Istanbul', countryEn: 'Turkey' },
  { zone: 'Africa/Cairo', city: 'El Cairo', country: 'Egipto', cityEn: 'Cairo', countryEn: 'Egypt' },
  { zone: 'Africa/Johannesburg', city: 'Johannesburgo', country: 'Sudáfrica', cityEn: 'Johannesburg', countryEn: 'South Africa' },
  { zone: 'Africa/Lagos', city: 'Lagos', country: 'Nigeria', cityEn: 'Lagos', countryEn: 'Nigeria' },
  { zone: 'Asia/Dubai', city: 'Dubái', country: 'Emiratos Árabes Unidos', cityEn: 'Dubai', countryEn: 'United Arab Emirates' },
  { zone: 'Asia/Kolkata', city: 'Nueva Delhi', country: 'India', cityEn: 'New Delhi', countryEn: 'India' },
  { zone: 'Asia/Kathmandu', city: 'Katmandú', country: 'Nepal', cityEn: 'Kathmandu', countryEn: 'Nepal' },
  { zone: 'Asia/Dhaka', city: 'Daca', country: 'Bangladés', cityEn: 'Dhaka', countryEn: 'Bangladesh' },
  { zone: 'Asia/Yangon', city: 'Yangón', country: 'Myanmar', cityEn: 'Yangon', countryEn: 'Myanmar' },
  { zone: 'Asia/Bangkok', city: 'Bangkok', country: 'Tailandia', cityEn: 'Bangkok', countryEn: 'Thailand' },
  { zone: 'Asia/Singapore', city: 'Singapur', country: 'Singapur', cityEn: 'Singapore', countryEn: 'Singapore' },
  { zone: 'Asia/Hong_Kong', city: 'Hong Kong', country: 'China', cityEn: 'Hong Kong', countryEn: 'China' },
  { zone: 'Asia/Shanghai', city: 'Shanghái', country: 'China', cityEn: 'Shanghai', countryEn: 'China' },
  { zone: 'Asia/Tokyo', city: 'Tokio', country: 'Japón', cityEn: 'Tokyo', countryEn: 'Japan' },
  { zone: 'Asia/Seoul', city: 'Seúl', country: 'Corea del Sur', cityEn: 'Seoul', countryEn: 'South Korea' },
  { zone: 'Australia/Perth', city: 'Perth', country: 'Australia', cityEn: 'Perth', countryEn: 'Australia' },
  { zone: 'Australia/Eucla', city: 'Eucla', country: 'Australia', cityEn: 'Eucla', countryEn: 'Australia' },
  { zone: 'Australia/Adelaide', city: 'Adelaida', country: 'Australia', cityEn: 'Adelaide', countryEn: 'Australia' },
  { zone: 'Australia/Sydney', city: 'Sídney', country: 'Australia', cityEn: 'Sydney', countryEn: 'Australia' },
  { zone: 'Pacific/Auckland', city: 'Auckland', country: 'Nueva Zelanda', cityEn: 'Auckland', countryEn: 'New Zealand' },
  { zone: 'Pacific/Chatham', city: 'Islas Chatham', country: 'Nueva Zelanda', cityEn: 'Chatham Islands', countryEn: 'New Zealand' },
  { zone: 'Pacific/Kiritimati', city: 'Kiritimati', country: 'Kiribati', cityEn: 'Kiritimati', countryEn: 'Kiribati' },
  { zone: 'UTC', city: 'Tiempo universal', country: 'UTC', cityEn: 'Universal time', countryEn: 'UTC' },
]

const CITY_NAMES: Record<string, readonly [string, string?]> = {
  'Africa/Abidjan': ['Abiyán'],
  'Africa/Accra': ['Acra'],
  'Africa/Addis_Ababa': ['Adís Abeba'],
  'Africa/Algiers': ['Argel'],
  'Africa/Dar_es_Salaam': ['Dar es-Salam'],
  'Africa/Khartoum': ['Jartum'],
  'Africa/Kinshasa': ['Kinsasa'],
  'Africa/Mogadishu': ['Mogadiscio'],
  'Africa/Nouakchott': ['Nuakchot'],
  'Africa/Tripoli': ['Trípoli'],
  'Africa/Tunis': ['Túnez'],
  'America/Asuncion': ['Asunción'],
  'America/Belem': ['Belém', 'Belém'],
  'America/El_Salvador': ['San Salvador', 'San Salvador'],
  'America/Havana': ['La Habana'],
  'America/Jamaica': ['Kingston', 'Kingston'],
  'America/Port_of_Spain': ['Puerto España'],
  'America/Puerto_Rico': ['San Juan (Puerto Rico)', 'San Juan (Puerto Rico)'],
  'America/Santo_Domingo': ['Santo Domingo'],
  'America/Scoresbysund': ['Ittoqqortoormiit', 'Ittoqqortoormiit'],
  'Antarctica/DumontDUrville': ["Dumont d'Urville", "Dumont d'Urville"],
  'Asia/Aden': ['Adén'],
  'Asia/Ashgabat': ['Asjabad'],
  'Asia/Baghdad': ['Bagdad'],
  'Asia/Baku': ['Bakú'],
  'Asia/Bishkek': ['Biskek'],
  'Asia/Damascus': ['Damasco'],
  'Asia/Dushanbe': ['Dusambé'],
  'Asia/Ho_Chi_Minh': ['Ciudad Ho Chi Minh', 'Ho Chi Minh City'],
  'Asia/Jakarta': ['Yakarta'],
  'Asia/Jerusalem': ['Jerusalén'],
  'Asia/Macau': ['Macao', 'Macau'],
  'Asia/Muscat': ['Mascate'],
  'Asia/Qatar': ['Doha', 'Doha'],
  'Asia/Riyadh': ['Riad'],
  'Asia/Taipei': ['Taipéi'],
  'Asia/Tashkent': ['Taskent'],
  'Asia/Tbilisi': ['Tiflis'],
  'Asia/Tehran': ['Teherán'],
  'Asia/Thimphu': ['Timbu'],
  'Asia/Ulaanbaatar': ['Ulán Bator'],
  'Asia/Yerevan': ['Ereván'],
  'Atlantic/Canary': ['Islas Canarias', 'Canary Islands'],
  'Atlantic/Cape_Verde': ['Cabo Verde', 'Cape Verde'],
  'Atlantic/Reykjavik': ['Reikiavik'],
  'Australia/Lord_Howe': ['Isla Lord Howe', 'Lord Howe Island'],
  'Europe/Belgrade': ['Belgrado'],
  'Europe/Brussels': ['Bruselas'],
  'Europe/Chisinau': ['Chisináu'],
  'Europe/Copenhagen': ['Copenhague'],
  'Europe/Dublin': ['Dublín'],
  'Europe/Kyiv': ['Kiev', 'Kyiv'],
  'Europe/Ljubljana': ['Liubliana'],
  'Europe/Luxembourg': ['Luxemburgo'],
  'Europe/Moscow': ['Moscú'],
  'Europe/Prague': ['Praga'],
  'Europe/Skopje': ['Skopie'],
  'Europe/Sofia': ['Sofía'],
  'Europe/Stockholm': ['Estocolmo'],
  'Europe/Tirane': ['Tirana'],
  'Europe/Vienna': ['Viena'],
  'Europe/Vilnius': ['Vilna'],
  'Europe/Warsaw': ['Varsovia'],
  'Europe/Zurich': ['Zúrich'],
  'Indian/Maldives': ['Maldivas'],
  'Indian/Mauritius': ['Isla Mauricio', 'Mauritius'],
  'Indian/Reunion': ['Reunión'],
  'Pacific/Easter': ['Isla de Pascua', 'Easter Island'],
  'Pacific/Fiji': ['Fiyi'],
  'Pacific/Galapagos': ['Islas Galápagos', 'Galapagos Islands'],
  'Pacific/Marquesas': ['Islas Marquesas', 'Marquesas Islands'],
  'Pacific/Noumea': ['Numea'],
  'Pacific/Port_Moresby': ['Puerto Moresby'],
  'Pacific/Tahiti': ['Tahití'],
}

const REGIONS: Record<string, string> = {
  Africa: 'África', America: 'América', Antarctica: 'Antártida',
  Arctic: 'Ártico', Asia: 'Asia', Atlantic: 'Atlántico',
  Australia: 'Australia Oceanía Oceania', Europe: 'Europa',
  Indian: 'Océano Índico Indian Ocean', Pacific: 'Pacífico Oceanía Oceania',
}

const countryNames = {
  es: new Intl.DisplayNames(['es-MX'], { type: 'region' }),
  en: new Intl.DisplayNames(['en-US'], { type: 'region' }),
}

// zone.tab supplies geographic names only; Intl/Temporal remain the source of clock rules.
const worldwideZones: CatalogZone[] = zoneTable.split(/\r?\n/)
  .filter((line) => line.trim() && !line.startsWith('#'))
  .map((line) => {
    const [countryCode, , zone] = line.split('\t')
    if (!/^[A-Z]{2}$/.test(countryCode) || !zone) throw new Error('Invalid bundled IANA zone catalog')
    const city = zone.split('/').at(-1)!.replaceAll('_', ' ')
    return {
      zone,
      city: CITY_NAMES[zone]?.[0] ?? city,
      cityEn: CITY_NAMES[zone]?.[1] ?? city,
      country: countryNames.es.of(countryCode) ?? countryCode,
      countryEn: countryNames.en.of(countryCode) ?? countryCode,
    }
  })
  .sort((first, second) => first.zone.localeCompare(second.zone, 'en'))

const byZone = new Map<string, CatalogZone>()
for (const option of [...COMMON_ZONES, ...worldwideZones]) {
  if (!byZone.has(option.zone) && isValidZone(option.zone)) byZone.set(option.zone, option)
}
export const ZONES: CatalogZone[] = [...byZone.values()]

export function zoneInfo(zone: string, language: Language = 'es'): ZoneOption {
  const item = byZone.get(zone)
  if (item) return { zone, city: language === 'en' ? item.cityEn : item.city, country: language === 'en' ? item.countryEn : item.country }
  return {
    zone,
    city: zone.split('/').at(-1)!.replaceAll('_', ' '),
    country: messages(language).ianaZone,
  }
}

const normalize = (text: string) =>
  text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

const searchIndex = ZONES.map((item) => {
  const names = zoneNames(item.zone)
  const text = normalize(`${item.city} ${item.country} ${item.cityEn} ${item.countryEn} ${item.zone} ${REGIONS[item.zone.split('/')[0]] ?? ''} ${names.searchText}`)
  return {
    zone: item.zone,
    text,
    words: new Set(text.split(/[\s/()-]+/)),
    abbreviations: new Set(names.abbreviations.map(normalize)),
  }
})

function offsetFromQuery(query: string): number | null {
  const match = query.trim().replaceAll('−', '-').match(/^(?:gmt|utc)(?:\s*([+-])\s*(\d{1,2})(?::?([0-5]\d))?)?$/i)
  if (!match) return null
  const hours = Number(match[2] ?? 0)
  if (hours > 23) return null
  const minutes = hours * 60 + Number(match[3] ?? 0)
  return match[1] === '-' ? -minutes : minutes
}

export function searchZones(query: string, language: Language = 'es', instant: number = Date.now()): ZoneOption[] {
  const offset = offsetFromQuery(query)
  const terms = normalize(query).replace(/[()/]/g, ' ').trim().split(/\s+/)
  return searchIndex.filter((item) =>
    offset !== null
      ? offsetMinutesAt(instant, item.zone) === offset
      : terms.every((term) => TIME_ZONE_ABBREVIATIONS.has(term)
        ? item.abbreviations.has(term) || (terms.length > 1 && item.words.has(term))
        : item.text.includes(term)),
  ).map((item) => zoneInfo(item.zone, language))
}
