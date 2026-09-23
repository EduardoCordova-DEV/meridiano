import { parsePreferences } from './storage'
import type { Preferences } from './types'

export const MAX_TRANSFER_BYTES = 5 * 1024 * 1024

export type TransferIssue = 'transferInvalid' | 'transferTooLarge' | 'transferReadError' | 'transferExportError' | 'transferSaveError'

export class TransferError extends Error {
  constructor(readonly code: TransferIssue) {
    super(code)
  }
}

export function parseTransfer(raw: string): Preferences {
  if (new Blob([raw]).size > MAX_TRANSFER_BYTES) throw new TransferError('transferTooLarge')
  try {
    return parsePreferences(raw.replace(/^\uFEFF/, ''))
  } catch {
    // Import must reject the entire file, including invalid palettes; never salvage it.
    throw new TransferError('transferInvalid')
  }
}

export function serializeTransfer(preferences: Preferences): string {
  return JSON.stringify(parseTransfer(JSON.stringify(preferences)), null, 2)
}

export function readTransfer(file: File, signal: AbortSignal): Promise<Preferences> {
  if (file.size > MAX_TRANSFER_BYTES) return Promise.reject(new TransferError('transferTooLarge'))
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const abort = () => reader.abort()
    function cleanup() { signal.removeEventListener('abort', abort) }
    reader.onload = () => {
      cleanup()
      try {
        if (typeof reader.result !== 'string') throw new TransferError('transferReadError')
        resolve(parseTransfer(reader.result))
      } catch (error) { reject(error) }
    }
    reader.onerror = () => { cleanup(); reject(new TransferError('transferReadError')) }
    reader.onabort = () => { cleanup(); reject(new DOMException('Cancelled', 'AbortError')) }
    if (signal.aborted) { reject(new DOMException('Cancelled', 'AbortError')); return }
    signal.addEventListener('abort', abort, { once: true })
    reader.readAsText(file)
  })
}

export function exportTransfer(preferences: Preferences) {
  const contents = serializeTransfer(preferences)
  if (new Blob([contents]).size > MAX_TRANSFER_BYTES) throw new TransferError('transferTooLarge')
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }))
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = `meridiano-preferences-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
  } finally {
    // Allow Chromium's download handler to acquire the blob before releasing it.
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}
