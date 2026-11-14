import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import { emailService, type EmailMessage } from '../shared/email/email.service.js'
import {
  emailChangeConfirmationEmail,
  passwordResetEmail,
  verificationEmail,
} from '../shared/email/templates.js'
import { buildSocialProvidersConfig } from './auth-capabilities.js'
import { env } from './env.js'
import { prisma } from './prisma.js'

// No se espera el envío: un fallo de Resend se registra y no rompe la petición.
function sendEmailInBackground(message: EmailMessage): void {
  void emailService.send(message).catch((error: unknown) => {
    console.error(`[email] No se pudo enviar "${message.subject}":`, error)
  })
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),
  // baseURL es el origen; basePath completa las URLs generadas (/api/auth/*).
  baseURL: env.BETTER_AUTH_URL,
  basePath: '/api/auth',
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [env.CORS_ORIGIN],
  emailAndPassword: {
    enabled: env.AUTH_EMAIL_PASSWORD_ENABLED,
    // Registro cerrado: los usuarios existentes siguen entrando con contraseña.
    disableSignUp: !env.AUTH_SIGN_UP_ENABLED,
    // Activa: email sin verificar no entra con contraseña (403); el login social no se ve afectado.
    requireEmailVerification: env.AUTH_REQUIRE_EMAIL_VERIFICATION,
    // Un reset de contraseña revoca todas las sesiones abiertas del usuario.
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      sendEmailInBackground(passwordResetEmail({ to: user.email, name: user.name }, url))
    },
  },
  emailVerification: {
    // Envía el correo al registrarse, pero la verificación no bloquea el login.
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      sendEmailInBackground(verificationEmail({ to: user.email, name: user.name }, url))
    },
  },
  // Duración en segundos; updateAge renueva la expiración al usar la sesión pasado ese tiempo.
  session: {
    expiresIn: env.SESSION_EXPIRES_IN,
    updateAge: env.SESSION_UPDATE_AGE,
  },
  // Account linking: trustedProviders se deja vacío a propósito; un proveedor listado
  // se vincularía sin que el IdP confirme el email, el bypass que queremos evitar.
  account: {
    accountLinking: {
      enabled: true,
      allowDifferentEmails: false,
      trustedProviders: [],
    },
  },
  // Cada proveedor se registra solo con su pareja completa de credenciales.
  socialProviders: buildSocialProvidersConfig(),
  user: {
    additionalFields: {
      // input: false es obligatorio: sin él, un role enviado en /register crearía un ADMIN.
      role: {
        type: 'string',
        required: false,
        defaultValue: 'USER',
        input: false,
      },
    },
    // Cambio de email en dos pasos: el enlace va al buzón ACTUAL y la dirección solo
    // cambia al confirmar desde el NUEVO; updateEmailWithoutVerification=false impide saltarlo.
    changeEmail: {
      enabled: true,
      updateEmailWithoutVerification: false,
      sendChangeEmailConfirmation: async ({ user, newEmail, url }) => {
        sendEmailInBackground(
          emailChangeConfirmationEmail({ to: user.email, name: user.name }, newEmail, url),
        )
      },
    },
  },
  // NO activar session.cookieCache: un admin degradado conservaría privilegios hasta que caduque.

  // Joins de Prisma: requiere las relaciones del schema.
  advanced: { database: { joins: true } },
})
