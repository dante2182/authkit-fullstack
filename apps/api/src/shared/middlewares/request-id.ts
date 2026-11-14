import { randomUUID } from 'node:crypto'
import type { RequestHandler } from 'express'
import { logger } from '../../config/logger.js'

// Un id por petición, reutilizado si un proxy ya lo mandó, para poder cruzar logs.
const UNSAFE_CHARS = /[^A-Za-z0-9_-]/g
const MAX_LENGTH = 128

export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.header('x-request-id')?.slice(0, MAX_LENGTH).replace(UNSAFE_CHARS, '')
  const id = incoming || randomUUID()
  const startedAt = Date.now()

  res.locals.requestId = id
  res.setHeader('x-request-id', id)

  res.on('finish', () => {
    logger.info(
      {
        requestId: id,
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      },
      'request',
    )
  })

  next()
}
