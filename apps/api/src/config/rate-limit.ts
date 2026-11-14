import rateLimit from 'express-rate-limit'
import type { Request } from 'express'
import { env } from './env.js'

const rateLimitMessage = {
  error: { code: 'RATE_LIMITED', message: 'Demasiadas peticiones' },
}

// Fuerza bruta: 100 peticiones/minuto sobre /auth; desactivado en tests.
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 100,
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitMessage,
})

// Límite estricto de endpoints sensibles; desactivado en test y activable por env.
const sensitiveOptions = {
  windowMs: env.SENSITIVE_RATE_LIMIT_WINDOW_MINUTES * 60_000,
  limit: env.SENSITIVE_RATE_LIMIT_MAX,
  skip: () => !env.SENSITIVE_RATE_LIMIT_ENABLED,
  standardHeaders: 'draft-8' as const,
  legacyHeaders: false,
  message: rateLimitMessage,
}

export const sensitiveIpRateLimit = rateLimit(sensitiveOptions)

// Máximo razonable de un email (RFC 5321); claves más largas solo aplican el límite por IP.
const MAX_EMAIL_KEY_LENGTH = 254

// Normaliza el email para compartir cubo y responde igual exista o no el usuario, así que el límite no sirve para enumerar cuentas.
function emailKey(req: Request, field: 'email' | 'newEmail'): string | undefined {
  const body: unknown = req.body
  if (typeof body !== 'object' || body === null) return undefined

  const raw = (body as Record<string, unknown>)[field]
  if (typeof raw !== 'string') return undefined

  const normalized = raw.trim().toLowerCase()
  if (normalized.length === 0 || normalized.length > MAX_EMAIL_KEY_LENGTH) return undefined

  return `email:${normalized}`
}

// Campo explícito por ruta: aceptar cualquier campo del body permitiría mover la clave con un email señuelo.
export const emailKeyFromBody = (req: Request): string | undefined => emailKey(req, 'email')

// change-email limita por newEmail, el buzón que recibe la verificación.
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

// Cada prefijo recibe su propia instancia para no compartir cubo.
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
