import { Loader2 } from 'lucide-react'
import { Alert } from './Alert'

// Mientras el contrato de la API no llega no se pinta ningún método: evita
// mostrar el formulario y quitarlo (o al contrario) un instante después.
export function AuthMethodsLoading() {
  return (
    <div className="flex justify-center py-6" role="status" aria-live="polite">
      <Loader2 className="size-5 animate-spin text-indigo-600" aria-hidden="true" />
      <span className="sr-only">Cargando métodos de acceso…</span>
    </div>
  )
}

interface AuthMethodsErrorProps {
  message: string
  onRetry: () => void
}

// Falla cerrado y visible: sin contrato no se inventan métodos de acceso.
export function AuthMethodsError({ message, onRetry }: AuthMethodsErrorProps) {
  return (
    <div className="space-y-3">
      <Alert variant="error">{message}</Alert>
      <button
        type="button"
        onClick={onRetry}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
      >
        Reintentar
      </button>
    </div>
  )
}
