import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { messages } from '../src/i18n'
import { PRESETS } from '../src/palette'

for (const language of ['es', 'en'] as const) {
  test(`caso opcional ${language}: badge, edición, persistencia y contraste`, async ({ page }, testInfo) => {
    const t = messages(language)
    const theme = language === 'es' ? 'light' : 'dark'
    const key = 'meridiano.preferences.v1'
    const original = {
      version: 1, hourCycle: '24', language, theme, palettePreset: 'react', personalization: PRESETS.react,
      clocks: [{ id: 'legacy', zone: 'Europe/London', label: '000123456789 - Cliente anterior' }],
    }
    await page.addInitScript(({ key, original }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(original))
    }, { key, original })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/')
    await expect(page.locator('.case-badge')).toHaveCount(0)
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)).toEqual(original)
    await page.getByRole('button', { name: t.addClock, exact: true }).click()
    const input = page.getByLabel(t.caseNumber)
    await expect(input).toBeEmpty()
    await expect(input).toHaveAttribute('maxlength', '60')
    await expect(input).not.toHaveAttribute('required', '')
    await page.getByLabel(t.searchLocation).fill('Romania')
    await page.getByLabel(t.cityOrZone).selectOption('Europe/Bucharest')
    const caseNumber = '0000123456789012'
    await input.fill(caseNumber)
    await page.getByLabel(t.clientLabel).fill('Equipo Europa')
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    await page.getByRole('dialog').getByRole('button', { name: t.addClock }).click()
    const city = language === 'es' ? 'Bucarest' : 'Bucharest'
    const card = page.getByRole('article', { name: t.clockName(city, 'Equipo Europa') })
    await expect(card.locator('.case-badge')).toHaveText(caseNumber)
    await expect(card.locator('.case-label')).toHaveCount(0)
    await card.screenshot({ path: testInfo.outputPath(`case-badge-${language}.png`) })
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)
    expect(stored.clocks).toEqual([original.clocks[0], { id: expect.any(String), zone: 'Europe/Bucharest', label: 'Equipo Europa', caseNumber }])
    expect(stored).toMatchObject({ theme, language, hourCycle: '24', palettePreset: 'react', personalization: PRESETS.react })
    await page.reload()
    await expect(card.locator('.case-badge')).toHaveText(caseNumber)
    await card.getByRole('button', { name: t.editClockName(city) }).click()
    await expect(input).toHaveValue(caseNumber)
    await input.fill('CASE-CANCELLED')
    await page.getByRole('button', { name: t.cancel }).click()
    await expect(card.locator('.case-badge')).toHaveText(caseNumber)
    await card.getByRole('button', { name: t.editClockName(city) }).click()
    const longCase = 'CASE-' + 'A'.repeat(55)
    await input.fill(longCase)
    await page.getByRole('button', { name: t.saveChanges }).click()
    await page.setViewportSize({ width: 320, height: 800 })
    await expect(card.locator('.case-badge')).toHaveText(longCase)
    expect(await card.locator('.case-badge').evaluate((badge) => badge.scrollWidth <= badge.clientWidth)).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    await page.getByRole('button', { name: theme === 'light' ? t.switchToDark : t.switchToLight }).click()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    await page.getByRole('button', { name: t.timelineView, exact: true }).click()
    const row = page.getByRole('rowheader', { name: new RegExp(city) })
    await expect(row.locator('.case-badge')).toHaveText(longCase)
    await expect(row.locator('.case-label')).toHaveText(t.caseLabel)
    await expect(row.locator('.case-label + .case-badge')).toHaveText(longCase)
    expect(await row.locator('.case-badge').evaluate((badge) => badge.scrollWidth <= badge.clientWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    await row.getByRole('button', { name: t.editClockName(city) }).click()
    await input.fill('')
    await page.getByRole('button', { name: t.saveChanges }).click()
    await expect(page.locator('.case-badge')).toHaveCount(0)
    await expect(page.locator('.case-label')).toHaveCount(0)
    await page.reload()
    await expect(page.locator('.case-badge')).toHaveCount(0)
    const withoutCase = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)
    expect(withoutCase.clocks).toEqual([original.clocks[0], { id: stored.clocks[1].id, zone: 'Europe/Bucharest', label: 'Equipo Europa' }])
    expect(errors).toEqual([])
  })
}
