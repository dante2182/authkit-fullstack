import { APIError } from 'better-auth/api'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from './app-error.js'

// Traduce cualquier error a la forma { error: { code, message, details? } }.
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: { code: err.code, message: err.message, details: err.details },
    })
    return
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Datos inválidos',
        details: err.issues,
      },
    })
    return
  }

  if (err instanceof APIError) {
    res.status(err.statusCode).json({
      error: {
        code: err.body?.code ?? 'AUTH_ERROR',
        message: err.body?.message ?? 'Error de autenticación',
      },
    })
    return
  }

  console.error(err)
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  })
}
