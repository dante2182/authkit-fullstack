import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../config/prisma.js'
import { resetDatabase } from '../../test/db.js'

vi.mock('../../shared/email/email.service.js', () => ({
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}))

const credentials = {
  name: 'Test User',
  email: 'verify-env@example.com',
  password: 'SuperSecret123!',
}

// `env` y `auth` se leen una sola vez al importar: hay que reiniciar módulos
// después de stubear la variable para que la app use el valor del test.
async function loadApp(requireVerification: 'true' | 'false' | undefined) {
  if (requireVerification === undefined) vi.stubEnv('AUTH_REQUIRE_EMAIL_VERIFICATION', '')
  else vi.stubEnv('AUTH_REQUIRE_EMAIL_VERIFICATION', requireVerification)

  vi.resetModules()
  const { app } = await import('../../app.js')
  return app
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('AUTH_REQUIRE_EMAIL_VERIFICATION', () => {
  it('por defecto no bloquea el login de un email sin verificar', async () => {
    const app = await loadApp(undefined)

    expect((await request(app).post('/api/auth/sign-up/email').send(credentials)).status).toBe(200)

    const signIn = await request(app).post('/api/auth/sign-in/email').send({
      email: credentials.email,
      password: credentials.password,
    })

    expect(signIn.status).toBe(200)
  })

  it('con true rechaza el login hasta verificar el email', async () => {
    const app = await loadApp('true')

    const signUp = await request(app).post('/api/auth/sign-up/email').send(credentials)
    expect(signUp.status).toBe(200)

    const signIn = await request(app).post('/api/auth/sign-in/email').send({
      email: credentials.email,
      password: credentials.password,
    })

    expect(signIn.status).toBe(403)
    expect(signIn.body.code).toBe('EMAIL_NOT_VERIFIED')
    expect(signIn.headers['set-cookie']).toBeUndefined()
  })

  it('con true permite el login cuando el email ya está verificado', async () => {
    const app = await loadApp('true')

    const signUp = await request(app).post('/api/auth/sign-up/email').send(credentials)
    expect(signUp.status).toBe(200)

    await prisma.user.update({
      where: { email: credentials.email },
      data: { emailVerified: true },
    })

    const signIn = await request(app).post('/api/auth/sign-in/email').send({
      email: credentials.email,
      password: credentials.password,
    })

    expect(signIn.status).toBe(200)
    expect(signIn.body.user.email).toBe(credentials.email)
  })
})
