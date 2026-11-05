// Forma uniforme de error que devuelve la API: { error: { code, message, details? } }.
export interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
