import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { messages } from '../src/i18n'
import { PRESETS } from '../src/palette'

const key = 'meridiano.preferences.v1'

async function issues(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  return result.violations.map((violation) => ({
    rule: violation.id,
    nodes: violation.nodes.map((node) => ({ target: node.target, message: node.failureSummary })),
  }))
}

for (const theme of ['light', 'dark'] as const) {
  test(`comparador ${theme}: ciudades, husos, selección, teclado, calendario y persistencia`, async ({ page }, testInfo) => {
    test.setTimeout(90_000)
    const language = theme === 'light' ? 'es' : 'en'
    const t = messages(language)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.addInitScript(({ key, theme, language, palette }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
        version: 1, hourCycle: '24', language, theme, clockView: 'timeline',
        palettePreset: 'react', personalization: palette,
        clocks: [
          { id: 'ny', zone: 'America/New_York', label: 'Cliente USA' },
          { id: 'ro', zone: 'Europe/Bucharest', label: 'Cliente Romania' },
          { id: 'np', zone: 'Asia/Kathmandu', label: 'Cliente Nepal' },
        ],
      }))
    }, { key, theme, language, palette: PRESETS.react })
    await page.goto('/')
    const comparator = page.getByRole('region', { name: t.timelineTitle, exact: true })
    await expect(page.getByRole('button', { name: t.timelineView, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(comparator.getByRole('rowheader')).toHaveCount(4)
    await expect(comparator.getByRole('columnheader')).toHaveCount(25)
    await page.getByRole('button', { name: t.convertMode, exact: true }).click()
    await page.getByLabel(t.dateLabel).fill('2026-12-31')
    await page.getByLabel(t.timeLabel).fill('09:30')
    await page.getByRole('button', { name: t.convertAll }).click()
    const nepal = comparator.locator('tr[data-zone="Asia/Kathmandu"]')
    await expect(nepal.getByRole('rowheader')).toContainText('21:15')
    await expect(nepal.getByRole('rowheader')).toContainText('UTC+05:45')
    await nepal.locator('button[data-slot-index="9"]').click()
    await expect(page.getByLabel(t.timeLabel)).toHaveValue('09:00')
    await expect(nepal.getByRole('rowheader')).toContainText('20:45')
    await expect(comparator.locator('tr[data-zone="Europe/Bucharest"]').getByRole('rowheader')).toContainText('17:00')
    await nepal.locator('button[data-slot-index="9"]').press('ArrowRight')
    await expect(page.getByLabel(t.timeLabel)).toHaveValue('10:00')
    await expect(nepal.locator('button[data-slot-index="10"]')).toBeFocused()
    await nepal.locator('button[data-slot-index="10"]').press('End')
    await expect(page.getByLabel(t.timeLabel)).toHaveValue('23:00')
    await expect(nepal.getByRole('rowheader')).toContainText(language === 'es' ? '+1 día' : '+1 day')
    expect(await issues(page)).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`comparison-${theme}.png`), fullPage: true })

    await comparator.getByRole('button', { name: t.nextDate }).click()
    await expect(page.getByLabel(t.dateLabel)).toHaveValue('2027-01-01')
    await expect(page.getByLabel(t.timeLabel)).toHaveValue('23:00')
    await comparator.getByRole('button', { name: t.previousDate }).click()
    await expect(page.getByLabel(t.dateLabel)).toHaveValue('2026-12-31')
    await page.getByRole('button', { name: t.cardsView, exact: true }).click()
    await expect(page.getByRole('article', { name: /Cliente Nepal/ })).toContainText('10:45')
    await page.getByRole('button', { name: t.timelineView, exact: true }).click()
    await page.getByRole('button', { name: '12 h', exact: true }).click()
    await expect(nepal.getByRole('rowheader')).toContainText('10:45')
    expect(await issues(page)).toEqual([])
    await comparator.getByRole('button', { name: t.returnNow }).click()
    await expect(page.getByRole('group', { name: t.clockMode }).getByRole('button', { name: t.now, exact: true })).toHaveAttribute('aria-pressed', 'true')
    await comparator.getByRole('button', { name: t.editClockName(language === 'es' ? 'Katmandú' : 'Kathmandu') }).click()
    await page.getByLabel(t.clientLabel).fill('Equipo Nepal')
    await page.getByRole('button', { name: t.saveChanges }).click()
    await page.reload()
    await expect(comparator).toBeVisible()
    await expect(comparator.getByText('Equipo Nepal', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: '12 h', exact: true })).toHaveAttribute('aria-pressed', 'true')
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).clockView, key)).toBe('timeline')
    await page.setViewportSize({ width: 320, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect(await comparator.locator('.timeline-scroll').evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true)
    expect(await issues(page)).toEqual([])
    expect(errors).toEqual([])
  })
}

test('comparador: cambios históricos, límites y contraste con colores personalizados', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/')
  const custom = { ...PRESETS.react.light, background: '#000000', surface: '#ffffff', text: '#777777', muted: '#777777', accent: '#777777', hero: '#777777', highlight: '#777777' }
  await page.evaluate(({ key, custom }) => localStorage.setItem(key, JSON.stringify({
    version: 1, hourCycle: '24', theme: 'dark', clockView: 'timeline', palettePreset: 'custom',
    personalization: { dark: custom }, clocks: [{ id: 'ny', zone: 'America/New_York', label: '' }],
  })), { key, custom })
  await page.reload()
  await page.getByRole('button', { name: 'Convertir horario', exact: true }).click()
  await page.getByLabel('Fecha en CDMX').fill('2022-04-03')
  await page.getByLabel('Hora en CDMX (24 h)').fill('00:00')
  await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
  const comparator = page.getByRole('region', { name: 'Un día, todas tus ciudades', exact: true })
  await expect(comparator.getByRole('columnheader')).toHaveCount(24)
  await expect(comparator.locator('.timeline-base-row').getByRole('button', { name: /^Elegir 02:00,/ })).toHaveCount(0)
  await page.getByLabel('Fecha en CDMX').fill('2022-10-30')
  await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
  await expect(comparator.getByRole('columnheader')).toHaveCount(26)
  const base = comparator.locator('.timeline-base-row')
  await base.locator('button[data-slot-index="0"]').press('ArrowRight')
  await expect(base.getByRole('rowheader')).toContainText('UTC−05:00')
  await base.locator('button[data-slot-index="1"]').press('ArrowRight')
  await expect(base.getByRole('rowheader')).toContainText('UTC−06:00')
  await expect(comparator.locator('tr[data-zone="America/New_York"]').getByRole('rowheader')).toContainText('03:00')
  expect(await issues(page)).toEqual([])
  await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
  await expect(comparator.getByRole('alert')).toContainText('ambigua')
  await page.getByLabel('Fecha en CDMX').fill('2100-12-31')
  await page.getByLabel('Hora en CDMX (24 h)').fill('09:00')
  await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
  await expect(comparator.getByRole('button', { name: 'Día siguiente en CDMX' })).toBeDisabled()
  await page.getByLabel('Fecha en CDMX').fill('1970-01-01')
  await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
  await expect(comparator.getByRole('button', { name: 'Día anterior en CDMX' })).toBeDisabled()
  await comparator.getByRole('button', { name: 'Quitar reloj de Nueva York' }).click()
  await expect(comparator.getByRole('rowheader')).toHaveCount(1)
  await comparator.getByRole('button', { name: 'Añadir un reloj de cliente' }).click()
  await page.getByLabel('Buscar ubicación').fill('Romania')
  await page.getByLabel('Ciudad o zona').selectOption('Europe/Bucharest')
  await page.getByRole('dialog').getByRole('button', { name: 'Añadir reloj' }).click()
  await expect(comparator.getByRole('rowheader')).toHaveCount(2)
  await expect(comparator.locator('tr[data-zone="Europe/Bucharest"]').getByRole('rowheader')).toContainText('Bucarest')
})
