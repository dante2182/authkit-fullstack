import rateLimit, { ipKeyGenerator } from 'express-rate-limit'
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

// Segundo cubo por email: frena el abuso dirigido a una misma víctima desde
// varias IPs. Sin email en el cuerpo (p. ej. reset-password) actúa solo el de IP.
export const sensitiveEmailRateLimit = rateLimit({
  ...sensitiveOptions,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''
    return email || ipKeyGenerator(req.ip ?? '')
  },
})
