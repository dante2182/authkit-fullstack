// Contrato de cuenta: perfil, contraseña y sesiones. El usuario y la forma de
// sesión se reutilizan del barril de auth para no duplicar el contrato.

import type { AuthSession, AuthUser } from '@/features/auth'

export type { AuthUser }

// La forma de sesión ya está en el contrato de auth; se reutiliza tal cual.
export type AccountSession = AuthSession

// PATCH /api/users/me devuelve la selección pública del usuario, que no incluye
// `role` (ese campo solo llega por la sesión).
export type PublicUser = Omit<AuthUser, 'role'>

export interface UpdateProfileInput {
  name: string
}

export interface ChangePasswordInput {
  currentPassword: string
  newPassword: string
  revokeOtherSessions: boolean
}

// better-auth responde con el token nuevo (o null) y el usuario, no con `status`.
export interface ChangePasswordResponse {
  token: string | null
  user: AuthUser
}
