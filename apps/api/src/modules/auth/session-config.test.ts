import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../config/prisma.js'
import { resetDatabase } from '../../test/db.js'

vi.mock('../../shared/email/email.service.js', () => ({
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}))

const credentials = {
  name: 'Session User',
  email: 'session@example.com',
  password: 'SuperSecret123!',
}

async function loadAuth(input: { expiresIn?: string; updateAge?: string } = {}) {
  vi.stubEnv('SESSION_EXPIRES_IN', input.expiresIn ?? '')
  vi.stubEnv('SESSION_UPDATE_AGE', input.updateAge ?? '')
  vi.resetModules()

  const { app } = await import('../../app.js')
  const { auth } = await import('../../config/auth.js')
  return { app, auth }
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('duración de sesión configurable', () => {
  it('usa los defaults de better-auth cuando no hay variables', async () => {
    const { auth } = await loadAuth()

    expect(auth.options.session?.expiresIn).toBe(604800)
    expect(auth.options.session?.updateAge).toBe(86400)
  })

  it('aplica SESSION_EXPIRES_IN y SESSION_UPDATE_AGE', async () => {
    const { auth } = await loadAuth({ expiresIn: '120', updateAge: '30' })

    expect(auth.options.session?.expiresIn).toBe(120)
    expect(auth.options.session?.updateAge).toBe(30)
  })

  it('crea la sesión con la expiración configurada', async () => {
    const { app } = await loadAuth({ expiresIn: '120', updateAge: '30' })

    const signUp = await request(app).post('/api/auth/sign-up/email').send(credentials)
    expect(signUp.status).toBe(200)

    const session = await prisma.session.findFirst({
      where: { user: { email: credentials.email } },
    })
    expect(session).not.toBeNull()

    const lifetimeSeconds = (session!.expiresAt.getTime() - Date.now()) / 1000
    expect(lifetimeSeconds).toBeGreaterThan(110)
    expect(lifetimeSeconds).toBeLessThan(130)
  })
})
