import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { prisma } from '../../config/prisma.js'
import { resetDatabase } from '../../test/db.js'

vi.mock('../../shared/email/email.service.js', () => ({
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}))

beforeEach(async () => {
  await resetDatabase()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

async function loadLimitedApp(max: string) {
  vi.stubEnv('SENSITIVE_RATE_LIMIT_ENABLED', 'true')
  vi.stubEnv('SENSITIVE_RATE_LIMIT_MAX', max)
  // IPs distintas por petición: así el límite por IP no enmascara el de email.
  vi.stubEnv('TRUST_PROXY', '1')
  vi.resetModules()
  const { app } = await import('../../app.js')
  return app
}

describe('rate limit de endpoints sensibles', () => {
  it('devuelve 429 al superar el límite por IP', async () => {
    vi.stubEnv('SENSITIVE_RATE_LIMIT_ENABLED', 'true')
    vi.stubEnv('SENSITIVE_RATE_LIMIT_MAX', '2')

    // Se reimporta la app para que el limitador lea el env con el stub aplicado.
    vi.resetModules()
    const { app } = await import('../../app.js')

    const attempt = () =>
      request(app).post('/api/auth/request-password-reset').send({ email: 'no-es-un-email' })

    expect((await attempt()).status).toBe(400)
    expect((await attempt()).status).toBe(400)

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
      request(app).post('/api/auth/request-password-reset').send({ email: 'no-es-un-email' })

    expect((await attempt()).status).toBe(400)
    expect((await attempt()).status).toBe(400)
    expect((await attempt()).status).toBe(400)
  })
})

describe('rate limit por email de endpoints sensibles', () => {
  it('normaliza el email a minúsculas y no depende de la IP', async () => {
    const app = await loadLimitedApp('2')

    const attempt = (email: string, ip: string) =>
      request(app)
        .post('/api/auth/request-password-reset')
        .set('X-Forwarded-For', ip)
        .send({ email })

    expect((await attempt('User@Example.com', '10.0.0.1')).status).toBe(200)
    expect((await attempt('user@example.com', '10.0.0.2')).status).toBe(200)

    const blocked = await attempt('  USER@EXAMPLE.COM  ', '10.0.0.3')
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
  })

  it('se aplica también al reenvío de verificación de email', async () => {
    const app = await loadLimitedApp('2')

    const attempt = (ip: string) =>
      request(app)
        .post('/api/auth/send-verification-email')
        .set('X-Forwarded-For', ip)
        .send({ email: 'verify@example.com' })

    expect((await attempt('10.0.1.1')).status).not.toBe(429)
    expect((await attempt('10.0.1.2')).status).not.toBe(429)
    expect((await attempt('10.0.1.3')).status).toBe(429)
  })

  it('responde igual para un email existente y uno desconocido', async () => {
    await prisma.user.create({
      data: {
        id: 'existing-user',
        name: 'Existing',
        email: 'exists@example.com',
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    })
    const app = await loadLimitedApp('1')

    const attempt = (email: string, ip: string) =>
      request(app)
        .post('/api/auth/request-password-reset')
        .set('X-Forwarded-For', ip)
        .send({ email })

    const existing = [
      (await attempt('exists@example.com', '10.0.2.1')).status,
      (await attempt('exists@example.com', '10.0.2.2')).status,
    ]
    const unknown = [
      (await attempt('unknown@example.com', '10.0.3.1')).status,
      (await attempt('unknown@example.com', '10.0.3.2')).status,
    ]

    expect(existing).toEqual([200, 429])
    expect(unknown).toEqual(existing)
  })
})
