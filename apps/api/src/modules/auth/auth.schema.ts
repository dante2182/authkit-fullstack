import { z } from 'zod'

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.email(),
  password: z.string().min(8).max(128),
})

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})

export const requestPasswordResetSchema = z.object({
  email: z.email(),
  // A dónde redirige el enlace del correo tras validar el token. Debe ser un origen de confianza.
  redirectTo: z.url().optional(),
})

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).max(128),
  token: z.string().min(1),
})

export const sendVerificationEmailSchema = z.object({
  email: z.email(),
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
  // Revoca el resto de sesiones y emite una nueva para la actual.
  revokeOtherSessions: z.boolean().optional(),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
export type SendVerificationEmailInput = z.infer<typeof sendVerificationEmailSchema>
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>
