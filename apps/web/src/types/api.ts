// Forma de error de la API. Los endpoints propios responden
// { error: { code, message, details? } }; el handler nativo de better-auth
// responde { code, message }. El cliente acepta ambas.
export interface ApiErrorBody {
  error?: {
    code: string
    message: string
    details?: unknown
  }
  code?: string
  message?: string
}
