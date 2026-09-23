import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testIgnore: '**/electron/**',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/renderer',
  use: {
    baseURL: 'http://127.0.0.1:5183',
    browserName: 'chromium',
    channel: 'msedge',
    timezoneId: 'Asia/Tokyo',
    locale: 'es-MX',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1100 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npm run dev:renderer',
    url: 'http://127.0.0.1:5183',
    reuseExistingServer: false,
    timeout: 60_000,
  },
})
