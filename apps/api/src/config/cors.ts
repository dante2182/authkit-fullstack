import type { CorsOptions } from 'cors'
import { env } from './env.js'

// Credenciales activas: la cookie de sesión viaja entre :5173 y :4000.
export const corsOptions: CorsOptions = {
  origin: env.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}
