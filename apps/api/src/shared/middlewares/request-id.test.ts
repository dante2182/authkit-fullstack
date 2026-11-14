import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { app } from '../../app.js'

describe('request id', () => {
  it('genera un id cuando la petición no lo trae', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('respeta el id que manda el proxy', async () => {
    const res = await request(app).get('/health').set('x-request-id', 'abc-123')
    expect(res.headers['x-request-id']).toBe('abc-123')
  })
})

describe('request id: log', () => {
  it('no registra la query, que puede llevar tokens', async () => {
    const { logger } = await import('../../config/logger.js')
    const spy = vi.spyOn(logger, 'info')

    await request(app).get('/health?token=secreto')

    const payload = spy.mock.calls.at(-1)?.[0] as { url?: string } | undefined
    expect(payload?.url).toBe('/health')
    spy.mockRestore()
  })
})
