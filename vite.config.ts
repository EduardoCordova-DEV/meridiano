import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5183,
    strictPort: true,
    // Avoid missed file replacements and transient watch locks on Windows.
    watch: { usePolling: process.platform === 'win32', interval: 300 },
  },
  test: {
    environment: 'jsdom',
    // Node's native storage must not shadow the browser storage supplied by jsdom.
    execArgv: ['--no-experimental-webstorage'],
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    restoreMocks: true,
  },
})
