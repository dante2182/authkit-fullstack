import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../shared/email/email.service.js', () => ({
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}))

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('rate limit de endpoints sensibles', () => {
  it('devuelve 429 al superar el límite por IP', async () => {
    vi.stubEnv('SENSITIVE_RATE_LIMIT_ENABLED', 'true')
    vi.stubEnv('SENSITIVE_RATE_LIMIT_MAX', '2')

    // Se reimporta la app para que el limitador lea el env con el stub aplicado.
    vi.resetModules()
    const { app } = await import('../../app.js')

    const attempt = () =>
      request(app).post('/api/auth/forgot-password').send({ email: 'no-es-un-email' })

    expect((await attempt()).status).toBe(422)
    expect((await attempt()).status).toBe(422)

    const blocked = await attempt()
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
  })

  it('no limita cuando el flag está desactivado', async () => {
    vi.stubEnv('SENSITIVE_RATE_LIMIT_ENABLED', 'false')
    vi.stubEnv('SENSITIVE_RATE_LIMIT_MAX', '1')

    vi.resetModules()
    const { app } = await import('../../app.js')

    const attempt = () =>
      request(app).post('/api/auth/forgot-password').send({ email: 'no-es-un-email' })

    expect((await attempt()).status).toBe(422)
    expect((await attempt()).status).toBe(422)
    expect((await attempt()).status).toBe(422)
  })
})
