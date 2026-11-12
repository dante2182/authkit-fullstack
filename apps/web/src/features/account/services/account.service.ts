import { request } from '@/services/http'
import type { SessionResponse } from '@/features/auth'
import type {
  AccountSession,
  ChangePasswordInput,
  ChangePasswordResponse,
  LinkedAccount,
  PublicUser,
  UpdateProfileInput,
} from '../types'

export const accountService = {
  updateProfile(input: UpdateProfileInput) {
    return request<{ user: PublicUser }>('/users/me', { method: 'PATCH', body: input })
  },

  changePassword(input: ChangePasswordInput) {
    return request<ChangePasswordResponse>('/auth/change-password', {
      method: 'POST',
      body: input,
    })
  },

  listSessions() {
    return request<AccountSession[]>('/auth/list-sessions')
  },

  // Cuentas vinculadas al usuario. Un usuario solo-OAuth no tiene la cuenta
  // `credential`, así que no puede cambiar ni confirmar contraseñas.
  listAccounts() {
    return request<LinkedAccount[]>('/auth/list-accounts')
  },

  // Sin sesión, better-auth responde 200 con null.
  getSession() {
    return request<SessionResponse | null>('/auth/get-session')
  },

  revokeSession(token: string) {
    return request<{ status: boolean }>('/auth/revoke-session', {
      method: 'POST',
      body: { token },
    })
  },

  revokeOtherSessions() {
    return request<{ status: boolean }>('/auth/revoke-other-sessions', { method: 'POST' })
  },
}
