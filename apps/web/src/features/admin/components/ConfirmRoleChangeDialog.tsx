import { useEffect } from 'react'
import { Alert } from '@/features/auth'
import { ROLE_LABELS } from '../lib/role-labels'
import type { AdminUser, UserRole } from '../types'

interface ConfirmRoleChangeDialogProps {
  user: AdminUser
  nextRole: UserRole
  isPending: boolean
  error: string | null
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmRoleChangeDialog({
  user,
  nextRole,
  isPending,
  error,
  onConfirm,
  onCancel,
}: ConfirmRoleChangeDialogProps) {
  // Escape cierra el diálogo salvo mientras la petición está en vuelo.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isPending) onCancel()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPending, onCancel])

  const losesAdmin = user.role === 'ADMIN' && nextRole !== 'ADMIN'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-role-title"
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl"
      >
        <h2 id="confirm-role-title" className="text-lg font-semibold text-slate-900">
          Cambiar rol
        </h2>

        <p className="mt-2 text-sm text-slate-600">
          ¿Cambiar el rol de <strong>{user.name}</strong> de {ROLE_LABELS[user.role]} a{' '}
          {ROLE_LABELS[nextRole]}?
        </p>

        <p className="mt-2 text-sm text-slate-500">
          {losesAdmin
            ? 'Perderá el acceso al panel de administración y se revocarán todas sus sesiones de inmediato.'
            : 'Tendrá acceso al panel de administración en su siguiente petición.'}
        </p>

        {error ? (
          <div className="mt-4">
            <Alert variant="error">{error}</Alert>
          </div>
        ) : null}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            aria-busy={isPending}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Guardando…' : 'Confirmar cambio'}
          </button>
        </div>
      </div>
    </div>
  )
}
