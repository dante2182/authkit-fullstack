import { APIError } from 'better-auth/api'
import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { AppError } from './app-error.js'

const CLIENT_ERROR_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
}

const CLIENT_ERROR_MESSAGES: Record<number, string> = {
  400: 'Solicitud inválida',
  413: 'Cuerpo de la petición demasiado grande',
  415: 'Tipo de contenido no soportado',
}

function isClientHttpError(err: unknown): err is { status: number } {
  if (typeof err !== 'object' || err === null || !('status' in err)) return false
  const status = (err as { status: unknown }).status
  return typeof status === 'number' && status >= 400 && status < 500
}

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

  // Errores de cliente de Express (JSON malformado, payload grande, etc.).
  if (isClientHttpError(err)) {
    res.status(err.status).json({
      error: {
        code: CLIENT_ERROR_CODES[err.status] ?? 'CLIENT_ERROR',
        message: CLIENT_ERROR_MESSAGES[err.status] ?? 'Solicitud inválida',
      },
    })
    return
  }

  console.error(err)
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' },
  })
}
