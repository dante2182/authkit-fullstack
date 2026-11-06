import { Loader2 } from 'lucide-react'

export function FullPageLoader() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-50"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-indigo-600" aria-hidden="true" />
      <span className="sr-only">Cargando…</span>
    </div>
  )
}
