import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { messages } from '../src/i18n'
import { PALETTE_KEYS, PRESET_IDS, PRESETS } from '../src/palette'

const storageKey = 'meridiano.preferences.v1'
const rgb = (hex: string) => `rgb(${[1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16)).join(', ')})`

async function issues(page: Page) {
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  return result.violations.map((violation) => ({
    rule: violation.id,
    nodes: violation.nodes.map((node) => ({ target: node.target, message: node.failureSummary })),
  }))
}

for (const theme of ['light', 'dark'] as const) {
  test(`personalización ${theme}: todas las paletas, accesibilidad, conversión y persistencia`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    const language = theme === 'light' ? 'es' : 'en'
    const t = messages(language)
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('/')
    if (language === 'en') await page.getByRole('button', { name: 'ES / EN: Cambiar a inglés' }).click()
    await page.getByRole('button', { name: t.convertMode, exact: true }).click()
    await page.getByLabel(t.dateLabel).fill('2026-12-31')
    await page.getByLabel(t.timeLabel).fill('23:30')
    await page.getByRole('button', { name: t.convertAll }).click()
    const before = await page.evaluate((key) => localStorage.getItem(key), storageKey)
    await page.getByRole('button', { name: t.settings, exact: true }).click()
    const dialog = page.getByRole('dialog', { name: t.personalization })
    await expect(dialog.getByRole('button', { name: t.closeDialog })).toBeFocused()
    for (const id of PRESET_IDS) {
      await dialog.getByRole('button', { name: t.presetNames[id], exact: true }).click()
      await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS[id][theme].background))
      await expect(page.locator('.home-clock')).toHaveCSS('background-color', rgb(PRESETS[id][theme].hero))
      expect(await issues(page), `${id} ${theme} dialog`).toEqual([])
      const opposite = theme === 'light' ? 'dark' : 'light'
      await dialog.getByRole('button', { name: theme === 'light' ? t.darkMode : t.lightMode, exact: true }).click()
      await expect(dialog.getByRole('button', { name: t.presetNames[id], exact: true })).toHaveAttribute('aria-pressed', 'true')
      await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS[id][opposite].background))
      await dialog.getByRole('button', { name: theme === 'light' ? t.lightMode : t.darkMode, exact: true }).click()
    }
    await dialog.getByRole('button', { name: 'React Theme', exact: true }).click()
    await dialog.evaluate((element) => { element.scrollTop = 0 })
    await page.screenshot({ path: testInfo.outputPath(`personalization-${theme}.png`), fullPage: true })
    expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(before)
    await dialog.getByRole('button', { name: t.saveChanges }).click()
    await expect(page.getByLabel(t.dateLabel)).toHaveValue('2026-12-31')
    await expect(page.getByRole('article').last()).toContainText('14:30')
    await page.getByRole('button', { name: theme === 'light' ? t.switchToDark : t.switchToLight }).click()
    await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.react[theme === 'light' ? 'dark' : 'light'].background))
    await page.getByRole('button', { name: theme === 'light' ? t.switchToLight : t.switchToDark }).click()
    expect(await issues(page), 'dashboard').toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`custom-dashboard-${theme}.png`), fullPage: true })
    await page.getByLabel(t.dateLabel).fill('')
    await page.getByRole('button', { name: t.convertAll }).click()
    expect(await issues(page), 'conversion error').toEqual([])
    await page.getByRole('button', { name: t.addClock, exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: t.addClock }).click()
    expect(await issues(page), 'clock dialog error').toEqual([])
    await page.getByLabel(t.searchLocation).fill('Romania')
    await page.getByLabel(t.cityOrZone).selectOption('Europe/Bucharest')
    await page.getByLabel(t.clientLabel).fill('Mi cliente')
    await page.getByRole('dialog').getByRole('button', { name: t.addClock }).click()
    await page.reload()
    await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.react[theme].background))
    const nextPage = page.getByRole('button', { name: t.nextClocks })
    if (await nextPage.count()) await nextPage.click()
    await expect(page.getByText('Mi cliente', { exact: true })).toBeVisible()
    const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey)
    expect(stored.personalization[theme]).toEqual(PRESETS.react[theme])
    expect(stored.palettePreset).toBe('react')
    expect(stored.clocks).toHaveLength(4)
    expect(errors).toEqual([])
  })

  test(`personalización libre ${theme}: fondos opuestos, errores, controles y 320px`, async ({ page }) => {
    test.setTimeout(120_000)
    await page.emulateMedia({ colorScheme: theme })
    await page.goto('/')
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click()
    const dialog = page.getByRole('dialog')
    for (const variant of [
      { background: '#000000', surface: '#ffffff' },
      { background: '#ffffff', surface: '#000000' },
      { background: '#777777', surface: '#777777' },
    ]) {
      for (const key of PALETTE_KEYS) await dialog.locator(`#palette-${key}`).fill('#777777')
      await dialog.locator('#palette-background').fill(variant.background)
      await dialog.locator('#palette-surface').fill(variant.surface)
      await expect(dialog).toHaveCSS('background-color', rgb(variant.surface))
      expect(await issues(page), JSON.stringify(variant)).toEqual([])
    }
    await dialog.locator('#palette-background').fill('#12')
    await expect(dialog.getByRole('button', { name: 'Guardar cambios' })).toBeDisabled()
    await expect(dialog.getByRole('alert')).toContainText('colores inválidos')
    expect(await issues(page), 'invalid HEX').toEqual([])
    await dialog.locator('#palette-background').fill('#000000')
    await dialog.locator('#palette-surface').fill('#ffffff')
    await page.setViewportSize({ width: 320, height: 800 })
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true)
    await dialog.getByRole('button', { name: 'Guardar cambios' }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    expect(await issues(page), 'opposite surfaces dashboard').toEqual([])
    await page.getByRole('button', { name: 'Convertir horario', exact: true }).click()
    await expect(page.getByLabel('Fecha en CDMX')).toHaveCSS('color-scheme', 'light')
    await page.getByLabel('Fecha en CDMX').fill('')
    await page.getByRole('button', { name: 'Convertir en todos los relojes' }).click()
    expect(await issues(page), 'opposite surfaces conversion').toEqual([])
    await page.getByRole('button', { name: 'Añadir reloj', exact: true }).click()
    expect(await issues(page), 'opposite surfaces clock dialog').toEqual([])
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await page.getByRole('button', { name: 'Rosa', exact: true }).click()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Ajustes', exact: true })).toBeFocused()
    await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await page.getByRole('button', { name: 'Restaurar colores de este modo' }).click()
    await page.getByRole('button', { name: 'Guardar cambios' }).click()
    await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.meridiano[theme].background))
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).personalization, storageKey)).toBeUndefined()
  })
}

test('paleta heredada: conserva React al alternar modos, recargar y seguir el sistema', async ({ page }) => {
  const original = {
    version: 1, theme: 'dark', hourCycle: '12',
    clocks: [{ id: 'client', zone: 'Europe/Bucharest', label: 'Cliente anterior' }],
    personalization: { dark: PRESETS.react.dark },
  }
  await page.goto('/')
  await page.evaluate(({ key, preferences }) => localStorage.setItem(key, JSON.stringify(preferences)), { key: storageKey, preferences: original })
  await page.reload()
  await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.react.dark.background))
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), storageKey)).toEqual(original)
  await page.getByRole('button', { name: 'Cambiar a modo claro' }).click()
  await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.react.light.background))
  await page.reload()
  await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.react.light.background))
  await expect(page.getByText('Cliente anterior', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: '12 h', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
  await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.react.dark.background))
  await page.evaluate((key) => {
    const preferences = JSON.parse(localStorage.getItem(key)!)
    delete preferences.theme
    localStorage.setItem(key, JSON.stringify(preferences))
  }, storageKey)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.reload()
  await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.react.dark.background))
  const saved = await page.evaluate((key) => localStorage.getItem(key), storageKey)
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.react.light.background))
  await page.emulateMedia({ colorScheme: 'dark' })
  await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.react.dark.background))
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBe(saved)
})

test('personalización: fondo guardado antes de React y error visible de almacenamiento', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click()
  await page.getByRole('button', { name: 'Océano', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  let release = () => {}
  const gate = new Promise<void>((resolve) => { release = resolve })
  await page.route('**/src/main.tsx', async (route) => { await gate; await route.continue() })
  const navigation = page.reload({ waitUntil: 'domcontentloaded' })
  try {
    await expect(page.locator('#root')).toBeEmpty()
    await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.ocean.light.background))
  } finally {
    release()
    await navigation
    await page.unroute('**/src/main.tsx')
  }
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException('Blocked', 'SecurityError') }
  })
  await page.reload()
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click()
  await page.getByRole('button', { name: 'Rosa', exact: true }).click()
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  await expect(page.getByRole('alert')).toContainText('No se pudieron guardar')
  expect(await issues(page)).toEqual([])
  await page.reload()
  await expect(page.locator('html')).toHaveCSS('background-color', rgb(PRESETS.ocean.light.background))
})
