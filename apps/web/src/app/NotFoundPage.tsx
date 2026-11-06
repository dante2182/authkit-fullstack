import { ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-600">
          <ShieldCheck className="size-6 text-white" aria-hidden="true" />
        </span>

        <p className="mt-6 text-sm font-semibold text-indigo-600">404</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          Página no encontrada
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          La ruta que buscas no existe o ha cambiado de sitio.
        </p>

        <Link
          to="/"
          className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  )
}
