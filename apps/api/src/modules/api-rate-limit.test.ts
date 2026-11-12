import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../shared/email/email.service.js', () => ({
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}))

// `env` y el limitador se leen una sola vez al importar: hay que reiniciar
// módulos después de stubear las variables para que la app las use.
async function loadApp(enabled: 'true' | 'false', max = '2') {
  vi.stubEnv('API_RATE_LIMIT_ENABLED', enabled)
  vi.stubEnv('API_RATE_LIMIT_MAX', max)
  vi.stubEnv('API_RATE_LIMIT_WINDOW_MINUTES', '1')
  vi.resetModules()
  const { app } = await import('../app.js')
  return app
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('rate limit general de las rutas de negocio', () => {
  it('limita /api/users', async () => {
    const app = await loadApp('true')

    // Sin sesión responden 401, pero cuentan igual: el límite va antes del router.
    expect((await request(app).get('/api/users/me')).status).toBe(401)
    expect((await request(app).get('/api/users/me')).status).toBe(401)

    const blocked = await request(app).get('/api/users/me')
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
  })

  it('limita /api/admin', async () => {
    const app = await loadApp('true')

    expect((await request(app).get('/api/admin/users')).status).toBe(401)
    expect((await request(app).get('/api/admin/users')).status).toBe(401)

    const blocked = await request(app).get('/api/admin/users')
    expect(blocked.status).toBe(429)
    expect(blocked.body.error.code).toBe('RATE_LIMITED')
  })

  it('no limita cuando el flag está desactivado', async () => {
    const app = await loadApp('false', '1')

    expect((await request(app).get('/api/users/me')).status).toBe(401)
    expect((await request(app).get('/api/users/me')).status).toBe(401)
    expect((await request(app).get('/api/users/me')).status).toBe(401)
  })
})
