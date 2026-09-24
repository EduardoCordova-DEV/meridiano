import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function expectCardsWithoutScroll(page: Page) {
  await expect.poll(() => page.locator('.clock-card').evaluateAll(cards => cards.flatMap(card => {
    const bounds = card.getBoundingClientRect()
    const problems = []
    if (card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1) {
      problems.push({ card: card.getAttribute('aria-label'), content: [card.scrollWidth, card.scrollHeight], available: [card.clientWidth, card.clientHeight] })
    }
    for (const element of card.querySelectorAll('.card-top, .client-label, h3, .iana-zone, .time-display, .card-date, .card-footer, .card-offset, .celestial-error')) {
      const rect = element.getBoundingClientRect()
      if (rect.top < bounds.top || rect.bottom > bounds.bottom || rect.left < bounds.left || rect.right > bounds.right) {
        problems.push(`Clipped content: ${element.className || element.tagName}`)
      }
    }
    return problems
  }))).toEqual([])
}

test('las tarjetas muestran caso, fecha larga y hora de 12/24 h sin scroll interno', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  test.skip(testInfo.project.name !== 'desktop')
  await page.clock.install({ time: new Date('2026-09-24T18:29:00Z') })
  await page.clock.pauseAt(new Date('2026-09-24T18:29:01Z'))
  await page.goto('/')
  const dimensions = [[1440, 1000], [1280, 900], [800, 900], [1024, 768], [800, 600], [760, 540]]
  for (const [width, height] of dimensions) {
    await page.setViewportSize({ width, height })
    for (const language of ['es', 'en']) {
      for (const hourCycle of ['12', '24']) {
        const preferences = {
          version: 1, hourCycle, language, theme: 'dark', palettePreset: 'xbox25',
          clocks: Array.from({ length: hourCycle === '12' ? 1 : 3 }, (_, index) => ({
            id: `regression-${index}`, zone: 'America/New_York', label: 'Cliente de ejemplo', caseNumber: 'DEMO-2026-1042',
          })),
        }
        await page.evaluate(value => localStorage.setItem('meridiano.preferences.v1', JSON.stringify(value)), preferences)
        await page.reload()
        await expect(page.locator('.clock-card').first()).toBeVisible()
        await expectCardsWithoutScroll(page)
        const layout = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
          sections: Array.from(document.querySelectorAll('.site-header, .page-heading, .desk-workspace, .home-clock, .converter-panel, .world-section, .clock-pages, .site-footer'), element => ({
            name: element.className, top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom,
          })),
        }))
        expect(layout.width, JSON.stringify({ width, height, language, hourCycle, layout })).toBeLessThanOrEqual(width)
        expect(layout.height, JSON.stringify({ width, height, language, hourCycle, layout })).toBeLessThanOrEqual(height)
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(preferences)
      }
    }
  }
})

test('los textos largos amplían por igual la fila sin recortes ni scroll dentro de las tarjetas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop')
  const preferences = {
    version: 1, hourCycle: '12', language: 'es', theme: 'light',
    clocks: [
      { id: 'short', zone: 'America/New_York', label: 'Cliente de ejemplo' },
      { id: 'long', zone: 'Pacific/Marquesas', label: 'Cliente '.repeat(7).padEnd(60, 'X'), caseNumber: '0123456789'.repeat(6) },
      { id: 'zone', zone: 'America/Argentina/ComodRivadavia', label: 'Otra conexión' },
    ],
  }
  await page.clock.install({ time: new Date('2026-09-24T18:29:00Z') })
  await page.addInitScript(value => localStorage.setItem('meridiano.preferences.v1', JSON.stringify(value)), preferences)
  for (const [width, height] of [[1440, 1000], [1280, 900], [800, 600], [760, 540], [390, 844], [320, 800]]) {
    await page.setViewportSize({ width, height })
    await page.goto('/')
    await expect(page.locator('.clock-card').first()).toBeVisible()
    do {
      await expectCardsWithoutScroll(page)
      const heights = await page.locator('.clock-card').evaluateAll(cards => cards.map(card => card.getBoundingClientRect().height))
      if (width >= 760) expect(Math.max(...heights) - Math.min(...heights)).toBeLessThanOrEqual(1)
      if (!(await page.getByRole('button', { name: 'Relojes siguientes' }).count()) ||
        await page.getByRole('button', { name: 'Relojes siguientes' }).isDisabled()) break
      await page.getByRole('button', { name: 'Relojes siguientes' }).click()
    } while (true)
    await page.screenshot({ path: testInfo.outputPath(`cards-no-scroll-${width}-${height}.png`), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(preferences)
  }
})
