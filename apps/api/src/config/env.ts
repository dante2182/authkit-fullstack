import 'dotenv/config'
import { z } from 'zod'

// Esquema único: valida y tipa el entorno antes de arrancar.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.url(),
  CORS_ORIGIN: z.url().default('http://localhost:5173'),
  BETTER_AUTH_SECRET: z.string().min(32, 'Debe tener al menos 32 caracteres'),
  BETTER_AUTH_URL: z.url(),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Falla rápido y legible si falta o está mal alguna variable.
  console.error('Variables de entorno inválidas:\n' + z.prettifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
