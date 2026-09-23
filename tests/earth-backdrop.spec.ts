import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { messages } from '../src/i18n'
import { PRESETS } from '../src/palette'

for (const theme of ['dark', 'light'] as const) {
  test(`Earth ${theme}: local textures, rotation, pause, conversion and reduced motion`, async ({ page }, testInfo) => {
    const language = theme === 'dark' ? 'en' : 'es'
    const t = messages(language)
    const preferences = { version: 1, clocks: [], hourCycle: '24', theme, language, palettePreset: 'react', personalization: PRESETS.react }
    const errors: string[] = []
    const external: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => {
      if (new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url())
    })
    await page.addInitScript((preferences) => {
      localStorage.setItem('meridiano.preferences.v1', JSON.stringify(preferences))
    }, preferences)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/')
    const canvas = page.locator('.earth-sphere canvas')
    await expect(canvas).toHaveAttribute('data-state', 'ready')
    await expect(page.locator('.earth-backdrop')).toHaveAttribute('aria-hidden', 'true')
    const pixels = () => canvas.evaluate((element: HTMLCanvasElement) => element.toDataURL())
    const initial = await pixels()
    await expect.poll(async () => (await pixels()) !== initial).toBe(true)
    await page.getByRole('button', { name: t.earthPause, exact: true }).click()
    const paused = await pixels()
    const timer = page.getByRole('timer')
    const time = await timer.textContent()
    await expect.poll(() => timer.textContent()).not.toBe(time)
    expect((await pixels()) === paused).toBe(true)
    await page.locator('.home-clock').screenshot({ path: testInfo.outputPath(`earth-${theme}.png`) })
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    await page.getByRole('button', { name: t.earthResume, exact: true }).click()
    await expect.poll(async () => (await pixels()) !== paused).toBe(true)
    await page.getByRole('button', { name: t.convertMode, exact: true }).click()
    await expect(page.getByRole('button', { name: t.earthConversionPaused })).toBeDisabled()
    const converted = await pixels()
    await page.waitForTimeout(250)
    expect((await pixels()) === converted).toBe(true)
    await page.getByRole('button', { name: t.returnNow, exact: true }).click()
    await expect.poll(async () => (await pixels()) !== converted).toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.getByRole('button', { name: t.earthReducedMotion })).toBeDisabled()
    const reduced = await pixels()
    await page.waitForTimeout(250)
    expect((await pixels()) === reduced).toBe(true)
    await page.setViewportSize({ width: 320, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await expect(timer).toBeVisible()
    const sphere = await page.locator('.earth-sphere').boundingBox()
    const card = await page.locator('.home-clock').boundingBox()
    expect(sphere!.x + sphere!.width).toBeGreaterThan(card!.x + card!.width)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(preferences)
    expect(errors).toEqual([])
    expect(external).toEqual([])
  })
}

test('Earth loading failures are visible and do not stop the clocks', async ({ page }) => {
  await page.route('**/earth-blue-marble*.webp', route => route.abort())
  await page.goto('/')
  await expect(page.locator('.earth-sphere canvas')).toHaveAttribute('data-state', 'error')
  await expect(page.locator('.earth-error')).toContainText('Los relojes siguen disponibles')
  const timer = page.getByRole('timer')
  const original = await timer.textContent()
  await expect.poll(() => timer.textContent()).not.toBe(original)
  await expect(page.getByRole('button', { name: 'Añadir reloj', exact: true })).toBeEnabled()
})
