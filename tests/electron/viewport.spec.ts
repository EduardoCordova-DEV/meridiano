import { _electron as electron, expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

async function expectFitted(page: Page) {
  await expect.poll(() => page.evaluate(() => {
    const clipped = Array.from(document.querySelectorAll('.desktop-titlebar, .site-header, .page-heading, .overview-grid, .world-section, .site-footer, .clock-pagination')).filter((element) => {
      const bounds = element.getBoundingClientRect()
      return bounds.top < -1 || bounds.bottom > innerHeight + 1 || bounds.left < -1 || bounds.right > innerWidth + 1
    }).map((element) => element.className)
    const homeClipped = Array.from(document.querySelectorAll('.home-clock > :not(.earth-backdrop)')).filter((element) => {
      const bounds = element.getBoundingClientRect()
      const parent = element.parentElement!.getBoundingClientRect()
      return bounds.top < parent.top || bounds.bottom > parent.bottom
    }).map((element) => element.className)
    return {
      x: document.documentElement.scrollWidth > innerWidth,
      y: document.documentElement.scrollHeight <= innerHeight ? false : {
        viewport: innerHeight, content: document.documentElement.scrollHeight,
        sections: Array.from(document.querySelectorAll('.desk-workspace, .overview-grid, .world-section, .site-footer'), element => ({
          name: element.className, top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom,
        })),
      },
      offset: scrollY, clipped, homeClipped,
    }
  })).toEqual({ x: false, y: false, offset: 0, clipped: [], homeClipped: [] })
}

async function expectUniformCards(page: Page) {
  expect(await page.evaluate(() => {
    const host = document.querySelector<HTMLElement>('.clock-pages')!
    const grid = host.querySelector<HTMLElement>('.clock-grid')!
    const cards = Array.from(host.querySelectorAll<HTMLElement>('.clock-card'))
    const width = Math.min(400, host.getBoundingClientRect().width)
    const minimumHeight = innerHeight <= 900 ? 300 : 320
    const first = cards[0].getBoundingClientRect()
    const footer = cards[0].querySelector('.card-footer')!.getBoundingClientRect().bottom
    return {
      display: getComputedStyle(grid).display,
      errors: cards.flatMap((card) => {
        const rect = card.getBoundingClientRect()
        const failures = []
        if (Math.abs(rect.width - width) > 1 || rect.height < minimumHeight) failures.push({ expected: { width, minimumHeight }, actual: { width: rect.width, height: rect.height } })
        if (Math.abs(rect.top - first.top) > 1 || Math.abs(rect.bottom - first.bottom) > 1) failures.push('Unequal card bounds')
        if (Math.abs(card.querySelector('.card-footer')!.getBoundingClientRect().bottom - footer) > 1) failures.push('Unequal footers')
        if (card.scrollHeight > card.clientHeight + 1 || card.scrollWidth > card.clientWidth + 1) failures.push('Overflow in normal card')
        if (getComputedStyle(card).overflowY !== 'visible') failures.push('Card must not scroll or hide content')
        for (const element of card.querySelectorAll('.card-top, .client-label, h3, .iana-zone, .time-display, .card-date, .card-footer, .card-offset')) {
          const bounds = element.getBoundingClientRect()
          if (bounds.top < rect.top || bounds.bottom > rect.bottom || bounds.left < rect.left || bounds.right > rect.right) failures.push(`Clipped card content: ${element.className}`)
        }
        if (getComputedStyle(card).flexGrow !== '0') failures.push('Card must not grow')
        const edit = card.querySelector('.card-actions button')!.getBoundingClientRect()
        const background = card.dataset.daytime === 'true' ? '.daylight-backdrop img' : '.nighttime-backdrop img'
        if (!card.querySelector(background)) failures.push('Missing day/night image')
        if (card.querySelector('canvas, .celestial-toggle')) failures.push('Static card must not have animation or a pause control')
        const badge = card.querySelector('.case-badge')?.getBoundingClientRect()
        if (badge && badge.right >= edit.left) failures.push('Case badge must not cover controls')
        if (card.querySelector('.day-icon')) failures.push('Duplicate day/night icon')
        const minimumSizes: Array<[string, number]> = [
          ['h3', 22], ['.time-display', 46], ['.client-label', 13],
          ['.iana-zone', 12], ['.card-date', 12], ['.difference', 12], ['.day-badge', 12], ['.card-offset', 12],
        ]
        for (const [selector, size] of minimumSizes) {
          if (parseFloat(getComputedStyle(card.querySelector(selector)!).fontSize) < size) failures.push(`Small text: ${selector}`)
        }
        return failures
      }),
    }
  })).toEqual({ display: 'flex', errors: [] })
}

test('se ajusta a la ventana sin scroll general y pagina sin perder relojes', async ({}, testInfo) => {
  test.setTimeout(180_000)
  await mkdir(dirname(testInfo.outputDir), { recursive: true })
  const profile = await mkdtemp(testInfo.outputDir + '-profile-')
  const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  delete env.ELECTRON_RUN_AS_NODE
  const packaged = testInfo.project.name === 'packaged'
  const app = await electron.launch({
    ...(packaged ? { executablePath: resolve(process.env.MERIDIANO_PACKAGED_EXECUTABLE ?? 'release\\win-unpacked\\Meridiano Desk App.exe') } : {}),
    args: [...(packaged ? [] : ['.']), `--user-data-dir=${profile}`], env,
  })
  try {
    const page = await app.firstWindow()
    await page.clock.install({ time: new Date('2026-09-24T18:29:00Z') })
    await page.clock.pauseAt(new Date('2026-09-24T18:29:01Z'))
    // Pixel animation is covered by the desktop smoke; keep geometry sweeps deterministic.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectFitted(page)
    expect(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isMaximized())).toBe(true)
    const window = await app.browserWindow(page)
    // The native overlay is part of the client area, including the 600px minimum.
    const dimensions = [[1440, 1000], [1280, 900], [1024, 768], [800, 900], [800, 801], [800, 600]]
    for (const [width, height] of dimensions) {
      await window.evaluate((window) => window.unmaximize())
      await expect.poll(() => window.evaluate((window) => window.isMaximized())).toBe(false)
      await window.evaluate((window, { width, height }) => window.setContentSize(width, height), { width, height })
      // Windows rounds client/frame sizes at fractional scales, including the minimum height.
      const nativeSize = await window.evaluate((window) => window.getContentSize())
      expect(Math.abs(nativeSize[0] - width)).toBeLessThanOrEqual(2)
      expect(Math.abs(nativeSize[1] - height)).toBeLessThanOrEqual(2)
      await expect.poll(() => page.evaluate(() => [innerWidth, innerHeight])).toEqual(nativeSize)
      await expectFitted(page)
      for (const count of [0, 1, 2, 3, 30]) {
        const preferences = {
          version: 1, hourCycle: '12', theme: height > 760 ? 'light' : 'dark', language: 'es',
          clocks: Array.from({ length: count }, (_, index) => ({
            id: `client-${index}`, zone: 'America/New_York', label: `Cliente ${index}`,
            ...(index % 2 === 0 ? { caseNumber: `0000-${index}` } : {}),
          })),
        }
        await page.evaluate((value) => localStorage.setItem('meridiano.preferences.v1', JSON.stringify(value)), preferences)
        await page.reload()
        await expect(page.locator('.earth-sphere canvas')).toHaveAttribute('data-state', 'ready')
        await expectFitted(page)
        expect(await page.locator('.clock-card, .converter-panel').evaluateAll((elements) =>
          elements.filter((element) => element.scrollHeight > element.clientHeight + 1).map((element) => ({ name: element.className, content: element.scrollHeight, height: element.clientHeight })))).toEqual([])
        if (count) {
          if (count === 2) await page.screenshot({ path: testInfo.outputPath(`uniform-${width}-${height}.png`), fullPage: true })
          const seen = new Set<string>()
          do {
            await expectUniformCards(page)
            for (const label of await page.locator('.client-label').allTextContents()) seen.add(label)
            await expectFitted(page)
            if (!(await page.getByRole('button', { name: 'Relojes siguientes' }).count()) ||
                await page.getByRole('button', { name: 'Relojes siguientes' }).isDisabled()) break
            const previousPage = await page.locator('.clock-pagination [role="status"]').textContent()
            await page.getByRole('button', { name: 'Relojes siguientes' }).click()
            await expect(page.locator('.clock-pagination [role="status"]')).not.toHaveText(previousPage!)
          } while (seen.size <= count)
          expect(seen.size).toBe(count)
        } else {
          await expect(page.getByRole('button', { name: 'Añadir mi primer reloj' })).toBeVisible()
        }
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(preferences)
      }
      await page.getByRole('button', { name: 'Convertir horario', exact: true }).click()
      await page.getByLabel('Fecha en CDMX').fill('2026-12-31')
      await page.getByLabel('Hora en CDMX (24 h)').fill('23:30')
      await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
      await expect(page.getByRole('timer')).toHaveText('11:30:00p.m.')
      await expectFitted(page)
      await page.getByRole('button', { name: 'ES / EN: Cambiar a inglés' }).click()
      await expectFitted(page)
      await expectUniformCards(page)
      await page.getByRole('button', { name: '24 h', exact: true }).click()
      await expect(page.getByRole('timer')).toHaveText('23:30:00')
      await expectUniformCards(page)
      await page.getByRole('button', { name: 'Compare', exact: true }).click()
      await expectFitted(page)
      await expect(page.getByRole('rowheader')).toHaveCount(31)
      await page.getByRole('rowheader').last().getByRole('button', { name: 'Edit clock for New York' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      await page.keyboard.press('Escape')
      await expectFitted(page)
      await page.getByRole('button', { name: 'Cards', exact: true }).click()
      await page.getByRole('button', { name: 'Settings', exact: true }).click()
      await page.getByRole('button', { name: 'Xbox 25th Anniversary', exact: true }).click()
      await page.getByRole('button', { name: 'Save changes', exact: true }).click()
      await expectFitted(page)
      await page.screenshot({ path: testInfo.outputPath(`fit-${width}-${height}.png`), fullPage: true })
    }
    await page.getByRole('button', { name: '12 h', exact: true }).click()
    await expectFitted(page)
    await page.getByRole('button', { name: 'Add clock', exact: true }).click()
    await page.getByLabel('City or time zone').selectOption('Pacific/Marquesas')
    await page.getByLabel('Client label').fill('Cliente '.repeat(7).padEnd(60, 'X'))
    await page.getByLabel('Case number').fill('0123456789'.repeat(6))
    await page.getByRole('dialog').getByRole('button', { name: 'Add clock', exact: true }).click()
    const added = page.getByRole('article', { name: /Clock for Marquesas Islands/ })
    await expect(added).toBeVisible()
    await expect(added.locator('.case-badge')).toHaveText('0123456789'.repeat(6))
    const longCardSize = await added.boundingBox()
    expect(longCardSize!.width).toBeCloseTo(400, 0)
    expect(longCardSize!.height).toBeGreaterThanOrEqual(300)
    await expectUniformCards(page)
    await expect(added.locator('.card-offset')).toBeInViewport()
    await expectFitted(page)
    await added.getByRole('button', { name: 'Edit clock for Marquesas Islands' }).click()
    await page.getByLabel('Client label').fill('Editado')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(added).toContainText('Editado')
    await added.getByRole('button', { name: 'Remove clock for Marquesas Islands' }).click()
    await expect(page.getByText('Cliente 29', { exact: true })).toBeVisible()
    await expectFitted(page)
    await page.evaluate(() => localStorage.setItem('meridiano.preferences.v1', 'original sin modificar'))
    await page.reload()
    await expect(page.locator('.storage-warning')).toBeVisible()
    await expectUniformCards(page)
    const offset = page.locator('.clock-card .card-offset').first()
    await offset.scrollIntoViewIfNeeded()
    await expect(offset).toBeInViewport()
    expect(await page.locator('.clock-card').first().evaluate(card => card.scrollTop)).toBe(0)
    await page.getByRole('button', { name: 'Convertir horario', exact: true }).click()
    await page.getByLabel('Fecha en CDMX').fill('')
    await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
    await expect(page.locator('#conversion-error')).toContainText('fecha y una hora completas')
    await page.getByRole('button', { name: 'Volver a ahora' }).click()
    await expectUniformCards(page)
    expect(await page.evaluate(() => localStorage.getItem('meridiano.preferences.v1'))).toBe('original sin modificar')
    expect(errors).toEqual([])
  } finally {
    await app.close()
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 })
  }
})
