import { ApiError } from '@/services/http'

// La API responde en español, pero los códigos de better-auth llegan en inglés.
// Aquí se traducen los casos que el usuario puede provocar de verdad.
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'Correo o contraseña incorrectos.',
  INVALID_PASSWORD: 'La contraseña actual no es correcta.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Ya existe una cuenta con ese correo.',
  USER_ALREADY_EXISTS: 'Ya existe una cuenta con ese correo.',
  EMAIL_NOT_VERIFIED: 'Debes verificar tu correo antes de continuar.',
  EMAIL_PASSWORD_DISABLED: 'El acceso con correo y contraseña está desactivado.',
  EMAIL_PASSWORD_SIGN_UP_DISABLED: 'El registro está cerrado. Inicia sesión si ya tienes cuenta.',
  PROVIDER_NOT_FOUND: 'Ese proveedor no está disponible en este despliegue.',
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

// El callback OAuth de better-auth redirige con `?error=<código>`. Son códigos
// distintos de los de la API: aquí se traducen los que el usuario puede ver.
const OAUTH_ERROR_MESSAGES: Record<string, string> = {
  account_not_linked:
    'Ya existe una cuenta con ese correo. Inicia sesión con tu contraseña y vuelve a intentarlo.',
  email_not_verified: 'El proveedor no ha verificado tu correo.',
  email_not_found: 'El proveedor no compartió un correo. Usa otro método de acceso.',
  email_does_not_match: 'El correo del proveedor no coincide con el de tu cuenta.',
  account_already_linked_to_different_user: 'Ese proveedor ya está vinculado a otra cuenta.',
  unable_to_link_account: 'No pudimos vincular el proveedor. Inténtalo de nuevo.',
  oauth_provider_not_found: 'Ese proveedor no está disponible en este despliegue.',
  invalid_code: 'La autorización caducó. Vuelve a intentarlo.',
  invalid_callback_request: 'La respuesta del proveedor no es válida. Vuelve a intentarlo.',
  unable_to_get_user_info: 'El proveedor no devolvió los datos de tu cuenta.',
  state_mismatch: 'La sesión de autorización caducó. Vuelve a intentarlo.',
  no_code: 'El proveedor no completó la autorización. Vuelve a intentarlo.',
}

export function oauthErrorMessage(code: string): string {
  return (
    OAUTH_ERROR_MESSAGES[code] ??
    'No pudimos completar el acceso con el proveedor. Inténtalo de nuevo.'
  )
}
