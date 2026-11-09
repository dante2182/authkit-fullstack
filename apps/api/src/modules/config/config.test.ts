import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../config/prisma.js'
import { resetDatabase } from '../../test/db.js'

vi.mock('../../shared/email/email.service.js', () => ({
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}))

const credentials = {
  name: 'Test User',
  email: 'user@example.com',
  password: 'SuperSecret123!',
}

// Cada modo se prueba sobre una app nueva: `env` y `auth` se leen una sola vez
// al importar, así que hay que reiniciar el registro de módulos tras stubear.
async function loadApp() {
  vi.resetModules()
  const { app } = await import('../../app.js')
  return app
}

function stubProviders(): void {
  vi.stubEnv('GOOGLE_CLIENT_ID', 'google-id')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'google-secret')
}

function stubNoProviders(): void {
  vi.stubEnv('GOOGLE_CLIENT_ID', '')
  vi.stubEnv('GOOGLE_CLIENT_SECRET', '')
  vi.stubEnv('GITHUB_CLIENT_ID', '')
  vi.stubEnv('GITHUB_CLIENT_SECRET', '')
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('GET /api/config/auth', () => {
  it('publica credenciales y registro activos por defecto', async () => {
    stubNoProviders()
    const app = await loadApp()

    const response = await request(app).get('/api/config/auth')

    expect(response.status).toBe(200)
    expect(response.headers['cache-control']).toBe('no-store')
    expect(response.body).toEqual({
      emailPassword: { enabled: true, signUpEnabled: true },
      socialProviders: [],
    })
  })

  it('publica los proveedores configurados en orden estable', async () => {
    stubProviders()
    vi.stubEnv('GITHUB_CLIENT_ID', 'github-id')
    vi.stubEnv('GITHUB_CLIENT_SECRET', 'github-secret')
    const app = await loadApp()

    const response = await request(app).get('/api/config/auth')

    expect(response.body.socialProviders).toEqual(['google', 'github'])
  })

  it('refleja el modo solo proveedores', async () => {
    stubProviders()
    vi.stubEnv('AUTH_EMAIL_PASSWORD_ENABLED', 'false')
    const app = await loadApp()

    const response = await request(app).get('/api/config/auth')

    expect(response.body).toEqual({
      emailPassword: { enabled: false, signUpEnabled: true },
      socialProviders: ['google'],
    })
  })

  it('refleja el registro cerrado', async () => {
    stubNoProviders()
    vi.stubEnv('AUTH_SIGN_UP_ENABLED', 'false')
    const app = await loadApp()

    const response = await request(app).get('/api/config/auth')

    expect(response.body.emailPassword).toEqual({ enabled: true, signUpEnabled: false })
  })

  it('no exige sesión', async () => {
    stubNoProviders()
    const app = await loadApp()

    const response = await request(app).get('/api/config/auth')

    expect(response.status).toBe(200)
  })
})

describe('enforcement de credenciales', () => {
  it('rechaza login y registro por email cuando las credenciales están apagadas', async () => {
    stubProviders()
    vi.stubEnv('AUTH_EMAIL_PASSWORD_ENABLED', 'false')
    const app = await loadApp()

    const signIn = await request(app)
      .post('/api/auth/sign-in/email')
      .send({ email: credentials.email, password: credentials.password })
    const signUp = await request(app).post('/api/auth/sign-up/email').send(credentials)

    expect(signIn.status).toBe(400)
    expect(signIn.body.code).toBe('EMAIL_PASSWORD_DISABLED')
    expect(signUp.status).toBe(400)
    expect(signUp.body.code).toBe('EMAIL_PASSWORD_SIGN_UP_DISABLED')
  })

  it('cierra el registro sin bloquear el login de un usuario existente', async () => {
    stubNoProviders()
    const openApp = await loadApp()
    const created = await request(openApp).post('/api/auth/sign-up/email').send(credentials)
    expect(created.status).toBe(200)

    vi.stubEnv('AUTH_SIGN_UP_ENABLED', 'false')
    const closedApp = await loadApp()

    const signUp = await request(closedApp).post('/api/auth/sign-up/email').send(credentials)
    const signIn = await request(closedApp)
      .post('/api/auth/sign-in/email')
      .send({ email: credentials.email, password: credentials.password })

    expect(signUp.status).toBe(400)
    expect(signUp.body.code).toBe('EMAIL_PASSWORD_SIGN_UP_DISABLED')
    expect(signIn.status).toBe(200)
    expect(await prisma.user.count({ where: { email: credentials.email } })).toBe(1)
  })
})

describe('enforcement de proveedores sociales', () => {
  it('responde 404 para un proveedor no configurado', async () => {
    stubNoProviders()
    const app = await loadApp()

    const response = await request(app)
      .post('/api/auth/sign-in/social')
      .send({ provider: 'google', callbackURL: '/dashboard' })

    expect(response.status).toBe(404)
    expect(response.body.code).toBe('PROVIDER_NOT_FOUND')
  })

  it('inicia el flujo del proveedor configurado', async () => {
    stubProviders()
    const app = await loadApp()

    const response = await request(app)
      .post('/api/auth/sign-in/social')
      .send({ provider: 'google', callbackURL: '/dashboard' })

    expect(response.status).toBe(200)
    expect(response.body.redirect).toBe(true)
    expect(response.body.url).toContain('google')
  })

  it('propaga el registro cerrado a los proveedores sociales', async () => {
    stubProviders()
    vi.stubEnv('AUTH_SIGN_UP_ENABLED', 'false')
    vi.resetModules()

    const { buildSocialProvidersConfig } = await import('../../config/auth-capabilities.js')
    const providers = buildSocialProvidersConfig()

    expect(providers.google?.disableSignUp).toBe(true)
    expect(providers.google?.clientId).toBe('google-id')

    // La opción debe llegar a better-auth, no quedarse en el objeto intermedio.
    const { auth } = await import('../../config/auth.js')
    const context = await (
      auth as unknown as {
        $context: Promise<{
          socialProviders: { id: string; options?: { disableSignUp?: boolean } }[]
        }>
      }
    ).$context

    expect(context.socialProviders.map((provider) => provider.id)).toEqual(['google'])
    expect(context.socialProviders[0]?.options?.disableSignUp).toBe(true)
  })
})
