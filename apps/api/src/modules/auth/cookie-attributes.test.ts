import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDatabase } from '../../test/db.js'

vi.mock('../../shared/email/email.service.js', () => ({
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}))

const credentials = {
  name: 'Cookie User',
  email: 'cookie@example.com',
  password: 'SuperSecret123!',
}

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('atributos de la cookie de sesión', () => {
  it('marca la cookie con SameSite=None y Secure cuando se pide cross-site', async () => {
    vi.stubEnv('COOKIE_SAME_SITE', 'none')
    vi.stubEnv('COOKIE_SECURE', 'true')
    vi.resetModules()
    const { app } = await import('../../app.js')

    await request(app).post('/api/auth/sign-up/email').send(credentials)
    const res = await request(app).post('/api/auth/sign-in/email').send(credentials)

    expect(res.headers['set-cookie']?.[0]).toMatch(/SameSite=None/i)
    expect(res.headers['set-cookie']?.[0]).toMatch(/Secure/i)
  })
})
