import { ApiError } from '@/services/http'

// La API responde mensajes en español para las reglas de negocio (400/409) y
// para los códigos de autorización. Se muestran tal cual; solo hay fallback
// para errores que no vienen de la API (red, respuesta ilegible).
export function adminErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'No se pudo completar la operación. Inténtalo de nuevo.'
}
