import express from 'express'
import request from 'supertest'
import { describe, expect, it, vi } from 'vitest'
import { app } from '../../app.js'
import { createRequestId } from './request-id.js'

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

function buildApp(options: Parameters<typeof createRequestId>[0]) {
  const instance = express()
  instance.use(createRequestId(options))
  instance.get('/ping', (_req, res) => {
    res.json({ ok: true })
  })
  return instance
}

describe('log de acceso', () => {
  it('no registra nada cuando está apagado', async () => {
    const log = vi.fn()
    await request(buildApp({ accessLog: false, log })).get('/ping')
    expect(log).not.toHaveBeenCalled()
  })

  it('registra método, path sin query, estado y duración cuando está encendido', async () => {
    const log = vi.fn()
    const res = await request(buildApp({ accessLog: true, log })).get('/ping?token=secreto')

    expect(res.headers['x-request-id']).toBeDefined()
    expect(log).toHaveBeenCalledTimes(1)
    expect(log.mock.calls[0]?.[0]).toMatchObject({ method: 'GET', url: '/ping', status: 200 })
  })

  it('el logger por defecto no pierde el contexto de pino al llamarse desacoplado', async () => {
    vi.resetModules()
    vi.stubEnv('LOG_LEVEL', 'info')
    const { createRequestId: fresh } = await import('./request-id.js')

    const handler = fresh({ accessLog: true })
    const listeners: Record<string, () => void> = {}
    const res = {
      locals: {},
      statusCode: 200,
      setHeader: () => {},
      on: (event: string, cb: () => void) => {
        listeners[event] = cb
      },
    }
    const req = { header: () => undefined, method: 'GET', originalUrl: '/ping' }

    handler(req as never, res as never, () => {})

    expect(() => listeners.finish?.()).not.toThrow()
    vi.unstubAllEnvs()
    vi.resetModules()
  })
})
