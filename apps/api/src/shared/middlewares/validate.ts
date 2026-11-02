import type { RequestHandler } from 'express'
import type { ZodType } from 'zod'

interface ValidationSchemas {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

// Parsea body/query/params y deja el resultado tipado en la request.
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req, _res, next) => {
    if (schemas.body) req.body = schemas.body.parse(req.body)
    if (schemas.params) {
      req.params = schemas.params.parse(req.params) as typeof req.params
    }
    if (schemas.query) {
      // En Express 5 req.query es un getter de solo lectura: se redefine.
      Object.defineProperty(req, 'query', {
        value: schemas.query.parse(req.query),
        writable: true,
        configurable: true,
      })
    }
    next()
  }
}
