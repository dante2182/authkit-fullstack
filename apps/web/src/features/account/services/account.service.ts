import { request } from '@/services/http'
import type { SessionResponse } from '@/features/auth'
import type {
  AccountSession,
  ChangeEmailInput,
  ChangePasswordInput,
  ChangePasswordResponse,
  DeleteAccountInput,
  LinkedAccount,
  PublicUser,
  UpdateProfileInput,
} from '../types'

// El enlace de confirmación vuelve a la app por la ruta de verificación, igual
// que el alta: la API reescribe el callback en el GET.
const verifyCallback = () => `${window.location.origin}/verify-email`

export const accountService = {
  updateProfile(input: UpdateProfileInput) {
    return request<{ user: PublicUser }>('/users/me', { method: 'PATCH', body: input })
  },

  // Borrado definitivo: el backend exige la contraseña actual y responde 204.
  deleteAccount(input: DeleteAccountInput) {
    return request<void>('/users/me', { method: 'DELETE', body: input })
  },

  // La API responde `200 { status: true }` siempre, exista o no la dirección
  // nueva: no se puede enumerar cuentas desde aquí.
  changeEmail(input: ChangeEmailInput) {
    return request<{ status: boolean }>('/auth/change-email', {
      method: 'POST',
      body: { ...input, callbackURL: verifyCallback() },
    })
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
