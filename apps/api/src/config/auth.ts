import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailService, type EmailMessage } from '../shared/email/email.service.js'
import { passwordResetEmail, verificationEmail } from '../shared/email/templates.js'
import { buildSocialProvidersConfig } from './auth-capabilities.js'
import { env } from './env.js'
import { prisma } from './prisma.js'

// better-auth espera a que el callback termine, así que aquí NO se hace await del
// envío: el correo sale en segundo plano y un fallo de Resend se registra sin
// romper la petición del usuario.
function sendEmailInBackground(message: EmailMessage): void {
  void emailService.send(message).catch((error: unknown) => {
    console.error(`[email] No se pudo enviar "${message.subject}":`, error)
  })
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  // baseURL es el origen; basePath completa las URLs que genera better-auth
  // (callbacks, emails). Coincide con el montaje real: /api/auth/*.
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: env.AUTH_EMAIL_PASSWORD_ENABLED,
    // Registro cerrado: los usuarios existentes siguen entrando con contraseña.
    disableSignUp: !env.AUTH_SIGN_UP_ENABLED,
    // Un reset de contraseña revoca todas las sesiones abiertas del usuario.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      sendEmailInBackground(passwordResetEmail({ to: user.email, name: user.name }, url))
    },
  },
  emailVerification: {
    // El endpoint nativo POST /api/auth/sign-up/email envía el correo solo si
    // esta opción está activa. El registro no queda bloqueado: la verificación
    // es opcional para iniciar sesión.
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      sendEmailInBackground(verificationEmail({ to: user.email, name: user.name }, url))
    },
  },
  // Cada proveedor se registra solo con su pareja completa de credenciales.
  socialProviders: buildSocialProvidersConfig(),
  user: {
    additionalFields: {
      // El rol viaja en `session.user.role` y en `req.auth.user.role`.
      // `input: false` es obligatorio: sin él, better-auth aceptaría un `role`
      // enviado en el body de /register y cualquiera podría crearse un ADMIN.
      role: {
        type: 'string',
        required: false,
        defaultValue: 'USER',
        input: false,
      },
    },
  },
  // NO activar session.cookieCache. Con la caché activa, better-auth devuelve
  // session+user (incluido `role`) desde una cookie firmada y deja de leer la
  // base en cada petición: un administrador degradado conservaría privilegios
  // hasta que caduque la caché. Sin cookieCache, getSession llama a
  // internalAdapter.findSession(token) por request y el rol siempre es fresco
  // (ver src/modules/admin/admin.test.ts, test de frescura del rol).
  // Joins de Prisma: requiere las relaciones del schema.
  advanced: { database: { joins: true } },
})
