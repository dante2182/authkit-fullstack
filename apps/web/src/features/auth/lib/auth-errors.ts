import { ApiError } from '@/services/http'

// La API responde en español, pero los códigos de better-auth llegan en inglés.
// Aquí se traducen los casos que el usuario puede provocar de verdad.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Correo o contraseña incorrectos.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Ya existe una cuenta con ese correo.',
  USER_ALREADY_EXISTS: 'Ya existe una cuenta con ese correo.',
  EMAIL_NOT_VERIFIED: 'Debes verificar tu correo antes de continuar.',
  INVALID_TOKEN: 'El enlace no es válido o ha caducado.',
  TOKEN_EXPIRED: 'El enlace ha caducado. Solicita uno nuevo.',
  RATE_LIMITED: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  VALIDATION_ERROR: 'Revisa los datos del formulario.',
  UNAUTHORIZED: 'Tu sesión ha caducado. Inicia sesión de nuevo.',
  INTERNAL_ERROR: 'El servidor ha fallado. Inténtalo de nuevo en unos minutos.',
  NETWORK_ERROR: 'No se pudo conectar con el servidor. Revisa tu conexión.',
}

export function authErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return AUTH_ERROR_MESSAGES[error.code] ?? error.message
  }

  return 'Ha ocurrido un error inesperado. Inténtalo de nuevo.'
}

// Los errores de los enlaces de correo llegan por query string, no como ApiError.
export function linkErrorMessage(code: string | null): string {
  if (code === 'TOKEN_EXPIRED') return 'El enlace ha caducado. Solicita uno nuevo.'
  return 'El enlace no es válido o ya se ha usado.'
}
