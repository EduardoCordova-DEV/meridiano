import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { defaultPreferences, STORAGE_KEY } from './storage'

const original = { ...defaultPreferences(), clocks: [{ id: 'old', zone: 'Europe/London', label: 'Original' }] }
const empty = { version: 1, clocks: [], hourCycle: '12' }
function openTransfer() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(original))
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
  fireEvent.click(screen.getByRole('button', { name: 'Importar / exportar' }))
}
async function choose(raw: string) {
  fireEvent.change(screen.getByLabelText('Importar JSON'), { target: { files: [new File([raw], 'chosen.json')] } })
  await waitFor(() => expect(screen.queryByText('Leyendo y validando el archivo…')).not.toBeInTheDocument())
}

describe('consentimiento de importación', () => {
  it('no escribe al seleccionar, permite cancelar y solo reemplaza al confirmar', async () => {
    openTransfer()
    const write = vi.spyOn(Storage.prototype, 'setItem')
    await choose(JSON.stringify(empty))
    expect(screen.getByText(/Archivo válido: 0 relojes/)).toBeInTheDocument()
    expect(write).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(original)
    await choose(JSON.stringify(empty))
    fireEvent.click(screen.getByRole('button', { name: 'Reemplazar mis preferencias' }))
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(empty)
    expect(screen.getByText('Preferencias importadas y guardadas.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar diálogo' }))
    expect(screen.getByText('Tu mundo empieza aquí')).toBeInTheDocument()
  })

  it('descarta un candidato previo si el siguiente archivo es inválido', async () => {
    openTransfer()
    await choose(JSON.stringify(empty))
    await choose('bad JSON')
    expect(screen.getByRole('alert')).toHaveTextContent('No se cambió ningún dato')
    expect(screen.queryByRole('button', { name: 'Reemplazar mis preferencias' })).not.toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(original)
  })

  it('una escritura fallida no cambia los datos guardados ni los relojes mostrados', async () => {
    openTransfer()
    await choose(JSON.stringify(empty))
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('Full', 'QuotaExceededError') })
    fireEvent.click(screen.getByRole('button', { name: 'Reemplazar mis preferencias' }))
    expect(screen.getByText(/Las preferencias anteriores siguen intactas/)).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(original)
    write.mockRestore()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar diálogo' }))
    expect(screen.getByText('Original')).toBeInTheDocument()
  })
})
