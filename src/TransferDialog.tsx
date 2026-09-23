import { useEffect, useRef, useState } from 'react'
import { useModalDialog } from './hooks'
import { messages } from './i18n'
import { Icon } from './icons'
import type { StorageIssue } from './storage'
import { exportTransfer, readTransfer, TransferError } from './transfer'
import type { TransferIssue } from './transfer'
import type { Language, Preferences } from './types'

interface Props {
  language: Language
  preferences: Preferences
  issue: StorageIssue | null
  onImport: (preferences: Preferences) => boolean
  onClose: () => void
}

export function TransferDialog({ language, preferences, issue, onImport, onClose }: Props) {
  const t = messages(language)
  const focus = useRef<HTMLButtonElement>(null)
  const dialog = useModalDialog(focus)
  const reading = useRef<AbortController | null>(null)
  const [pending, setPending] = useState<Preferences | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<TransferIssue | null>(null)
  const [notice, setNotice] = useState<'transferImported' | 'transferExportStarted' | null>(null)
  useEffect(() => () => reading.current?.abort(), [])

  async function chooseFile(file: File | undefined) {
    reading.current?.abort()
    setPending(null)
    setError(null)
    setNotice(null)
    if (!file) { setBusy(false); return }
    const controller = new AbortController()
    reading.current = controller
    setBusy(true)
    try {
      const candidate = await readTransfer(file, controller.signal)
      if (!controller.signal.aborted) setPending(candidate)
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof TransferError ? error.code : 'transferReadError')
    } finally {
      if (!controller.signal.aborted) setBusy(false)
    }
  }

  function confirmImport() {
    if (!pending) return
    try {
      if (!onImport(pending)) { setError('transferSaveError'); return }
      setPending(null)
      setError(null)
      setNotice('transferImported')
    } catch {
      setError('transferInvalid')
    }
  }

  function exportFile() {
    setError(null)
    setNotice(null)
    try {
      exportTransfer(preferences)
      setNotice('transferExportStarted')
    } catch (error) {
      setError(error instanceof TransferError ? error.code : 'transferExportError')
    }
  }

  return (
    <dialog ref={dialog} className="clock-dialog transfer-dialog" aria-labelledby="transfer-title" aria-describedby="transfer-description" onCancel={(event) => { event.preventDefault(); onClose() }}>
      <div className="dialog-heading">
        <h2 id="transfer-title">{t.transferTitle}</h2>
        <button ref={focus} type="button" className="icon-button" aria-label={t.closeDialog} onClick={onClose}><Icon name="close" /></button>
      </div>
      <p id="transfer-description" className="dialog-description">{t.transferDescription}</p>
      <p className="transfer-privacy">{t.transferPrivacy}</p>
      {issue && <p className="storage-warning" role="alert">{t[issue]} {t.transferVisibleOnly}</p>}
      <div className="transfer-actions">
        <button className="button button-secondary" type="button" onClick={exportFile}>{t.transferExport}</button>
        <label htmlFor="transfer-file">{t.transferImport}</label>
        <input id="transfer-file" type="file" accept=".json,application/json" onChange={(event) => {
          void chooseFile(event.currentTarget.files?.[0])
          event.currentTarget.value = ''
        }} />
      </div>
      {busy && <p role="status">{t.transferReading}</p>}
      {pending && <section className="transfer-confirm" aria-labelledby="transfer-confirm-title">
        <h3 id="transfer-confirm-title">{t.transferConfirmTitle}</h3>
        <p>{t.transferSummary(pending.clocks.length)}</p>
        <p>{t.transferReplaceWarning}</p>
        <div className="dialog-actions">
          <button className="button button-secondary" type="button" onClick={() => { setPending(null); setError(null) }}>{t.cancel}</button>
          <button className="button button-primary" type="button" onClick={confirmImport}>{t.transferConfirm}</button>
        </div>
      </section>}
      {error && <p className="field-error" role="alert">{t[error]}</p>}
      {notice && <p role="status">{t[notice]}</p>}
    </dialog>
  )
}
