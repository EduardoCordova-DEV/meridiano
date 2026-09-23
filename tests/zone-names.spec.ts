import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { messages } from '../src/i18n'

for (const language of ['es', 'en'] as const) {
  test(`horarios regionales ${language}: ET, siglas ambiguas, DST y persistencia`, async ({ page }, testInfo) => {
    const t = messages(language)
    const theme = language === 'en' ? 'dark' : 'light'
    const key = 'meridiano.preferences.v1'
    const original = {
      version: 1, hourCycle: '24', language, theme,
      clocks: [{ id: 'legacy', zone: 'Asia/Kathmandu', label: 'Cliente Nepal' }],
    }
    const errors: string[] = []
    const external: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    page.on('request', (request) => {
      if (new URL(request.url()).hostname !== '127.0.0.1') external.push(request.url())
    })
    await page.addInitScript(({ key, original }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(original))
    }, { key, original })
    await page.goto('/')
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)).toEqual(original)
    await page.getByRole('button', { name: t.convertMode, exact: true }).click()
    await page.getByLabel(t.dateLabel).fill('2026-07-15')
    await page.getByLabel(t.timeLabel).fill('09:00')
    await page.getByRole('button', { name: t.convertAll }).click()
    await page.getByRole('button', { name: t.addClock, exact: true }).click()
    const search = page.getByLabel(t.searchLocation)
    await search.fill('ET')
    const etGroup = page.getByRole('group', { name: /ET \/ EST \/ EDT/ })
    await expect(etGroup.getByRole('option', { name: /America\/New_York/ })).toHaveCount(1)
    await expect(etGroup.getByRole('option', { name: /America\/Toronto/ })).toHaveCount(1)
    await expect(page.getByRole('option', { name: /Europe\/Bucharest/ })).toHaveCount(0)
    await page.screenshot({ path: testInfo.outputPath(`et-search-${language}.png`), fullPage: true })

    for (const [query, zones] of [
      ['CST', ['America/Chicago', 'America/Havana', 'Asia/Shanghai']],
      ['IST', ['Asia/Kolkata', 'Asia/Jerusalem', 'Europe/Dublin']],
      ['BST', ['Europe/London', 'Asia/Dhaka']],
      ['PT', ['America/Los_Angeles']],
      ['CET', ['Europe/Berlin']],
      ['EET', ['Europe/Bucharest']],
      ['JST', ['Asia/Tokyo']],
      ['AEDT', ['Australia/Sydney']],
      ['ACWST', ['Australia/Eucla']],
      ['NZDT', ['Pacific/Auckland']],
    ] as const) {
      await search.fill(query)
      for (const zone of zones) await expect(page.locator(`option[value="${zone}"]`)).toHaveCount(1)
    }
    await search.fill('Eastern Time (ET)')
    await page.getByLabel(t.cityOrZone).selectOption('America/New_York')
    await expect(page.locator('#selected-zone')).toContainText('ET / EST / EDT')
    await expect(page.locator('#selected-zone')).toContainText('UTC−04:00')
    await expect(page.getByText(t.namedZoneNote)).toBeVisible()
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    await page.getByLabel(t.clientLabel).fill('Equipo ET')
    await page.getByRole('dialog').getByRole('button', { name: t.addClock }).click()
    const city = language === 'es' ? 'Nueva York' : 'New York'
    const card = page.getByRole('article', { name: t.clockName(city, 'Equipo ET') })
    await expect(card).toContainText('11:00')
    await expect(card).toContainText('ET / EST / EDT')
    await page.getByLabel(t.dateLabel).fill('2026-01-15')
    await page.getByRole('button', { name: t.convertAll }).click()
    await expect(card).toContainText('10:00')
    await expect(card).toContainText('UTC−05:00')
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)
    expect(stored).toMatchObject({ theme, language, hourCycle: '24' })
    expect(stored.clocks).toEqual([original.clocks[0], { id: expect.any(String), zone: 'America/New_York', label: 'Equipo ET' }])
    await page.reload()
    await expect(card).toContainText('ET / EST / EDT')
    await page.getByRole('button', { name: t.timelineView, exact: true }).click()
    await expect(page.getByRole('rowheader', { name: new RegExp(city) })).toContainText('ET / EST / EDT')
    await page.setViewportSize({ width: 320, height: 800 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    expect(errors).toEqual([])
    expect(external).toEqual([])
  })
}
