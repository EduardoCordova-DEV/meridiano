import { memo, useState } from 'react'
import { messages } from './i18n'
import type { Language } from './types'

const daylightImage = new URL('./assets/daylight-city.webp', import.meta.url).href
const nighttimeImage = new URL('./assets/nighttime-city.webp', import.meta.url).href

function BackgroundImage({ isDay, language }: { isDay: boolean; language: Language }) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const t = messages(language)
  return <>
    <div className={`celestial-backdrop ${isDay ? 'daylight' : 'nighttime'}-backdrop`} aria-hidden="true">
      {status !== 'error' && <img src={isDay ? daylightImage : nighttimeImage} alt="" decoding="async" loading="lazy"
        data-state={status} onLoad={() => setStatus('ready')} onError={() => {
          console.error(`Unable to load the ${isDay ? 'daytime' : 'nighttime'} card background`)
          setStatus('error')
        }} />}
    </div>
    {status === 'error' && <p className="celestial-error" role="status">{isDay ? t.daylightUnavailable : t.nighttimeUnavailable}</p>}
  </>
}

export const CelestialBackdrop = memo(function CelestialBackdrop({ isDay, language }: {
  isDay: boolean; language: Language
}) {
  return <BackgroundImage key={isDay ? 'day' : 'night'} isDay={isDay} language={language} />
})
