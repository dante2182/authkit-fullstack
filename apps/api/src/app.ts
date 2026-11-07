import cors from 'cors'
import express from 'express'
import type { Express } from 'express'
import helmet from 'helmet'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './config/auth.js'
import { corsOptions } from './config/cors.js'
import { env } from './config/env.js'
import { authRateLimit, sensitiveIpRateLimit } from './config/rate-limit.js'
import { healthRouter } from './modules/health/health.routes.js'
import { router } from './routes/index.js'
import { errorHandler } from './shared/errors/error-handler.js'
import { notFoundHandler } from './shared/middlewares/not-found.js'

// Traduce TRUST_PROXY al valor que espera Express.
// `true` se rechaza: confiar en cualquier proxy permite falsificar la IP y
// saltarse el rate limit (express-rate-limit lo bloquea en tiempo de petición).
export function parseTrustProxy(value: string): boolean | number | string[] {
  const trimmed = value.trim()

  if (trimmed === '' || trimmed === 'false') return false
  if (trimmed === 'true') {
    throw new Error(
      'TRUST_PROXY=true no está permitido: indica el número de proxies (p. ej. 1) o una lista de IPs/CIDR',
    )
  }
  if (/^\d+$/.test(trimmed)) return Number(trimmed)

  return trimmed
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

export const trustProxy = parseTrustProxy(env.TRUST_PROXY)

if (env.NODE_ENV === 'production' && trustProxy === false) {
  console.warn('[server] TRUST_PROXY=false en producción: revisa si hay un proxy delante')
}

export const app: Express = express()

// Necesario para que req.ip y el rate limit usen la IP real tras el proxy.
app.set('trust proxy', trustProxy)
app.disable('x-powered-by')

app.use(helmet())
app.use(cors(corsOptions))

// Fija el callback de los enlaces de correo al frontend configurado. better-auth
// acepta cualquier callbackURL; sin esta guarda un enlace manipulado podría
// redirigir fuera del sitio. Se reescribe la query antes del handler nativo.
function forceCallbackURL(callbackURL: string) {
  return (req: express.Request, _res: express.Response, next: express.NextFunction): void => {
    if (req.method !== 'GET') {
      next()
      return
    }

    const [pathname, search = ''] = req.url.split('?')
    const params = new URLSearchParams(search)
    params.set('callbackURL', callbackURL)
    req.url = `${pathname}?${params.toString()}`
    next()
  }
}

app.use('/api/auth/verify-email', forceCallbackURL(`${env.CORS_ORIGIN}/verify-email`))
app.use('/api/auth/reset-password', forceCallbackURL(`${env.CORS_ORIGIN}/reset-password`))

// Better-Auth nativo. Debe montarse ANTES de express.json(): toNodeHandler lee
// el cuerpo crudo de la petición, y un parser previo lo consumiría (body vacío).
// Rutas nativas: /sign-up/email, /sign-in/email, /sign-out, /get-session,
// /callback/:provider, /request-password-reset, /reset-password, etc.
app.use('/api/auth', authRateLimit)
app.use('/api/auth/request-password-reset', sensitiveIpRateLimit)
app.use('/api/auth/reset-password', sensitiveIpRateLimit)
app.use('/api/auth/send-verification-email', sensitiveIpRateLimit)
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

// Sonda de infraestructura fuera de /api: el balanceador no debe depender del prefijo público.
app.use('/health', healthRouter)

app.use('/api', router)
app.use(notFoundHandler)
app.use(errorHandler)
