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
  // Token opaco de better-auth: solo se usa para comparar sesiones en la UI.
  token: string
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

// Métodos de acceso que publica `GET /api/config/auth`. El frontend dibuja la
// pantalla a partir de esto: nunca deduce el modo desde su propio entorno.
export interface AuthCapabilities {
  emailPassword: {
    enabled: boolean
    signUpEnabled: boolean
  }
  // Ids tal cual los devuelve la API (hoy: google, github).
  socialProviders: string[]
}

export interface SocialSignInInput {
  provider: string
  callbackURL: string
  // A dónde vuelve better-auth si el callback falla (p. ej. cuenta sin vincular).
  errorCallbackURL: string
}

export interface SocialSignInResponse {
  // URL de autorización del proveedor a la que hay que navegar.
  url: string
  redirect: boolean
}
