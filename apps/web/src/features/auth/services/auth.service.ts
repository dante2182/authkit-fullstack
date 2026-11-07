import { request } from '@/services/http'
import type {
  AuthUser,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SessionResponse,
} from '../types'

// Los endpoints de autenticación son los nativos de better-auth montados en
// /api/auth. La cookie de sesión viaja sola: `request` ya usa credentials: include.
const callbackURL = (path: string) => `${window.location.origin}${path}`

export const authService = {
  register(input: RegisterInput) {
    return request<{ user: AuthUser }>('/auth/sign-up/email', {
      method: 'POST',
      body: { ...input, callbackURL: callbackURL('/verify-email') },
    })
  },

  login(input: LoginInput) {
    return request<{ user: AuthUser }>('/auth/sign-in/email', { method: 'POST', body: input })
  },

  logout() {
    return request<{ success: boolean }>('/auth/sign-out', { method: 'POST' })
  },

  // Sin sesión, el endpoint nativo responde 200 con null (no 401).
  getSession() {
    return request<SessionResponse | null>('/auth/get-session')
  },

  forgotPassword(input: ForgotPasswordInput) {
    return request<{ status: boolean }>('/auth/request-password-reset', {
      method: 'POST',
      body: { ...input, redirectTo: callbackURL('/reset-password') },
    })
  },

  resetPassword(input: ResetPasswordInput) {
    return request<{ status: boolean }>('/auth/reset-password', { method: 'POST', body: input })
  },

  sendVerificationEmail(email: string) {
    return request<{ status: boolean }>('/auth/send-verification-email', {
      method: 'POST',
      body: { email, callbackURL: callbackURL('/verify-email') },
    })
  },
}
