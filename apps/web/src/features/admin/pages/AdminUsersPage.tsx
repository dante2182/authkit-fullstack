import { ArrowLeft, ShieldCheck, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, useAuth } from '@/features/auth'
import { AdminUsersTable } from '../components/AdminUsersTable'
import { ConfirmRoleChangeDialog } from '../components/ConfirmRoleChangeDialog'
import { Pagination } from '../components/Pagination'
import { adminErrorMessage } from '../lib/error-message'
import { ROLE_LABELS } from '../lib/role-labels'
import { adminService } from '../services/admin.service'
import type { AdminPagination, AdminUser, UserRole } from '../types'

const PAGE_SIZE = 20

interface PendingChange {
  user: AdminUser
  nextRole: UserRole
}

export function AdminUsersPage() {
  const { user } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [pagination, setPagination] = useState<AdminPagination | null>(null)
  const [page, setPage] = useState(1)
  const [reloadKey, setReloadKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null)
  const [isChanging, setIsChanging] = useState(false)
  const [changeError, setChangeError] = useState<string | null>(null)

  // Mismo patrón que AuthProvider: sin setState síncrono dentro del efecto
  // (react-hooks/set-state-in-effect). El estado de carga se activa en los
  // manejadores que cambian de página, no aquí.
  useEffect(() => {
    let active = true

    adminService
      .listUsers({ page, limit: PAGE_SIZE })
      .then((result) => {
        if (!active) return
        setUsers(result.users)
        setPagination(result.pagination)
        setError(null)
      })
      .catch((fetchError: unknown) => {
        if (!active) return
        setError(adminErrorMessage(fetchError))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [page, reloadKey])

  if (!user) return null

  function handlePageChange(nextPage: number) {
    if (nextPage === page || isLoading) return
    setIsLoading(true)
    setSuccess(null)
    setError(null)
    setPage(nextPage)
  }

  // Si el fetch falla (por ejemplo, al cambiar de página), la paginación no
  // puede reintentar la misma página porque el estado ya avanzó. Este botón
  // fuerza una nueva petición sin mover la página solicitada.
  function retry() {
    if (isLoading) return
    setIsLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }

  function requestRoleChange(target: AdminUser, nextRole: UserRole) {
    setChangeError(null)
    setPendingChange({ user: target, nextRole })
  }

  async function confirmRoleChange() {
    if (!pendingChange) return

    setIsChanging(true)
    setChangeError(null)

    try {
      const { user: updated } = await adminService.changeRole(
        pendingChange.user.id,
        pendingChange.nextRole,
      )

      setUsers((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setSuccess(`Rol de ${updated.name} actualizado a ${ROLE_LABELS[updated.role]}.`)
      setPendingChange(null)
    } catch (changeFailure: unknown) {
      setChangeError(adminErrorMessage(changeFailure))
    } finally {
      setIsChanging(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Volver al dashboard
          </Link>

          <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
            <ShieldCheck className="size-4 text-indigo-600" aria-hidden="true" />
            Administración
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-4 py-8 sm:px-6">
        <section>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Usuarios</h1>
          <p className="mt-1 text-sm text-slate-500">
            Administra los roles de las cuentas registradas. Los cambios se aplican de inmediato.
          </p>
        </section>

        {success ? <Alert variant="success">{success}</Alert> : null}

        {error ? (
          <div className="space-y-2">
            <Alert variant="error">{error}</Alert>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={retry}
                disabled={isLoading}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reintentar
              </button>
            </div>
          </div>
        ) : null}

        {isLoading ? (
          <p
            role="status"
            className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500"
          >
            Cargando usuarios…
          </p>
        ) : users.length === 0 ? (
          error ? null : (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-12 text-center">
              <Users className="mx-auto size-6 text-slate-400" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium text-slate-900">No hay usuarios registrados</p>
              <p className="mt-1 text-xs text-slate-500">
                Las cuentas aparecerán aquí en cuanto se registren.
              </p>
            </div>
          )
        ) : (
          <>
            <AdminUsersTable
              users={users}
              currentUserId={user.id}
              isBusy={isChanging}
              onRoleChange={requestRoleChange}
            />

            {pagination ? (
              <Pagination
                page={page}
                pages={pagination.pages}
                total={pagination.total}
                isBusy={isLoading || isChanging}
                onPageChange={handlePageChange}
              />
            ) : null}
          </>
        )}
      </main>

      {pendingChange ? (
        <ConfirmRoleChangeDialog
          user={pendingChange.user}
          nextRole={pendingChange.nextRole}
          isPending={isChanging}
          error={changeError}
          onConfirm={confirmRoleChange}
          onCancel={() => {
            if (isChanging) return
            setPendingChange(null)
            setChangeError(null)
          }}
        />
      ) : null}
    </div>
  )
}
