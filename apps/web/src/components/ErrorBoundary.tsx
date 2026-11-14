import { TriangleAlert } from 'lucide-react'
import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

// Última red de seguridad de la UI: un error de render no deja la pantalla en blanco.
// No captura errores async (`unhandledrejection`); esos los maneja cada pantalla.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error de render no controlado', error, info.componentStack)
  }

  render(): ReactNode {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-red-600">
            <TriangleAlert className="size-6 text-white" aria-hidden="true" />
          </span>

          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900">
            Algo ha fallado
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            La aplicación no ha podido dibujar esta pantalla. Recarga para volver a intentarlo.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }
}
