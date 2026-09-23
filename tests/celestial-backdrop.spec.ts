import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { messages } from '../src/i18n'

const sampleClocks = [
  { id: 'demo-ro', zone: 'Europe/Bucharest', label: 'Cliente Europa', caseNumber: 'DEMO-1042' },
  { id: 'demo-br', zone: 'America/Sao_Paulo', label: 'Equipo Brasil' },
]

for (const theme of ['dark', 'light'] as const) {
  test(`Celestial ${theme}: real pixels, independent pause, conversions, themes and data`, async ({ page }, testInfo) => {
    const language = theme === 'dark' ? 'en' : 'es'
    const t = messages(language)
    const preferences = { version: 1, clocks: sampleClocks, hourCycle: '24', theme, language, palettePreset: 'slate' }
    const errors: string[] = [], external: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => {
      if (new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url())
    })
    await page.clock.install({ time: new Date('2026-09-23T21:24:00Z') })
    await page.addInitScript(value => localStorage.setItem('meridiano.preferences.v1', JSON.stringify(value)), preferences)
    await page.goto('/')
    const cards = page.locator('.clock-card')
    const moon = cards.nth(0), sun = cards.nth(1)
    const pixels = (index: number) => cards.nth(index).locator('canvas').evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
    await moon.scrollIntoViewIfNeeded()
    await expect(moon.locator('canvas')).toHaveAttribute('data-state', 'ready')
    await expect(moon.locator('canvas')).toHaveAttribute('data-kind', 'moon')
    const first = await pixels(0)
    await page.clock.runFor(160)
    expect(await pixels(0)).not.toBe(first)
    await moon.getByRole('button', { name: t.celestialPause }).click()
    const paused = await pixels(0)
    const time = await moon.locator('.time-display').textContent()
    await page.clock.runFor(1100)
    await expect(moon.locator('.time-display')).not.toHaveText(time!)
    expect(await pixels(0)).toBe(paused)
    await sun.scrollIntoViewIfNeeded()
    await expect(sun.locator('canvas')).toHaveAttribute('data-state', 'ready')
    await expect(sun.locator('canvas')).toHaveAttribute('data-kind', 'sun')
    const solar = await pixels(1)
    await page.clock.runFor(150)
    expect(await pixels(1)).not.toBe(solar)
    await sun.getByRole('button', { name: t.celestialPause }).click()
    await sun.screenshot({ path: testInfo.outputPath(`sun-${theme}.png`) })
    await moon.scrollIntoViewIfNeeded()
    await moon.screenshot({ path: testInfo.outputPath(`moon-${theme}.png`) })
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    await moon.getByRole('button', { name: t.celestialResume }).click()
    await page.clock.runFor(150)
    expect(await pixels(0)).not.toBe(paused)
    const edit = await moon.getByRole('button', { name: t.editClockName(language === 'en' ? 'Bucharest' : 'Bucarest') }).boundingBox()
    const pause = await moon.getByRole('button', { name: t.celestialPause }).boundingBox()
    expect(pause!.x + pause!.width).toBeLessThan(edit!.x)
    expect(pause!.y).toBeCloseTo(edit!.y, 0)
    const sphere = await moon.locator('.celestial-sphere').boundingBox(), card = await moon.boundingBox()
    expect(sphere!.x + sphere!.width).toBeGreaterThan(card!.x + card!.width)
    expect(sphere!.y).toBeLessThan(card!.y)

    await page.getByRole('button', { name: t.convertMode, exact: true }).click()
    await page.getByLabel(t.dateLabel).fill('2026-09-23')
    await page.getByLabel(t.timeLabel).fill('01:00')
    await page.getByRole('button', { name: t.convertAll }).click()
    await moon.scrollIntoViewIfNeeded()
    await expect(moon.locator('canvas')).toHaveAttribute('data-kind', 'sun')
    await expect(moon.locator('canvas')).toHaveAttribute('data-state', 'ready')
    await expect(moon.getByRole('button', { name: t.celestialConversionPaused })).toBeDisabled()
    const converted = await pixels(0)
    await page.clock.runFor(250)
    expect(await pixels(0)).toBe(converted)
    await sun.scrollIntoViewIfNeeded()
    await expect(sun.locator('canvas')).toHaveAttribute('data-kind', 'moon')
    await page.getByRole('button', { name: t.returnNow, exact: true }).click()
    await sun.scrollIntoViewIfNeeded()
    await expect(sun.getByRole('button', { name: t.celestialResume })).toBeEnabled()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(sun.getByRole('button', { name: t.celestialReducedMotion })).toBeDisabled()
    const reduced = await pixels(1)
    await page.clock.runFor(250)
    expect(await pixels(1)).toBe(reduced)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(preferences)
    await page.getByRole('button', { name: theme === 'dark' ? t.switchToLight : t.switchToDark }).click()
    await sun.scrollIntoViewIfNeeded()
    await expect(sun.locator('canvas')).toHaveAttribute('data-state', 'ready')
    await page.getByRole('button', { name: t.timelineView, exact: true }).click()
    await expect(page.locator('.celestial-sphere canvas')).toHaveCount(0)
    await page.getByRole('button', { name: t.cardsView, exact: true }).click()
    await moon.scrollIntoViewIfNeeded()
    await expect(moon.locator('canvas')).toHaveAttribute('data-state', 'ready')
    await page.setViewportSize({ width: 320, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(errors).toEqual([])
    expect(external).toEqual([])
  })
}

test('Celestial rendering failure is visible without stopping or overwriting clocks', async ({ page }) => {
  const preferences = { version: 1, clocks: [sampleClocks[0]], hourCycle: '24', theme: 'dark', language: 'es' }
  await page.addInitScript(value => {
    localStorage.setItem('meridiano.preferences.v1', JSON.stringify(value))
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = new Proxy(original, {
      apply(target, receiver, args) {
        if (receiver instanceof HTMLCanvasElement && receiver.closest('.celestial-sphere')) return null
        return Reflect.apply(target, receiver, args)
      },
    })
  }, preferences)
  await page.goto('/')
  const card = page.locator('.clock-card')
  await card.scrollIntoViewIfNeeded()
  await expect(card.locator('canvas')).toHaveAttribute('data-state', 'error')
  await expect(card.getByRole('status')).toContainText('El reloj sigue disponible')
  const time = await card.locator('.time-display').textContent()
  await expect.poll(() => card.locator('.time-display').textContent()).not.toBe(time)
  await card.getByRole('button', { name: 'Editar reloj de Bucarest' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(preferences)
})
