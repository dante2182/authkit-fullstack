// Tipos del contrato de autenticación. Reflejan lo que devuelve apps/api,
// donde el token de sesión vive únicamente en la cookie httpOnly.

export type UserRole = 'USER' | 'ADMIN'

export interface AuthUser {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image: string | null
  role: UserRole
  createdAt: string
  updatedAt: string
}

export interface AuthSession {
  id: string
  userId: string
  expiresAt: string
  createdAt: string
  updatedAt: string
  ipAddress?: string | null
  userAgent?: string | null
}

export interface SessionResponse {
  session: AuthSession
  user: AuthUser
}

export interface RegisterInput {
  name: string
  email: string
  password: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface ForgotPasswordInput {
  email: string
}

export interface ResetPasswordInput {
  token: string
  newPassword: string
}
