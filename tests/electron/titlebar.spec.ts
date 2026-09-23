import { _electron as electron, expect, test } from '@playwright/test'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { promisify } from 'node:util'
import type { TitleBarOverlayOptions } from 'electron'
import { contrastRatio, PRESETS } from '../../src/palette'

test('título integrado: controles nativos, paletas y esquinas de Windows', async ({}, testInfo) => {
  test.setTimeout(120_000)
  await mkdir(dirname(testInfo.outputDir), { recursive: true })
  const profile = await mkdtemp(testInfo.outputDir + '-profile-')
  const env = Object.fromEntries(Object.entries(process.env).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
  delete env.ELECTRON_RUN_AS_NODE
  const packaged = testInfo.project.name === 'packaged'
  const app = await electron.launch({
    ...(packaged ? { executablePath: resolve('release', 'win-unpacked', 'Meridiano Desk App.exe') } : {}),
    args: [...(packaged ? [] : ['.']), `--user-data-dir=${profile}`], env,
  })
  try {
    const page = await app.firstWindow()
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await expect(page.locator('.desktop-titlebar')).toHaveText('Meridiano Desk App')
    const window = await app.browserWindow(page)
    await expect.poll(() => window.evaluate((window) => window.isMaximized())).toBe(true)
    const colors = await window.evaluateHandle((window) => {
      const calls: Array<{ color?: string; symbolColor?: string }> = []
      const original = window.setTitleBarOverlay.bind(window)
      window.setTitleBarOverlay = (options: TitleBarOverlayOptions) => { calls.push(options); original(options) }
      return calls
    })
    const nativeColor = () => colors.evaluate((calls) => calls.at(-1)?.color?.toLowerCase())
    for (const [preset, modes] of Object.entries(PRESETS)) {
      for (const theme of ['dark', 'light'] as const) {
        const preferences = { version: 1, clocks: [], theme, palettePreset: preset, hourCycle: '24', language: 'es' }
        await page.evaluate((value) => localStorage.setItem('meridiano.preferences.v1', JSON.stringify(value)), preferences)
        await page.reload()
        await expect(page.locator('.earth-sphere canvas')).toHaveAttribute('data-state', 'ready')
        await expect.poll(nativeColor).toBe(modes[theme].background)
        const native = await colors.evaluate((calls) => calls.at(-1)!)
        expect(contrastRatio(native.symbolColor!, modes[theme].background)).toBeGreaterThanOrEqual(4.5)
        expect(await page.evaluate(() => getComputedStyle(document.querySelector('.desktop-titlebar')!).backgroundColor)).toBe(
          await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor),
        )
        expect(await window.evaluate((window) => window.getTitle())).toBe('Meridiano Desk App')
        expect(await window.evaluate((window) => window.isMaximized() && window.isVisible())).toBe(true)
        expect(await page.evaluate(() => JSON.parse(localStorage.getItem('meridiano.preferences.v1')!))).toEqual(preferences)
      }
    }
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click()
    await page.getByRole('button', { name: 'Pizarra', exact: true }).click()
    await expect.poll(nativeColor).toBe(PRESETS.slate.light.background)
    await page.getByLabel('Fondo del dashboard HEX', { exact: true }).fill('#123456')
    await expect.poll(nativeColor).toBe('#123456')
    expect(contrastRatio((await colors.evaluate((calls) => calls.at(-1)!)).symbolColor!, '#123456')).toBeGreaterThanOrEqual(4.5)
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await expect.poll(nativeColor).toBe(PRESETS.react.light.background)
    await page.getByRole('button', { name: 'Cambiar a modo oscuro' }).click()
    await expect.poll(nativeColor).toBe(PRESETS.react.dark.background)

    await window.evaluate((window) => window.unmaximize())
    await expect.poll(() => window.evaluate((window) => window.isMaximized())).toBe(false)
    await window.evaluate((window) => window.setContentSize(1440, 960))
    await expect.poll(() => page.evaluate(() => [innerWidth, innerHeight])).toEqual([1440, 960])
    const titlebar = await page.locator('.desktop-titlebar').boundingBox()
    expect(titlebar!.height).toBeGreaterThanOrEqual(30)
    expect(titlebar!.height).toBeLessThanOrEqual(34)
    expect(titlebar!.width).toBeLessThan(1440 - 100)
    expect(await page.locator('.desktop-titlebar').evaluate((element) => getComputedStyle(element).getPropertyValue('app-region'))).toBe('drag')
    expect((await page.locator('.site-header').boundingBox())!.y).toBeGreaterThanOrEqual(titlebar!.y + titlebar!.height)
    await page.locator('.skip-link').focus()
    expect((await page.locator('.skip-link').boundingBox())!.y).toBeGreaterThanOrEqual(titlebar!.y + titlebar!.height)
    await page.keyboard.press('Tab')
    await page.screenshot({ path: testInfo.outputPath('titlebar-restored.png'), fullPage: true })

    const handle = await window.evaluate((window) => window.getNativeWindowHandle().readBigUInt64LE().toString())
    const script = `
      Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class WindowProbe {
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr window, int attribute, out int value, int size);
  [DllImport("user32.dll")] public static extern IntPtr SendMessageW(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
}
'@
      $window = [IntPtr]::new([long]${handle})
      $corner = 0
      $result = [WindowProbe]::DwmGetWindowAttribute($window, 33, [ref]$corner, 4)
      [WindowProbe]::SendMessageW($window, 0xA3, [IntPtr]::new(2), [IntPtr]::Zero) | Out-Null
      @{ result = $result; corner = $corner; build = [Environment]::OSVersion.Version.Build } | ConvertTo-Json -Compress
    `
    const { stdout } = await promisify(execFile)('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { windowsHide: true })
    const native = JSON.parse(stdout)
    if (native.build >= 22000) {
      expect(native.result).toBe(0)
      expect(native.corner).toBe(2)
    }
    await expect.poll(() => window.evaluate((window) => window.isMaximized())).toBe(true)
    await page.screenshot({ path: testInfo.outputPath('titlebar-maximized.png'), fullPage: true })
    await window.evaluate((window) => window.minimize())
    await expect.poll(() => window.evaluate((window) => window.isMinimized())).toBe(true)
    await window.evaluate((window) => window.restore())
    await expect.poll(() => window.evaluate((window) => window.isMinimized())).toBe(false)
    expect(await page.evaluate(() => ({
      node: typeof Reflect.get(window, 'require'), ipc: typeof Reflect.get(window, 'electron'),
    }))).toEqual({ node: 'undefined', ipc: 'undefined' })
    expect(errors).toEqual([])
    await colors.dispose()
  } finally {
    await app.close()
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 })
  }
})
