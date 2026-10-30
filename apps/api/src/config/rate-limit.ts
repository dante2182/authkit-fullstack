import rateLimit from 'express-rate-limit'

// Fuerza bruta: 100 peticiones por minuto sobre /auth.
export const authRateLimit = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    error: { code: 'RATE_LIMITED', message: 'Demasiadas peticiones' },
  },
})
