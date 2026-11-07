import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginationProps {
  page: number
  pages: number
  total: number
  isBusy: boolean
  onPageChange: (page: number) => void
}

export function Pagination({ page, pages, total, isBusy, onPageChange }: PaginationProps) {
  const canGoBack = page > 1 && !isBusy
  const canGoForward = page < pages && !isBusy

  return (
    <nav
      aria-label="Paginación de usuarios"
      className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600"
    >
      <p aria-live="polite">
        {total} {total === 1 ? 'usuario' : 'usuarios'} · página {page} de {Math.max(pages, 1)}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={!canGoBack}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={!canGoForward}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </nav>
  )
}
