import { request } from '@/services/http'
import type {
  AuthUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SessionResponse,
} from '../types'

// Única puerta de entrada a los endpoints de autenticación de la API.
// La cookie de sesión viaja sola: `request` ya usa `credentials: 'include'`.
export const authService = {
  register(input: RegisterInput) {
    return request<{ user: AuthUser }>('/auth/register', { method: 'POST', body: input })
  },

  login(input: LoginInput) {
    return request<{ user: AuthUser }>('/auth/login', { method: 'POST', body: input })
  },

  logout() {
    return request<{ success: boolean }>('/auth/logout', { method: 'POST' })
  },

  getSession() {
    return request<SessionResponse>('/auth/session')
  },

  forgotPassword(input: ForgotPasswordInput) {
    return request<{ status: boolean }>('/auth/forgot-password', { method: 'POST', body: input })
  },

  resetPassword(input: ResetPasswordInput) {
    return request<{ status: boolean }>('/auth/reset-password', { method: 'POST', body: input })
  },

  sendVerificationEmail(email: string) {
    return request<{ status: boolean }>('/auth/send-verification-email', {
      method: 'POST',
      body: { email },
    })
  },
}
