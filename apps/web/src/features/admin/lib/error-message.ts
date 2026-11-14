import { ApiError } from '@/services/http'

// La API responde mensajes en español para reglas de negocio y autorización; se muestran
// tal cual y solo hay fallback para errores que no vienen de la API (red).
export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'No se pudo completar la operación. Inténtalo de nuevo.'
}
