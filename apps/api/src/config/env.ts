import 'dotenv/config'
import { z } from 'zod'

// Interpreta "true"/"false" como booleano real (z.coerce.boolean trataría
// la cadena "false" como true).
const booleanFlag = (defaultValue: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true')

// Esquema único: valida y tipa el entorno antes de arrancar.
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.url(),
    CORS_ORIGIN: z.url().default('http://localhost:5173'),
    BETTER_AUTH_SECRET: z.string().min(32, 'Debe tener al menos 32 caracteres'),
    BETTER_AUTH_URL: z.url(),
    // Valor de `trust proxy` de Express. Ver parseTrustProxy en app.ts:
    //   false        → sin proxy delante (default seguro)
    //   1            → un salto (Vercel, Render, Railway, Fly.io, un Nginx)
    //   1,2          → varios saltos
    //   10.0.0.0/8   → lista de IPs/CIDR de confianza
    TRUST_PROXY: z.string().default('false'),
    // Minutos entre limpiezas de sesiones expiradas (default: 1 día).
    SESSION_CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().positive().default(1440),
    // Rate limit estricto de los endpoints sensibles (reset y verificación de
    // email). Activo por defecto salvo en test, donde se activa explícitamente.
    SENSITIVE_RATE_LIMIT_ENABLED: booleanFlag(process.env.NODE_ENV === 'test' ? 'false' : 'true'),
    SENSITIVE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
    SENSITIVE_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    // Email transaccional con Resend. Sin clave, en desarrollo se imprime el correo
    // en consola en vez de enviarlo; en producción es obligatoria.
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(1).default('AuthKit <no-reply@authkit.local>'),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV !== 'production') return
    if (!value.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'Obligatorio en producción: sin él no salen los correos de reset y verificación',
      })
    }
  })

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  // Falla rápido y legible si falta o está mal alguna variable.
  console.error('Variables de entorno inválidas:\n' + z.prettifyError(parsed.error))
  process.exit(1)
}

export const env = parsed.data
