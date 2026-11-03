import { Router } from 'express'
import { sensitiveEmailRateLimit, sensitiveIpRateLimit } from '../../config/rate-limit.js'
import { validate } from '../../shared/middlewares/validate.js'
import * as authController from './auth.controller.js'
import { requireAuth } from './auth.middleware.js'
import {
  loginSchema,
  registerSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
  sendVerificationEmailSchema,
} from './auth.schema.js'

export const authRouter: Router = Router()

authRouter.post('/register', validate({ body: registerSchema }), authController.register)
authRouter.post('/login', validate({ body: loginSchema }), authController.login)
// Sin requireAuth: un logout debe limpiar la cookie aunque la sesión ya haya expirado.
authRouter.post('/logout', authController.logout)
authRouter.get('/session', requireAuth, authController.session)

// Recuperación de contraseña (respuestas genéricas: no revelan si el email existe).
// Rate limit estricto: por IP y, cuando el cuerpo trae email, también por email.
authRouter.post(
  '/forgot-password',
  sensitiveIpRateLimit,
  sensitiveEmailRateLimit,
  validate({ body: requestPasswordResetSchema }),
  authController.requestPasswordReset,
)
authRouter.post(
  '/reset-password',
  sensitiveIpRateLimit,
  sensitiveEmailRateLimit,
  validate({ body: resetPasswordSchema }),
  authController.resetPassword,
)

// Verificación de email.
authRouter.post(
  '/send-verification-email',
  sensitiveIpRateLimit,
  sensitiveEmailRateLimit,
  validate({ body: sendVerificationEmailSchema }),
  authController.sendVerificationEmail,
)
authRouter.get('/verify-email', authController.verifyEmail)
