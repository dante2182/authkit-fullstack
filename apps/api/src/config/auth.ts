import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailService, type EmailMessage } from '../shared/email/email.service.js'
import { passwordResetEmail, verificationEmail } from '../shared/email/templates.js'
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
    enabled: true,
    // Un reset de contraseña revoca todas las sesiones abiertas del usuario.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      sendEmailInBackground(passwordResetEmail({ to: user.email, name: user.name }, url))
    },
  },
  emailVerification: {
    // Se envía desde el controlador de registro para fijar el callback del frontend.
    sendVerificationEmail: async ({ user, url }) => {
      sendEmailInBackground(verificationEmail({ to: user.email, name: user.name }, url))
    },
  },
  // Joins de Prisma: requiere las relaciones del schema.
  advanced: { database: { joins: true } },
})
