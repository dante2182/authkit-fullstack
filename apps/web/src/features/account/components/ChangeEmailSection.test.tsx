import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '@/features/auth'
import type { AuthUser, SessionResponse } from '@/features/auth'
import { server } from '@/test/msw/server'
import { ChangeEmailSection } from './ChangeEmailSection'

const API = 'http://localhost:4000/api'

const currentUser: AuthUser = {
  id: 'user-1',
  name: 'Ana',
  email: 'ana@example.com',
  emailVerified: true,
  image: null,
  role: 'USER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const session: SessionResponse = {
  session: {
    id: 'session-1',
    token: 'token-1',
    userId: currentUser.id,
    expiresAt: '2026-02-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  user: currentUser,
}

function renderSection(): void {
  server.use(http.get(`${API}/auth/get-session`, () => HttpResponse.json(session)))

  render(
    <AuthProvider>
      <ChangeEmailSection />
    </AuthProvider>,
  )
}

describe('ChangeEmailSection', () => {
  it('solicita el cambio y avisa de que hay que confirmarlo por correo', async () => {
    const user = userEvent.setup()
    let body: unknown = null

    server.use(
      http.post(`${API}/auth/change-email`, async ({ request }) => {
        body = await request.json()
        return HttpResponse.json({ status: true })
      }),
    )

    renderSection()

    await user.type(await screen.findByLabelText('Nuevo correo'), 'nueva@example.com')
    await user.click(screen.getByRole('button', { name: 'Enviar confirmación' }))

    expect(
      await screen.findByText(/Hemos enviado un enlace de confirmación a ana@example.com/),
    ).toBeInTheDocument()

    expect(body).toMatchObject({ newEmail: 'nueva@example.com' })
    // El callback apunta a la ruta de verificación; el host depende del origen.
    expect((body as { callbackURL: string }).callbackURL).toMatch(/\/verify-email$/)
  })

  it('valida el formato antes de llamar a la API', async () => {
    const user = userEvent.setup()
    let called = false

    server.use(
      http.post(`${API}/auth/change-email`, () => {
        called = true
        return HttpResponse.json({ status: true })
      }),
    )

    renderSection()

    await user.type(await screen.findByLabelText('Nuevo correo'), 'no-es-un-correo')
    await user.click(screen.getByRole('button', { name: 'Enviar confirmación' }))

    expect(await screen.findByText('Introduce un correo válido')).toBeInTheDocument()
    expect(called).toBe(false)
  })
})
