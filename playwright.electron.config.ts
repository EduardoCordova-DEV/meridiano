import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/electron',
  workers: 1,
  fullyParallel: false,
  timeout: 90_000,
  reporter: 'list',
  outputDir: 'test-results/electron',
  use: { trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'electron' },
    { name: 'packaged' },
  ],
})
