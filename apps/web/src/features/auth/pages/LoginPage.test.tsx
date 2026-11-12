import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthCapabilitiesProvider, AuthProvider, LoginPage } from '@/features/auth'
import type { AuthCapabilities, AuthUser, SessionResponse } from '@/features/auth'
import { server } from '@/test/msw/server'

const API = 'http://localhost:4000/api'

const sessionUser: AuthUser = {
  id: 'user-1',
  name: 'Ana',
  email: 'ana@example.com',
  emailVerified: true,
  image: null,
  role: 'USER',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const openCapabilities: AuthCapabilities = {
  emailPassword: { enabled: true, signUpEnabled: true },
  socialProviders: [],
}

function sessionBody(): SessionResponse {
  return {
    session: {
      id: 'session-1',
      token: 'token-1',
      userId: sessionUser.id,
      expiresAt: '2026-02-01T00:00:00.000Z',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    user: sessionUser,
  }
}

// La pantalla se prueba con los providers reales: el contrato de capacidades y
// la sesión llegan por red (MSW), igual que en la aplicación.
function renderLogin({
  capabilities = openCapabilities,
  sessionInitially = false,
  sessionAfterLogin = true,
  onSignIn,
}: {
  capabilities?: AuthCapabilities
  sessionInitially?: boolean
  sessionAfterLogin?: boolean
  onSignIn?: (body: unknown) => void
} = {}) {
  let signedIn = sessionInitially

  server.use(
    http.get(`${API}/config/auth`, () => HttpResponse.json(capabilities)),
    http.get(`${API}/auth/get-session`, () => HttpResponse.json(signedIn ? sessionBody() : null)),
    http.post(`${API}/auth/sign-in/email`, async ({ request }) => {
      signedIn = sessionInitially || sessionAfterLogin
      onSignIn?.(await request.json())
      return HttpResponse.json({ user: sessionUser })
    }),
  )

  render(
    <AuthProvider>
      <AuthCapabilitiesProvider>
        <MemoryRouter initialEntries={['/login']}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/dashboard" element={<p>panel</p>} />
          </Routes>
        </MemoryRouter>
      </AuthCapabilitiesProvider>
    </AuthProvider>,
  )
}

describe('LoginPage', () => {
  it('muestra el formulario cuando la API habilita credenciales', async () => {
    renderLogin()

    expect(await screen.findByLabelText('Correo electrónico')).toBeInTheDocument()
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument()
  })

  it('oculta el formulario si el despliegue no tiene credenciales ni proveedores', async () => {
    renderLogin({
      capabilities: {
        emailPassword: { enabled: false, signUpEnabled: false },
        socialProviders: [],
      },
    })

    expect(
      await screen.findByText(
        'No hay ningún método de acceso activo. Revisa la configuración del servidor.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Contraseña')).not.toBeInTheDocument()
  })

  it('oculta el enlace de registro cuando el registro está cerrado', async () => {
    renderLogin({
      capabilities: {
        emailPassword: { enabled: true, signUpEnabled: false },
        socialProviders: [],
      },
    })

    await screen.findByLabelText('Correo electrónico')

    expect(screen.queryByRole('link', { name: 'Crear una cuenta' })).not.toBeInTheDocument()
  })

  it('inicia sesión y navega al panel', async () => {
    const user = userEvent.setup()
    let received: unknown = null

    renderLogin({ onSignIn: (body) => (received = body) })

    await user.type(await screen.findByLabelText('Correo electrónico'), '  ana@example.com ')
    await user.type(screen.getByLabelText('Contraseña'), 'SuperSecret123!')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('panel')).toBeInTheDocument()
    expect(received).toEqual({ email: 'ana@example.com', password: 'SuperSecret123!' })
  })

  it('traduce el error de credenciales incorrectas', async () => {
    const user = userEvent.setup()

    renderLogin()

    server.use(
      http.post(`${API}/auth/sign-in/email`, () =>
        HttpResponse.json(
          { code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' },
          { status: 401 },
        ),
      ),
    )

    await user.type(await screen.findByLabelText('Correo electrónico'), 'ana@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'incorrecta')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeInTheDocument()
    expect(screen.queryByText('panel')).not.toBeInTheDocument()
  })

  it('avisa si el login responde bien pero no hay sesión utilizable', async () => {
    const user = userEvent.setup()

    // get-session sigue devolviendo null aunque el POST de login haya ido bien.
    renderLogin({ sessionAfterLogin: false })

    await user.type(await screen.findByLabelText('Correo electrónico'), 'ana@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'SuperSecret123!')
    await user.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(
      await screen.findByText('No pudimos confirmar tu sesión. Vuelve a intentarlo.'),
    ).toBeInTheDocument()
  })
})
