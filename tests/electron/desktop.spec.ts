import { _electron as electron, expect, test } from '@playwright/test'
import type { ElectronApplication, Page } from '@playwright/test'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { PRESETS } from '../../src/palette'

const key = 'meridiano.preferences.v1'
const imported = {
  version: 1, clocks: [
    { id: 'client-et', zone: 'America/New_York', label: 'Cliente ET', caseNumber: '00042' },
    { id: 'client-nepal', zone: 'Asia/Kathmandu', label: 'Cliente Nepal' },
  ], hourCycle: '24', theme: 'dark', language: 'es', palettePreset: 'react', personalization: PRESETS.react, clockView: 'cards',
}

async function transfer(page: Page) {
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click()
  await page.getByRole('button', { name: 'Importar / exportar', exact: true }).click()
}
async function selectJson(page: Page, value: unknown) {
  await page.getByLabel('Importar JSON', { exact: true }).setInputFiles({
    name: 'preferences.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)),
  })
}

test('ventana nativa offline: aislamiento, conversión, datos, exportación y reapertura', async ({}, testInfo) => {
  await mkdir(dirname(testInfo.outputDir), { recursive: true })
  const profile = await mkdtemp(join(testInfo.outputDir + '-profile-'))
  const packaged = testInfo.project.name === 'packaged'
  const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  delete env.ELECTRON_RUN_AS_NODE
  const errors: string[] = []
  const remote: string[] = []
  let app: ElectronApplication | undefined
  async function launch() {
    app = await electron.launch({
      ...(packaged ? { executablePath: resolve('release', 'win-unpacked', 'Meridiano Desk App.exe') } : {}),
      args: [...(packaged ? [] : ['.']), `--user-data-dir=${profile}`],
      env,
    })
    app.on('window', (page) => {
      page.on('pageerror', (error) => errors.push(error.message))
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
      page.on('request', (request) => {
        if (/^(?:https?|wss?):/.test(request.url())) remote.push(request.url())
      })
    })
    const page = await app.firstWindow()
    await page.getByRole('heading', { level: 1 }).waitFor()
    await expect(page.locator('.earth-sphere canvas')).toHaveAttribute('data-state', 'ready')
    await app.context().setOffline(true)
    const cdp = await app.context().newCDPSession(page)
    await cdp.send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Tokyo' })
    await page.reload()
    await expect(page.locator('.earth-sphere canvas')).toHaveAttribute('data-state', 'ready')
    return page
  }
  try {
    let page = await launch()
    expect(page.url()).toBe('meridiano://app/')
    await expect(page.locator('.add-clock-card, .help-strip')).toHaveCount(0)
    await expect(page.getByRole('contentinfo')).toContainText('Sin cuentas, APIs ni backend.')
    await expect(page.getByRole('article')).toHaveCount(3)
    await page.screenshot({ path: testInfo.outputPath('dashboard-cards.png'), fullPage: true })
    expect(await page.evaluate(() => ({
      node: typeof Reflect.get(window, 'require'),
      process: typeof Reflect.get(window, 'process'),
      bridge: typeof Reflect.get(window, 'electron'),
      secure: isSecureContext,
      saved: localStorage.getItem('meridiano.preferences.v1'),
    }))).toEqual({ node: 'undefined', process: 'undefined', bridge: 'undefined', secure: true, saved: null })
    const settings = await app!.evaluate(({ BrowserWindow, app }) => {
      const window = BrowserWindow.getAllWindows()[0]
      const renderer = app.getAppMetrics().find((metric) => metric.pid === window.webContents.getOSProcessId())
      return { packaged: app.isPackaged, sandbox: renderer?.sandboxed, profile: app.getPath('userData'), visible: window.isVisible() }
    })
    expect(settings).toEqual({ packaged, sandbox: true, profile, visible: true })
    const originalTime = await page.getByRole('timer').textContent()
    await page.getByRole('button', { name: 'Pausar animación de la Tierra' }).click()
    await expect.poll(() => page.getByRole('timer').textContent()).not.toBe(originalTime)
    await page.getByRole('button', { name: 'Añadir reloj', exact: true }).click()
    await expect(page.getByLabel(/Ciudad o zona/).locator('option')).toHaveCount(420)
    await page.getByLabel('Buscar ubicación').fill('ET')
    await expect(page.getByRole('option', { name: /America\/New_York/ })).toBeAttached()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()

    await transfer(page)
    await selectJson(page, imported)
    await expect(page.getByText('Confirmar reemplazo', { exact: true })).toBeVisible()
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull()
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await selectJson(page, imported)
    await page.getByRole('button', { name: 'Reemplazar mis preferencias' }).click()
    await expect(page.getByText('Preferencias importadas y guardadas.')).toBeVisible()
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)).toEqual(imported)
    await selectJson(page, { ...imported, personalization: { dark: { text: 'bad' } } })
    await expect(page.getByRole('dialog').getByRole('alert')).toContainText('No se cambió ningún dato')
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), key)).toEqual(imported)
    await expect(page.getByRole('button', { name: 'Reemplazar mis preferencias' })).toHaveCount(0)

    const exportedPath = testInfo.outputPath('preferences.json')
    const download = await app!.evaluateHandle(({ session }, target) => {
      const result = { state: 'pending', title: '' }
      session.defaultSession.once('will-download', (_event, item) => {
        result.title = item.getSaveDialogOptions().title ?? ''
        item.setSavePath(target)
        item.once('done', (_event, state) => { result.state = state })
      })
      return result
    }, exportedPath)
    await page.getByRole('button', { name: 'Exportar JSON' }).click()
    await expect.poll(() => download.evaluate((result) => result.state)).toBe('completed')
    expect(await download.evaluate((result) => result.title)).toBe('Exportar preferencias / Export preferences')
    await download.dispose()
    expect(JSON.parse(await readFile(exportedPath, 'utf8'))).toEqual(imported)
    await page.getByRole('button', { name: 'Cerrar diálogo' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    await expect(page.locator('.case-badge')).toHaveText('00042')
    await expect(page.locator('.clock-card .case-label')).toHaveCount(0)
    const celestial = page.locator('.clock-card').first().locator('.celestial-sphere canvas')
    await expect(celestial).toHaveAttribute('data-state', 'ready')
    const originalPixels = await celestial.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
    await expect.poll(() => celestial.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).not.toBe(originalPixels)
    await page.locator('.clock-card').first().getByRole('button', { name: 'Pausar animación de esta tarjeta' }).click()
    const pausedPixels = await celestial.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())
    const runningClock = await page.locator('.clock-card').first().locator('.time-display').textContent()
    await expect.poll(() => page.locator('.clock-card').first().locator('.time-display').textContent()).not.toBe(runningClock)
    expect(await celestial.evaluate((canvas: HTMLCanvasElement) => canvas.toDataURL())).toBe(pausedPixels)
    await page.getByRole('button', { name: 'Convertir horario', exact: true }).click()
    await page.getByLabel('Fecha en CDMX').fill('2026-07-15')
    await page.getByLabel('Hora en CDMX (24 h)').fill('09:00')
    await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
    await expect(page.getByRole('timer')).toHaveText('09:00:00')
    await expect(page.getByRole('article', { name: 'Reloj de Nueva York, Cliente ET' })).toContainText('11:00')
    await expect(page.getByRole('article', { name: 'Reloj de Katmandú, Cliente Nepal' })).toContainText('20:45')
    await expect(page.getByRole('article', { name: 'Reloj de Nueva York, Cliente ET' }).locator('canvas')).toHaveAttribute('data-kind', 'sun')
    await expect(page.getByRole('article', { name: 'Reloj de Katmandú, Cliente Nepal' }).locator('canvas')).toHaveAttribute('data-kind', 'moon')
    await expect(page.getByRole('article', { name: 'Reloj de Katmandú, Cliente Nepal' }).locator('canvas')).toHaveAttribute('data-state', 'ready')
    await page.screenshot({ path: testInfo.outputPath('celestial-cards.png'), fullPage: true })
    await page.getByLabel('Fecha en CDMX').fill('2026-01-15')
    await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
    await expect(page.getByRole('article', { name: 'Reloj de Nueva York, Cliente ET' })).toContainText('10:00')
    await page.getByRole('button', { name: 'Comparador', exact: true }).click()
    await expect(page.getByRole('rowheader', { name: /Nueva York/ })).toContainText('Caso')
    await page.getByRole('button', { name: '12 h', exact: true }).click()
    await page.getByRole('button', { name: 'ES / EN: Cambiar a inglés' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('.add-clock-card, .help-strip')).toHaveCount(0)
    await page.getByRole('button', { name: 'Switch to light mode' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await page.screenshot({ path: testInfo.outputPath('desktop.png'), fullPage: true })
    const saved = await page.evaluate((key) => localStorage.getItem(key), key)
    await app!.close()
    app = undefined
    page = await launch()
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(saved)
    await expect(page.getByRole('button', { name: '12 h', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('rowheader', { name: /New York/ })).toContainText('00042')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.getByRole('group', { name: 'Clock mode' }).getByRole('button', { name: 'Now', exact: true })).toHaveAttribute('aria-pressed', 'true')
    await page.getByRole('button', { name: 'ES / EN: Switch to Spanish' }).click()
    await transfer(page)
    await selectJson(page, { version: 1, clocks: [], hourCycle: '24' })
    await page.getByRole('button', { name: 'Reemplazar mis preferencias' }).click()
    await page.getByRole('button', { name: 'Cerrar diálogo' }).click()
    await expect(page.getByText('Tu mundo empieza aquí')).toBeVisible()
    await app!.close()
    app = undefined
    page = await launch()
    await expect(page.getByText('Tu mundo empieza aquí')).toBeVisible()
    await page.evaluate(() => window.open('https://example.invalid/'))
    expect(app!.windows()).toHaveLength(1)
    const navigation = await app!.evaluateHandle(({ BrowserWindow }) => {
      const result = { prevented: false }
      BrowserWindow.getAllWindows()[0].webContents.once('will-navigate', (event) => {
        result.prevented = event.defaultPrevented
      })
      return result
    })
    await page.evaluate(() => {
      const link = document.createElement('a')
      link.href = 'https://example.invalid/'
      document.body.append(link)
      link.click()
      link.remove()
    })
    await expect.poll(() => navigation.evaluate((result) => result.prevented)).toBe(true)
    await navigation.dispose()
    // Electron cancels before commit; CDP's locator navigation wait can remain pending.
    const retainedDocument = await app!.evaluate(async ({ BrowserWindow }) => {
      const contents = BrowserWindow.getAllWindows()[0].webContents
      return { url: contents.getURL(), heading: await contents.executeJavaScript('document.querySelector("h1")?.textContent') }
    })
    expect(retainedDocument).toEqual({ url: 'meridiano://app/', heading: 'Un mismo instante. Muchos lugares.' })
    expect(errors).toEqual([])
    expect(remote).toEqual([])
  } finally {
    await app?.close()
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 })
  }
})
