import 'dotenv/config'
import { z } from 'zod'

// `.env` suele traer variables opcionales como `CLAVE=`. Para Zod eso es un
// string vacío, no `undefined`, así que `.optional()` no basta. Se normaliza
// antes de validar: vacío equivale a no definido.
const emptyToUndefined = (value: unknown) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value

// Interpreta "true"/"false" como booleano real (z.coerce.boolean trataría
// la cadena "false" como true).
const booleanFlag = (defaultValue: 'true' | 'false') =>
  z
    .enum(['true', 'false'])
    .default(defaultValue)
    .transform((value) => value === 'true')

// Igual que booleanFlag, pero una variable vacía (`FLAG=`) equivale a ausente y
// toma el default en vez de romper el arranque.
const optionalBooleanFlag = (defaultValue: 'true' | 'false') =>
  z.preprocess(emptyToUndefined, booleanFlag(defaultValue))

// Esquema único: valida y tipa el entorno antes de arrancar.
export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.url(),
    CORS_ORIGIN: z.url().default('http://localhost:5173'),
    BETTER_AUTH_SECRET: z.string().min(32, 'Debe tener al menos 32 caracteres'),
    BETTER_AUTH_URL: z.url(),
    // Modo de autenticación. Cada proyecto derivado elige con qué se entra:
    //   credenciales on + proveedores  → ambos (default)
    //   credenciales on + sin parejas  → solo email/contraseña
    //   credenciales off + una pareja  → solo proveedores sociales
    // El registro se cierra con AUTH_SIGN_UP_ENABLED=false (paneles internos).
    AUTH_EMAIL_PASSWORD_ENABLED: optionalBooleanFlag('true'),
    AUTH_SIGN_UP_ENABLED: optionalBooleanFlag('true'),
    // Exige verificar el email antes de iniciar sesión con credenciales.
    // Default false: un email mal escrito no debe dejar al usuario sin acceso.
    AUTH_REQUIRE_EMAIL_VERIFICATION: optionalBooleanFlag('false'),
    // Proveedores sociales. Cada pareja es opcional, pero no se admite media
    // pareja: con solo el client id better-auth falla al construir la URL.
    GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    GOOGLE_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    GITHUB_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    GITHUB_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
    // Valor de `trust proxy` de Express. Ver parseTrustProxy en app.ts:
    //   false        → sin proxy delante (default seguro)
    //   1            → un salto (Vercel, Render, Railway, Fly.io, un Nginx)
    //   1,2          → varios saltos
    //   10.0.0.0/8   → lista de IPs/CIDR de confianza
    TRUST_PROXY: z.string().default('false'),
    // Minutos entre limpiezas de sesiones expiradas (default: 1 día).
    SESSION_CLEANUP_INTERVAL_MINUTES: z.coerce.number().int().positive().default(1440),
    // Nivel de logs de pino. En test se silencia para no ensuciar la salida.
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default(process.env.NODE_ENV === 'test' ? 'silent' : 'info'),
    // Email del usuario que `pnpm admin:bootstrap` promueve a ADMIN.
    // Vacío en .env equivale a no definido (el script falla con un mensaje claro).
    ADMIN_EMAIL: z.preprocess(emptyToUndefined, z.email().optional()),
    // Rate limit estricto de los endpoints sensibles (reset y verificación de
    // email). Activo por defecto salvo en test, donde se activa explícitamente.
    SENSITIVE_RATE_LIMIT_ENABLED: booleanFlag(process.env.NODE_ENV === 'test' ? 'false' : 'true'),
    SENSITIVE_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
    SENSITIVE_RATE_LIMIT_WINDOW_MINUTES: z.coerce.number().int().positive().default(15),
    // Email transaccional con Resend. Sin clave, en desarrollo se imprime el correo
    // en consola en vez de enviarlo; en producción es obligatoria.
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

    // Sin credenciales y sin proveedor la API arrancaría sin ninguna forma de
    // entrar: es un error de configuración, no un modo válido.
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
