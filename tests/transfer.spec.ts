import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { messages } from '../src/i18n'

for (const language of ['es', 'en'] as const) {
  test(`transferencia ${language}: consentimiento, teclado, JSON inválido y accesibilidad`, async ({ page }) => {
    const t = messages(language)
    const original = { version: 1, clocks: [{ id: 'original', zone: 'UTC', label: 'Original', caseNumber: '0001' }], hourCycle: '24', language }
    await page.addInitScript((value) => localStorage.setItem('meridiano.preferences.v1', JSON.stringify(value)), original)
    await page.goto('/')
    const settings = page.getByRole('button', { name: t.settings, exact: true })
    await settings.click()
    await page.getByRole('button', { name: t.transferTitle, exact: true }).click()
    await expect(page.getByRole('button', { name: t.closeDialog })).toBeFocused()
    await expect(page.getByText(t.transferPrivacy)).toBeVisible()
    await page.getByLabel(t.transferImport, { exact: true }).setInputFiles({
      name: 'empty.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ version: 1, clocks: [], hourCycle: '12', language })),
    })
    await expect(page.getByText(t.transferConfirmTitle)).toBeVisible()
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(original)
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations).toEqual([])
    await page.getByRole('button', { name: t.cancel, exact: true }).click()
    await page.getByLabel(t.transferImport, { exact: true }).setInputFiles({
      name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{invalid'),
    })
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(t.transferInvalid)
    await expect(page.getByRole('button', { name: t.transferConfirm })).toHaveCount(0)
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(original)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await expect(settings).toBeFocused()
  })
}
