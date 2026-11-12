import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, PasswordField, authErrorMessage, useAuth } from '@/features/auth'
import { accountService } from '../services/account.service'

// Borrado de la propia cuenta. La API exige la contraseña actual: la sesión
// sola no basta para una acción irreversible. No hay recuperación posible.
export function DeleteAccountSection() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  function close() {
    if (isDeleting) return
    setIsOpen(false)
    setPassword('')
    setFieldError(null)
    setFormError(null)
  }

  async function handleDelete() {
    if (password.trim() === '') {
      setFieldError('Introduce tu contraseña')
      return
    }

    setIsDeleting(true)
    setFieldError(null)
    setFormError(null)

    try {
      await accountService.deleteAccount({ password })
      // La cuenta y sus sesiones ya no existen: signOut solo limpia el estado
      // local y expira la cookie que el backend invalidó.
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      setFormError(authErrorMessage(error))
      setIsDeleting(false)
    }
  }

  if (!isOpen) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Borrar la cuenta elimina tu perfil y todas tus sesiones. No se puede deshacer.
        </p>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-700 shadow-sm transition hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none"
        >
          Borrar mi cuenta
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-medium text-red-800">
        Esta acción es definitiva. Para confirmarla, introduce tu contraseña actual.
      </p>

      {formError ? <Alert variant="error">{formError}</Alert> : null}

      <PasswordField
        label="Contraseña actual"
        name="delete-account-password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={fieldError ?? undefined}
        disabled={isDeleting}
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={close}
          disabled={isDeleting}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancelar
        </button>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isDeleting ? 'Borrando…' : 'Borrar mi cuenta'}
        </button>
      </div>
    </div>
  )
}
