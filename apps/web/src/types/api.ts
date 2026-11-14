// Forma de error de la API: los endpoints propios responden { error: { code, message,
// details? } }; el handler nativo, { code, message }. El cliente acepta ambas.
export interface ApiErrorBody {
  error?: {
    code: string
    message: string
    details?: unknown
  }
  code?: string
  message?: string
}
