import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import { logger } from '../../config/logger.js'

// Un id por petición, reutilizado si un proxy ya lo mandó, para poder cruzar logs.
const UNSAFE_CHARS = /[^A-Za-z0-9_-]/g
const MAX_LENGTH = 128

export type AccessLogPayload = {
  requestId: string
  method: string
  url: string
  status: number
  durationMs: number
}

export type RequestIdOptions = {
  accessLog?: boolean
  log?: (payload: AccessLogPayload, msg: string) => void
}

// El log de acceso se apaga por defecto: en producción el volumen lo paga el
// hosting y casi nunca se consulta. El `x-request-id` se pone siempre.
// `logger.info` va en un closure: pasado como valor pierde `this` y pino revienta.
export function createRequestId(options: RequestIdOptions = {}): RequestHandler {
  const { accessLog = false, log = (payload, msg) => logger.info(payload, msg) } = options

  return (req, res, next) => {
    const incoming = req.header('x-request-id')?.slice(0, MAX_LENGTH).replace(UNSAFE_CHARS, '')
    const id = incoming || randomUUID()
    const startedAt = Date.now()

    res.locals.requestId = id
    res.setHeader('x-request-id', id)

    if (accessLog) {
      res.on('finish', () => {
        log(
          {
            requestId: id,
            method: req.method,
            // La query puede llevar tokens (verify-email?token=): se descarta.
            url: req.originalUrl.replace(/\?.*$/, ''),
            status: res.statusCode,
            durationMs: Date.now() - startedAt,
          },
          'request',
        )
      })
    }

    next()
  }
}
