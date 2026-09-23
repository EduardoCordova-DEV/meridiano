import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// DOM suites do not have Canvas 2D; real pixels are covered in browser/Electron tests.
vi.mock('./celestial-renderer', () => ({
  CELESTIAL_SIZE: 320,
  createCelestialRenderer: vi.fn(() => ({ draw: vi.fn() })),
}))

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn((query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  })))
})

HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  document.documentElement.removeAttribute('style')
  document.documentElement.lang = 'es'
  vi.unstubAllGlobals()
})
