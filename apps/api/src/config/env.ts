import 'dotenv/config'
import { z } from 'zod'

// `.env` trae `CLAVE=` como string vacío, no undefined: se normaliza a undefined antes de validar.
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

// z.coerce.boolean trataría "false" como true; esto lo interpreta como booleano real.
const booleanFlag = (defaultValue: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true')

// Como booleanFlag, pero `FLAG=` vacío toma el default en vez de romper el arranque.
const optionalBooleanFlag = (defaultValue: 'true' | 'false') =>
  z.preprocess(emptyToUndefined, booleanFlag(defaultValue))

// Entero positivo donde `VAR=` vacío equivale a ausente (toma el default).
const optionalPositiveInt = (defaultValue: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(defaultValue))

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.url(),
    CORS_ORIGIN: z.url().default('http://localhost:5173'),
    BETTER_AUTH_SECRET: z.string().min(32, 'Debe tener al menos 32 caracteres'),
    BETTER_AUTH_URL: z.url(),
    // Modo de autenticación: credenciales y proveedores son independientes; el registro
    // se cierra con AUTH_SIGN_UP_ENABLED=false (paneles internos).
    AUTH_EMAIL_PASSWORD_ENABLED: optionalBooleanFlag('true'),
    AUTH_SIGN_UP_ENABLED: optionalBooleanFlag('true'),
    // Exige verificar el email para entrar con credenciales. Default false: no bloquear un email mal escrito.
    AUTH_REQUIRE_EMAIL_VERIFICATION: optionalBooleanFlag('false'),
    // Cada pareja es opcional, pero media pareja falla al construir la URL de better-auth.
    GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    GOOGLE_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    GITHUB_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    GITHUB_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    // Valor de `trust proxy`: false sin proxy, 1 un salto (Vercel, Render...), 1,2 varios
    // saltos, o lista de IPs/CIDR. Ver parseTrustProxy en app.ts.
    TRUST_PROXY: z.string().default('false'),
    // Minutos entre limpiezas de sesiones expiradas (default: 1 día).
    SESSION_CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().positive().default(1440),
    // Duración y renovación en segundos. Defaults de better-auth: 7 días y 1 día.
    SESSION_EXPIRES_IN: optionalPositiveInt(604800),
    SESSION_UPDATE_AGE: optionalPositiveInt(86400),
    // Nivel de logs de pino. En test se silencia para no ensuciar la salida.
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default(process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
    // Email que `pnpm admin:bootstrap` promueve a ADMIN; vacío equivale a no definido.
    ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.email().optional()),
    // Rate limit estricto de endpoints sensibles; activo salvo en test, donde se activa por env.
    SENSITIVE_RATE_LIMIT_ENABLED: booleanFlag(process.env.NODE_ENV === 'test' ? 'false' : 'true'),
    SENSITIVE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
    SENSITIVE_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    // Rate limit general de /users y /admin, más holgado que el de auth.
    API_RATE_LIMIT_ENABLED: booleanFlag(process.env.NODE_ENV === 'test' ? 'false' : 'true'),
    API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
    API_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(1),
    // Sin clave, en desarrollo se imprime el correo en consola; en producción es obligatoria.
    RESEND_API_KEY: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    EMAIL_FROM: z.string().min(1).default('AuthKit <no-reply@authkit.local>'),
  })
  .superRefine((value, ctx) => {
    let hasCompleteProvider = false

    for (const provider of ['GOOGLE', 'GITHUB'] as const) {
      const id = value[`${provider}_CLIENT_ID`]
      const secret = value[`${provider}_CLIENT_SECRET`]

      if (Boolean(id) !== Boolean(secret)) {
        ctx.addIssue({
          code: 'custom',
          path: [`${provider}_CLIENT_ID`],
          message: `${provider}_CLIENT_ID y ${provider}_CLIENT_SECRET deben definirse juntos`,
        })
      }

      if (id && secret) hasCompleteProvider = true
    }

    // Sin credenciales y sin proveedor la API no tendría forma de entrar: error de configuración.
    if (!value.AUTH_EMAIL_PASSWORD_ENABLED && !hasCompleteProvider) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_EMAIL_PASSWORD_ENABLED'],
        message:
          'Sin email/contraseña hace falta al menos un proveedor social completo (GOOGLE_* o GITHUB_*)',
      })
    }

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
