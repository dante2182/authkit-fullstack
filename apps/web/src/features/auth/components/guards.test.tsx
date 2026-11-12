import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { GuestRoute, ProtectedRoute } from '@/features/auth'
import type { AuthUser } from '@/features/auth'
import { AuthContext } from '../context/auth-context'
import type { AuthContextValue } from '../context/auth-context'

const user: AuthUser = {
  id: 'user-1',
  name: 'Ana',
  email: 'ana@example.com',
  emailVerified: true,
  image: null,
  role: 'ADMIN',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

function authValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    isLoading: false,
    refreshSession: vi.fn(async () => null),
    signOut: vi.fn(async () => {}),
    ...overrides,
  }
}

function renderAt(path: string, value: AuthContextValue): void {
  const ui: ReactNode = (
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<p>pantalla de login</p>} />
          <Route path="/dashboard" element={<p>panel</p>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/privada" element={<p>contenido privado</p>} />
          </Route>
          <Route element={<GuestRoute />}>
            <Route path="/solo-invitados" element={<p>contenido de invitado</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  )

  render(ui)
}

describe('ProtectedRoute', () => {
  it('redirige a /login cuando no hay sesión', () => {
    renderAt('/privada', authValue())

    expect(screen.getByText('pantalla de login')).toBeInTheDocument()
    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument()
  })

  it('renderiza la ruta cuando hay sesión', () => {
    renderAt('/privada', authValue({ user }))

    expect(screen.getByText('contenido privado')).toBeInTheDocument()
  })

  it('no redirige mientras la sesión se está restaurando', () => {
    renderAt('/privada', authValue({ isLoading: true }))

    expect(screen.queryByText('pantalla de login')).not.toBeInTheDocument()
    expect(screen.queryByText('contenido privado')).not.toBeInTheDocument()
  })
})

describe('GuestRoute', () => {
  it('redirige al panel cuando ya hay sesión', () => {
    renderAt('/solo-invitados', authValue({ user }))

    expect(screen.getByText('panel')).toBeInTheDocument()
    expect(screen.queryByText('contenido de invitado')).not.toBeInTheDocument()
  })

  it('deja pasar a un visitante sin sesión', () => {
    renderAt('/solo-invitados', authValue())

    expect(screen.getByText('contenido de invitado')).toBeInTheDocument()
  })
})
