import { expect, test } from '@playwright/test'
import { messages } from '../src/i18n'

for (const language of ['es', 'en'] as const) {
  test(`modo ${language}: reloj vivo, conversión congelada y regreso a ahora sin indicador eliminado`, async ({ page }) => {
    const t = messages(language)
    await page.addInitScript((language) => localStorage.setItem('meridiano.preferences.v1',
      JSON.stringify({ version: 1, clocks: [], hourCycle: '24', language })), language)
    await page.goto('/')
    await expect(page.locator('.live-pill')).toHaveCount(0)
    const timer = page.getByRole('timer')
    const initial = await timer.textContent()
    await expect.poll(() => timer.textContent()).not.toBe(initial)
    await page.getByRole('button', { name: t.convertMode, exact: true }).click()
    await page.getByLabel(t.dateLabel).fill('2026-07-15')
    await page.getByLabel(t.timeLabel).fill('09:30')
    await page.getByRole('button', { name: t.convertAll }).click()
    await expect(timer).toHaveText('09:30:00')
    await page.waitForTimeout(1200)
    await expect(timer).toHaveText('09:30:00')
    await page.getByRole('button', { name: t.returnNow, exact: true }).click()
    await expect(page.getByRole('button', { name: t.now, exact: true })).toHaveAttribute('aria-pressed', 'true')
    const resumed = await timer.textContent()
    await expect.poll(() => timer.textContent()).not.toBe(resumed)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const reduced = await timer.textContent()
    await expect.poll(() => timer.textContent()).not.toBe(reduced)
  })
}
