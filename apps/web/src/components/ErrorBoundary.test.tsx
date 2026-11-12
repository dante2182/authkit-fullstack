import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new Error('boom')
}

describe('ErrorBoundary', () => {
  it('dibuja el fallback cuando un hijo falla al renderizar', () => {
    // React escribe el error por consola: se silencia para no ensuciar la salida.
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('heading', { name: 'Algo ha fallado' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Recargar' })).toBeInTheDocument()

    consoleError.mockRestore()
  })

  it('deja pasar a los hijos cuando no hay error', () => {
    render(
      <ErrorBoundary>
        <p>contenido</p>
      </ErrorBoundary>,
    )

    expect(screen.getByText('contenido')).toBeInTheDocument()
  })
})
