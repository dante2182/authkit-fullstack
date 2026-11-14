import cors from 'cors'
import express from 'express'
import type { Express } from 'express'
import helmet from 'helmet'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './config/auth.js'
import { corsOptions } from './config/cors.js'
import { env } from './config/env.js'
import {
  adminRateLimit,
  authRateLimit,
  sensitiveEmailRateLimit,
  sensitiveIpRateLimit,
  sensitiveNewEmailRateLimit,
  usersRateLimit,
} from './config/rate-limit.js'
import { healthRouter } from './modules/health/health.routes.js'
import { router } from './routes/index.js'
import { errorHandler } from './shared/errors/error-handler.js'
import { notFoundHandler } from './shared/middlewares/not-found.js'

// `true` se rechaza: confiar en cualquier proxy permite falsificar la IP y saltarse el rate limit.
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

// Fija el callback de los enlaces: sin esto un callbackURL manipulado redirige fuera del sitio.
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

// Better-Auth nativo: debe montarse ANTES de express.json() o el parser consume el body crudo.
app.use('/api/auth', authRateLimit)
// El límite por email necesita el body; better-call reutiliza req.body, así que el handler nativo sigue viendo el mismo JSON.
const parseSensitiveBody = express.json()
app.use(
  '/api/auth/request-password-reset',
  parseSensitiveBody,
  sensitiveIpRateLimit,
  sensitiveEmailRateLimit,
)
app.use(
  '/api/auth/reset-password',
  parseSensitiveBody,
  sensitiveIpRateLimit,
  sensitiveEmailRateLimit,
)
app.use(
  '/api/auth/send-verification-email',
  parseSensitiveBody,
  sensitiveIpRateLimit,
  sensitiveEmailRateLimit,
)
// change-email limita por newEmail: un email de señuelo en el body no mueve el cubo.
app.use(
  '/api/auth/change-email',
  parseSensitiveBody,
  sensitiveIpRateLimit,
  sensitiveNewEmailRateLimit,
)
app.all('/api/auth/*splat', toNodeHandler(auth))

app.use(express.json())

// Sonda de infraestructura fuera de /api: el balanceador no debe depender del prefijo público.
app.use('/health', healthRouter)

// Límite general antes del router para contar también las peticiones sin sesión.
app.use('/api/users', usersRateLimit)
app.use('/api/admin', adminRateLimit)

app.use('/api', router)
app.use(notFoundHandler)
app.use(errorHandler)
