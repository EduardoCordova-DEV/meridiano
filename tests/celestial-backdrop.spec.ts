import { expect, test } from '@playwright/test'
import type { Locator } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { messages } from '../src/i18n'
import { PRESETS } from '../src/palette'

const sampleClocks = [
  { id: 'demo-ro', zone: 'Europe/Bucharest', label: 'Cliente Europa', caseNumber: 'DEMO-1042' },
  { id: 'demo-br', zone: 'America/Sao_Paulo', label: 'Equipo Brasil' },
]

async function expectImage(card: Locator, isDay: boolean) {
  await card.scrollIntoViewIfNeeded()
  const image = card.locator(`.${isDay ? 'daylight' : 'nighttime'}-backdrop img`)
  await expect(image).toHaveAttribute('data-state', 'ready')
  expect(await image.evaluate((image: HTMLImageElement) => ({
    loaded: image.complete,
    size: [image.naturalWidth, image.naturalHeight],
    local: new URL(image.currentSrc).origin === location.origin,
  }))).toEqual({ loaded: true, size: isDay ? [755, 501] : [1200, 800], local: true })
  await expect(image).toHaveAttribute('alt', '')
  await expect(image).toHaveCSS('object-fit', 'cover')
  await expect(card.locator('canvas, .celestial-toggle')).toHaveCount(0)
  await expect(card.getByRole('button')).toHaveCount(2)
  const bounds = await image.boundingBox(), cardBounds = await card.boundingBox()
  expect(bounds!.width).toBeCloseTo(cardBounds!.width - 2, 0)
  expect(bounds!.height).toBeCloseTo(cardBounds!.height - 2, 0)
}

for (const theme of ['dark', 'light'] as const) {
  test(`Backgrounds ${theme}: local day/night images, conversions, themes and preserved data`, async ({ page }, testInfo) => {
    const language = theme === 'dark' ? 'en' : 'es'
    const t = messages(language)
    const preferences = { version: 1, clocks: sampleClocks, hourCycle: '24', theme, language, palettePreset: 'xbox25', personalization: PRESETS.xbox25 }
    const errors: string[] = [], external: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      if (new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url())
    })
    await page.clock.install({ time: new Date('2026-09-23T21:24:00Z') })
    await page.addInitScript(value => localStorage.setItem('meridiano.preferences.v1', JSON.stringify(value)), preferences)
    await page.goto('/')
    const cards = page.locator('.clock-card')
    const night = cards.nth(0), day = cards.nth(1)
    for (const [card, isDay] of [[night, false], [day, true]] as const) {
      await expectImage(card, isDay)
      const time = await card.locator('.time-display').textContent()
      await page.clock.runFor(1100)
      await expect(card.locator('.time-display')).not.toHaveText(time!)
      await card.screenshot({ path: testInfo.outputPath(`${isDay ? 'daylight' : 'nighttime'}-${theme}.png`) })
    }
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    await page.getByRole('button', { name: t.convertMode, exact: true }).click()
    await page.getByLabel(t.dateLabel).fill('2026-09-23')
    await page.getByLabel(t.timeLabel).fill('01:00')
    await page.getByRole('button', { name: t.convertAll }).click()
    await expectImage(night, true)
    await expectImage(day, false)
    await page.getByRole('button', { name: t.returnNow, exact: true }).click()
    await expectImage(night, false)
    await expectImage(day, true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expectImage(night, false)
    await expectImage(day, true)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(preferences)
    await page.getByRole('button', { name: theme === 'dark' ? t.switchToLight : t.switchToDark }).click()
    await expectImage(night, false)
    await expectImage(day, true)
    await page.getByRole('button', { name: t.timelineView, exact: true }).click()
    await expect(page.locator('.celestial-backdrop')).toHaveCount(0)
    await page.getByRole('button', { name: t.cardsView, exact: true }).click()
    await expectImage(night, false)
    await page.setViewportSize({ width: 320, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expectImage(night, false)
    await expectImage(day, true)
    expect(errors).toEqual([])
    expect(external).toEqual([])
  })
}

for (const isDay of [true, false]) {
  test(`${isDay ? 'Daytime' : 'Nighttime'} image failure keeps clocks and editing available`, async ({ page }) => {
    const clock = sampleClocks[isDay ? 1 : 0]
    const preferences = { version: 1, clocks: [clock], hourCycle: '24', theme: 'dark', language: 'es' }
    await page.clock.install({ time: new Date('2026-09-23T21:24:00Z') })
    await page.addInitScript(value => localStorage.setItem('meridiano.preferences.v1', JSON.stringify(value)), preferences)
    const imageRoute = `**/${isDay ? 'daylight' : 'nighttime'}-city*.webp`
    await page.route(imageRoute, route => route.abort('failed'))
    await page.goto('/')
    const card = page.locator('.clock-card')
    await card.scrollIntoViewIfNeeded()
    await expect(card.getByRole('status')).toHaveText(isDay ? messages('es').daylightUnavailable : messages('es').nighttimeUnavailable)
    await expect(card.locator('img, canvas, .celestial-toggle')).toHaveCount(0)
    expect(await card.evaluate(card => card.scrollHeight <= card.clientHeight + 1 && card.scrollWidth <= card.clientWidth + 1)).toBe(true)
    const cardBounds = await card.boundingBox(), errorBounds = await card.getByRole('status').boundingBox()
    expect(errorBounds!.y + errorBounds!.height).toBeLessThanOrEqual(cardBounds!.y + cardBounds!.height)
    const time = await card.locator('.time-display').textContent()
    await page.clock.runFor(1100)
    await expect(card.locator('.time-display')).not.toHaveText(time!)
    await card.getByRole('button', { name: isDay ? 'Editar reloj de São Paulo' : 'Editar reloj de Bucarest' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(preferences)
    await page.unroute(imageRoute)
    await page.reload()
    await expectImage(card, isDay)
  })
}

test('Day/night image boundaries follow each clock in conversions and real time', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-09-23T21:58:00Z') })
  await page.clock.pauseAt(new Date('2026-09-23T21:59:59Z'))
  await page.addInitScript(value => localStorage.setItem('meridiano.preferences.v1', JSON.stringify(value)), {
    version: 1, clocks: [sampleClocks[1]], hourCycle: '24', theme: 'light', language: 'es',
  })
  await page.goto('/')
  const card = page.locator('.clock-card')
  await expectImage(card, true)
  await page.clock.runFor(1100)
  await expectImage(card, false)
  await page.getByRole('button', { name: 'Convertir horario', exact: true }).click()
  await page.getByLabel('Fecha en CDMX').fill('2026-09-23')
  for (const cycle of ['12 h', '24 h']) {
    await page.getByRole('button', { name: cycle, exact: true }).click()
    for (const [time, isDay] of [['03:59', false], ['04:00', true], ['15:59', true], ['16:00', false]] as const) {
      await page.getByLabel('Hora en CDMX (24 h)').fill(time)
      await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
      await expect(card).toHaveAttribute('data-daytime', String(isDay))
      await expectImage(card, isDay)
    }
  }
})
