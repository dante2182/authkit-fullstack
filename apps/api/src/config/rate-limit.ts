import rateLimit from 'express-rate-limit'
import type { Request } from 'express'
import { env } from './env.js'

const rateLimitMessage = {
  error: { code: 'RATE_LIMITED', message: 'Demasiadas peticiones' },
}

// Fuerza bruta: 100 peticiones por minuto sobre /auth.
// En tests se desactiva: las suites hacen muchas peticiones seguidas desde la misma IP.
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 100,
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitMessage,
})

// Límite estricto para endpoints sensibles (reset y verificación de email).
// En test está desactivado; se activa por env en el test que comprueba el 429.
const sensitiveOptions = {
  windowMs: env.SENSITIVE_RATE_LIMIT_WINDOW_MINUTES * 60_000,
  limit: env.SENSITIVE_RATE_LIMIT_MAX,
  skip: () => !env.SENSITIVE_RATE_LIMIT_ENABLED,
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  message: rateLimitMessage,
}

export const sensitiveIpRateLimit = rateLimit(sensitiveOptions)

// Longitud máxima razonable de un email (RFC 5321). Una clave más larga no es
// un email: se ignora y solo aplica el límite por IP.
const MAX_EMAIL_KEY_LENGTH = 254

// Clave del límite por email: minúsculas y sin espacios, para que todas las
// variantes del mismo buzón compartan cubo. El limitador se aplica antes de
// mirar la base, así que responde igual exista o no el usuario y no sirve para
// enumerar cuentas.
function emailKey(req: Request, field: 'email' | 'newEmail'): string | undefined {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) return undefined

  const raw = (body as Record<string, unknown>)[field]
  if (typeof raw !== 'string') return undefined

  const normalized = raw.trim().toLowerCase()
  if (normalized.length === 0 || normalized.length > MAX_EMAIL_KEY_LENGTH) return undefined

  return `email:${normalized}`
}

// Campo explícito por ruta, nunca "el que venga en el body": si el limitador
// aceptara cualquier campo, un body con un `email` de señuelo movería la clave
// y esquivaría el cubo del buzón real.
export const emailKeyFromBody = (req: Request): string | undefined => emailKey(req, 'email')

// El cambio de email envía la verificación a `newEmail`, no al correo de la
// cuenta: ese es el buzón que hay que limitar.
export const newEmailKeyFromBody = (req: Request): string | undefined => emailKey(req, 'newEmail')

function createEmailRateLimit(keyOf: (req: Request) => string | undefined) {
  return rateLimit({
    ...sensitiveOptions,
    skip: (req) => !env.SENSITIVE_RATE_LIMIT_ENABLED || keyOf(req) === undefined,
    keyGenerator: (req) => keyOf(req) ?? '',
    // La clave es el email, no la IP: se declara para no disparar el aviso.
    validate: { keyGeneratorIpFallback: false },
  })
}

// Requiere `express.json()` montado antes en la ruta: sin body no hay clave.
export const sensitiveEmailRateLimit = createEmailRateLimit(emailKeyFromBody)
export const sensitiveNewEmailRateLimit = createEmailRateLimit(newEmailKeyFromBody)

// Límite general de las rutas de negocio. Cada prefijo recibe su propia
// instancia para que el consumo de /users no gaste el cubo de /admin.
function createApiRateLimit() {
  return rateLimit({
    windowMs: env.API_RATE_LIMIT_WINDOW_MINUTES * 60_000,
    limit: env.API_RATE_LIMIT_MAX,
    skip: () => !env.API_RATE_LIMIT_ENABLED,
    standardHeaders: 'draft-8' as const,
    legacyHeaders: false,
    message: rateLimitMessage,
  })
}

export const usersRateLimit = createApiRateLimit()
export const adminRateLimit = createApiRateLimit()
