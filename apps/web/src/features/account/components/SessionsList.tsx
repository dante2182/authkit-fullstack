import { Laptop, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Alert, authErrorMessage } from '@/features/auth'
import { describeUserAgent, formatSessionDate } from '../lib/session-labels'
import { accountService } from '../services/account.service'
import type { AccountSession } from '../types'

function sortSessions(sessions: AccountSession[], currentToken: string | null): AccountSession[] {
  return [...sessions].sort((a, b) => {
    if (a.token === currentToken) return -1
    if (b.token === currentToken) return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })
}

export function SessionsList() {
  const [sessions, setSessions] = useState<AccountSession[]>([])
  const [currentToken, setCurrentToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [revokingToken, setRevokingToken] = useState<string | null>(null)
  const [isRevokingOthers, setIsRevokingOthers] = useState(false)
  const [confirmingToken, setConfirmingToken] = useState<string | null>(null)
  const [confirmingOthers, setConfirmingOthers] = useState(false)

  useEffect(() => {
    let active = true

    Promise.all([accountService.listSessions(), accountService.getSession()])
      .then(([list, session]) => {
        if (!active) return
        const token = session?.session.token ?? null
        setCurrentToken(token)
        setSessions(sortSessions(list, token))
        setError(null)
      })
      .catch((fetchError: unknown) => {
        if (!active) return
        setError(authErrorMessage(fetchError))
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })

    return () => {
      active = false
    }
  }, [reloadKey])

  const isBusy = revokingToken !== null || isRevokingOthers

  function retry() {
    if (isLoading) return
    setIsLoading(true)
    setError(null)
    setReloadKey((key) => key + 1)
  }

  async function revoke(token: string) {
    setConfirmingToken(null)
    setRevokingToken(token)
    setError(null)
    setSuccess(null)

    try {
      await accountService.revokeSession(token)
      // better-auth responde 200 aunque el token no fuera del usuario, así que
      // se confirma con el servidor en vez de confiar solo en el filtro local.
      setSessions((current) => current.filter((session) => session.token !== token))
      setReloadKey((key) => key + 1)
      setSuccess('Sesión revocada.')
    } catch (revokeError) {
      setError(authErrorMessage(revokeError))
    } finally {
      setRevokingToken(null)
    }
  }

  async function revokeOthers() {
    setConfirmingOthers(false)
    setIsRevokingOthers(true)
    setError(null)
    setSuccess(null)

    try {
      await accountService.revokeOtherSessions()
      setSessions((current) => current.filter((session) => session.token === currentToken))
      setReloadKey((key) => key + 1)
      setSuccess('Se cerraron las demás sesiones.')
    } catch (revokeError) {
      setError(authErrorMessage(revokeError))
    } finally {
      setIsRevokingOthers(false)
    }
  }

  return (
    <div className="space-y-4">
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

      {success ? <Alert variant="success">{success}</Alert> : null}

      {isLoading ? (
        <p role="status" className="text-sm text-slate-500">
          Cargando sesiones…
        </p>
      ) : sessions.length === 0 ? (
        error ? null : (
          <p className="text-sm text-slate-500">No hay sesiones activas.</p>
        )
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {sessions.map((session) => {
            const isCurrent = session.token === currentToken
            const isConfirming = confirmingToken === session.token

            return (
              <li key={session.id} className="flex flex-wrap items-start gap-3 p-3">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Laptop className="size-4 text-slate-600" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-900">
                    {describeUserAgent(session.userAgent)}
                    {isCurrent ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 ring-inset">
                        <ShieldCheck className="size-3" aria-hidden="true" />
                        Esta sesión
                      </span>
                    ) : null}
                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">
                    {session.ipAddress ?? 'IP desconocida'} · Creada el{' '}
                    {formatSessionDate(session.createdAt)} · Caduca el{' '}
                    {formatSessionDate(session.expiresAt)}
                  </p>
                </div>

                {isCurrent ? null : isConfirming ? (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => revoke(session.token)}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none"
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingToken(null)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
                    >
                      Cancelar
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingToken(session.token)}
                    disabled={isBusy}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {revokingToken === session.token ? 'Revocando…' : 'Revocar'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {!isLoading && sessions.length > 1 ? (
        confirmingOthers ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-sm text-slate-600">¿Cerrar todas las demás sesiones?</span>
            <button
              type="button"
              onClick={revokeOthers}
              disabled={isBusy}
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRevokingOthers ? 'Cerrando…' : 'Confirmar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingOthers(false)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setConfirmingOthers(true)}
              disabled={isBusy}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cerrar las demás sesiones
            </button>
          </div>
        )
      ) : null}
    </div>
  )
}
