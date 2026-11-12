import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AdminUsersPage } from '@/features/admin'
import { AuthProvider } from '@/features/auth'
import type { AuthUser, SessionResponse } from '@/features/auth'
import { server } from '@/test/msw/server'

const API = 'http://localhost:4000/api'

const admin: AuthUser = {
  id: 'admin-1',
  name: 'Admin',
  email: 'admin@example.com',
  emailVerified: true,
  image: null,
  role: 'ADMIN',
  createdAt: '2026-01-02T10:00:00.000Z',
  updatedAt: '2026-01-02T10:00:00.000Z',
}

const users = [
  {
    id: 'admin-1',
    name: 'Admin',
    email: 'admin@example.com',
    emailVerified: true,
    role: 'ADMIN',
    createdAt: '2026-01-02T10:00:00.000Z',
  },
  {
    id: 'user-2',
    name: 'Bruno',
    email: 'bruno@example.com',
    emailVerified: false,
    role: 'USER',
    createdAt: '2026-01-03T10:00:00.000Z',
  },
]

const session: SessionResponse = {
  session: {
    id: 'session-1',
    token: 'token-1',
    userId: admin.id,
    expiresAt: '2026-02-01T00:00:00.000Z',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
  },
  user: admin,
}

function listResponse(items = users) {
  return HttpResponse.json({
    users: items,
    pagination: { page: 1, limit: 20, total: items.length, pages: 1 },
  })
}

// La sesión llega por red con el AuthProvider real: la página no recibe un
// usuario inyectado, tiene que resolverlo como en producción.
function renderAdminUsers(): void {
  server.use(http.get(`${API}/auth/get-session`, () => HttpResponse.json(session)))

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/admin/users']}>
        <AdminUsersPage />
      </MemoryRouter>
    </AuthProvider>,
  )
}

describe('AdminUsersPage', () => {
  it('lista los usuarios que devuelve la API', async () => {
    server.use(http.get(`${API}/admin/users`, () => listResponse()))

    renderAdminUsers()

    expect(await screen.findByText('bruno@example.com')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('Tú')).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay coincidencias', async () => {
    server.use(http.get(`${API}/admin/users`, () => listResponse([])))

    renderAdminUsers()

    expect(await screen.findByText('No hay usuarios registrados')).toBeInTheDocument()
  })

  it('muestra el error y permite reintentar', async () => {
    let attempts = 0

    server.use(
      http.get(`${API}/admin/users`, () => {
        attempts += 1
        if (attempts === 1) {
          return HttpResponse.json(
            { error: { code: 'INTERNAL_ERROR', message: 'Fallo interno' } },
            { status: 500 },
          )
        }

        return listResponse()
      }),
    )

    renderAdminUsers()

    expect(await screen.findByText(/Fallo interno/)).toBeInTheDocument()

    screen.getByRole('button', { name: 'Reintentar' }).click()

    expect(await screen.findByText('bruno@example.com')).toBeInTheDocument()
  })
})
